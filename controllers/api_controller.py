from odoo import http
from odoo.http import request
import json
from datetime import date
import os
from openai import OpenAI  # Hugging Face compatible via OpenAI API
from .config_secret import HUGGINGFACE_API_KEY

# --- Token Hugging Face via variable d'environnement ---
HF_TOKEN = os.environ.get("HF_TOKEN", HUGGINGFACE_API_KEY)

# Initialise le client Hugging Face
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)

# --- Fonction utilitaire pour réponse JSON ---
def _json_response(success=True, message="", data=None, status=200):
    response = {
        "success": success,
        "message": message,
        "data": data or {},
    }
    return request.make_response(
        json.dumps(response),
        headers=[("Content-Type", "application/json")],
        status=status,
    )

# --- Controller principal ---
class OcrApiController(http.Controller):

    # Ping pour tester l'API
    @http.route("/api/ping", type="json", auth="public", methods=["GET"], csrf=False)
    def ping(self):
        return {"success": True, "message": "API OK"}


    @http.route("/api/ocr/ai_extract", type="http", auth="public", methods=["POST"], csrf=False)
    def ai_extract(self, **kwargs):
        try:
            # Lire le corps brut de la requête
            text = request.httprequest.data.decode("utf-8").strip()
            if not text:
                return self._json_response(False, "Aucun texte fourni", status=400)

            # Prompt pour forcer le modèle à renvoyer du JSON
            prompt = f"""
            Analyse ce texte de facture et retourne strictement en JSON avec les champs suivants :
            - Fournisseur
            - Client
            - Numéro de la facture
            - Date de la facture
            - Date d'échéance
            - Total hors taxes
            - TVA
            - Exonéré de TVA
            - Total TTC
            - Référence
            Ne rien ajouter d'autre. Texte : \"\"\"{text}\"\"\" 
            """

            # Appel Hugging Face ou un modèle d'IA similaire
            completion = client.chat.completions.create(
                model="moonshotai/Kimi-K2-Instruct-0905",  # Assurez-vous que le modèle est correct
                messages=[{"role": "user", "content": prompt}],
            )

            choice = completion.choices[0]

            # Accéder correctement au texte
            result_text = choice.message.content if hasattr(choice, "message") and choice.message else getattr(choice, "text", "")

            # Essayer de parser en JSON mais fallback si impossible
            try:
                invoice_data = json.loads(result_text)
            except json.JSONDecodeError:
                invoice_data = {"raw_text": result_text}

            return self._json_response(True, "Extraction réussie", data=invoice_data)

        except Exception as e:
            return self._json_response(False, f"Erreur AI: {str(e)}", status=500)

    def _json_response(self, success, message, data=None, status=200):
        response = {
            "success": success,
            "message": message,
            "data": data or {}
        }
        return request.make_response(
            json.dumps(response),
            headers={'Content-Type': 'application/json'},
            status=status
        )

    # --- Création facture ---
    @http.route("/api/invoice/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_invoice(self, **kwargs):
        data = request.httprequest.get_json()
        try:
            # Extraction des données de la requête (Les données retournées par l'API OCR)
            supplier = data.get("Fournisseur")
            client = data.get("Client")
            invoice_number = data.get("Numéro de la facture")
            invoice_date = data.get("Date de la facture") or str(date.today())  # Format de la date par défaut
            due_date = data.get("Date d'échéance")
            total_without_tax = data.get("Total hors taxes")
            tva = data.get("TVA")
            exempted_tva = data.get("Exonéré de TVA")
            total_ttc = data.get("Total TTC")
            reference = data.get("Référence")

            # Validation des données extraites
            if not supplier or not client or not invoice_number:
                return self._json_response(False, "Fournisseur, Client et Numéro de la facture sont requis", status=400)

            # Recherche du partenaire fournisseur et client dans Odoo
            partner_supplier = request.env["res.partner"].sudo().search([("name", "ilike", supplier)], limit=1)
            partner_client = request.env["res.partner"].sudo().search([("name", "ilike", client)], limit=1)

            if not partner_supplier:
                return self._json_response(False, f"Fournisseur '{supplier}' non trouvé", status=400)

            if not partner_client:
                return self._json_response(False, f"Client '{client}' non trouvé", status=400)

            # Création de la facture
            move_vals = {
                "move_type": "out_invoice",  # Facture sortante
                "partner_id": partner_client.id,
                "invoice_date": invoice_date,
                "invoice_user_id": request.env.user.id,  # Utilisateur qui crée la facture
                "ref": reference,
                "invoice_line_ids": [(0, 0, {
                    "name": f"Facture {invoice_number}",
                    "quantity": 1,
                    "price_unit": float(total_without_tax),
                    "account_id": request.env["account.account"].search([("name", "=", "Sales")], limit=1).id,
                    # Compte de vente générique
                })],
            }

            # Si une TVA est mentionnée
            if tva:
                tax = request.env["account.tax"].sudo().search([("amount", "=", float(tva))], limit=1)
                if tax:
                    move_vals["invoice_line_ids"][0][2]["tax_ids"] = [(6, 0, [tax.id])]

            # Création de l'enregistrement de facture dans Odoo
            move = request.env["account.move"].sudo().create(move_vals)

            # Retour avec les informations de la facture créée
            return self._json_response(True, "Facture créée avec succès", data={"id": move.id, "name": move.name},
                                       status=201)

        except Exception as e:
            return self._json_response(False, f"Erreur lors de la création de la facture : {str(e)}", status=500)
    # --- Création Sales Order ---
    @http.route("/api/so/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_sale_order(self, **kwargs):
        data = request.httprequest.get_json()
        try:
            partner_id = data.get("partner_id")
            date_order = data.get("date_order") or str(date.today())
            lines = data.get("lines", [])

            if not partner_id:
                return _json_response(False, "partner_id requis", status=400)
            if not lines:
                return _json_response(False, "Au moins une ligne SO est requise", status=400)

            order_lines = []
            for line in lines:
                vals = {
                    "name": line.get("name", "Ligne"),
                    "product_id": line["product_id"],
                    "product_uom_qty": line.get("quantity", 1),
                    "price_unit": line.get("price_unit", 0.0),
                }
                order_lines.append((0, 0, vals))

            order_vals = {
                "partner_id": partner_id,
                "date_order": date_order,
                "order_line": order_lines,
            }

            order = request.env["sale.order"].sudo().create(order_vals)
            return _json_response(True, "Sales Order créée", data={"id": order.id, "name": order.name}, status=201)

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

    # --- Création Purchase Order ---
    @http.route("/api/po/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_purchase_order(self, **kwargs):
        data = request.httprequest.get_json()
        try:
            partner_id = data.get("partner_id")
            date_order = data.get("date_order") or str(date.today())
            lines = data.get("lines", [])

            if not partner_id:
                return _json_response(False, "partner_id requis", status=400)
            if not lines:
                return _json_response(False, "Au moins une ligne PO est requise", status=400)

            order_lines = []
            for line in lines:
                vals = {
                    "name": line.get("name", "Ligne"),
                    "product_id": line["product_id"],
                    "product_qty": line.get("quantity", 1),
                    "price_unit": line.get("price_unit", 0.0),
                }
                order_lines.append((0, 0, vals))

            order_vals = {
                "partner_id": partner_id,
                "date_order": date_order,
                "order_line": order_lines,
            }

            order = request.env["purchase.order"].sudo().create(order_vals)
            return _json_response(True, "Purchase Order créée", data={"id": order.id, "name": order.name}, status=201)

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

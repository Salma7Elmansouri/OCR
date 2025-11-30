from odoo import http
from odoo.http import request
import json
from datetime import date, datetime
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
def clean_number(value):
    if not value:
        return 0.0
    # Convertir en string
    value = str(value)

    # Retirer tout sauf chiffres, virgules, points
    value = ''.join(c for c in value if c.isdigit() or c in [',', '.'])

    # Si format européen (ex : "1.234,56")
    if value.count(',') == 1 and value.count('.') > 1:
        value = value.replace('.', '').replace(',', '.')

    # Si format "200,50"
    elif value.count(',') == 1 and value.count('.') == 0:
        value = value.replace(',', '.')

    try:
        return float(value)
    except:
        return 0.0

def parse_date(value):
    if not value:
        return None

    value = value.strip().replace('.', '/').replace('-', '/')

    # Liste de formats possibles
    formats = [
        "%Y/%m/%d",  # 2025/11/28
        "%d/%m/%Y",  # 28/11/2025
        "%m/%d/%Y",  # 11/28/2025 (TON FORMAT ACTUEL)
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except:
            continue

    # Si rien ne marche : renvoyer une date par défaut
    return str(date.today())
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
    @http.route("/api/invoice/create", type="http", auth="public", methods=["POST"], csrf=False)
    def create_invoice(self, **kwargs):
        try:
            # Lire le JSON brut envoyé par le frontend
            raw_data = request.httprequest.data.decode("utf-8")
            data = json.loads(raw_data)

            # Récupération des champs
            supplier = data.get("supplier")
            client = data.get("client")
            invoice_number = data.get("invoice_number")
            invoice_date = parse_date(data.get("invoice_date"))
            due_date = parse_date(data.get("due_date"))
            total_without_tax = clean_number(data.get("total_without_tax"))
            tva = clean_number(data.get("tva"))
            total_ttc = clean_number(data.get("total_ttc"))
            reference = data.get("reference")

            # Vérification minimale
            if not client or not invoice_number:
                return self._json_response(False, "Client et numéro de facture requis", status=400)

            # Recherche partenaire client
            partner_client = request.env["res.partner"].sudo().search(
                [("name", "ilike", client)], limit=1
            )
            if not partner_client:
                return self._json_response(False, f"Client '{client}' non trouvé", status=400)

            # Recherche partenaire fournisseur (OPTIONNEL)
            partner_supplier = None
            if supplier:
                partner_supplier = request.env["res.partner"].sudo().search(
                    [("name", "ilike", supplier)], limit=1
                )

            # Création de la facture
            move_vals = {
                "move_type": "out_invoice",
                "partner_id": partner_client.id,
                "invoice_date": invoice_date,
                "ref": reference,
                "invoice_line_ids": [
                    (0, 0, {
                        "name": f"Facture {invoice_number}",
                        "quantity": 1,
                        "price_unit": total_without_tax,
                    })
                ],
            }

            # Ajout TVA
            if tva > 0:
                tax = request.env["account.tax"].sudo().search(
                    [("amount", "=", tva)], limit=1
                )
                if tax:
                    move_vals["invoice_line_ids"][0][2]["tax_ids"] = [(6, 0, [tax.id])]

            # Création dans Odoo
            move = request.env["account.move"].sudo().create(move_vals)

            return self._json_response(
                True,
                "Facture créée avec succès",
                data={"id": move.id, "name": move.name},
                status=201,
            )

        except Exception as e:
            return self._json_response(
                False,
                f"Erreur lors de la création de la facture : {str(e)}",
                status=500,
            )

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

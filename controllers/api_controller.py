from odoo import http
from odoo.http import request
import json
from datetime import date
import os
from openai import OpenAI  # Hugging Face compatible via OpenAI API

# --- Token Hugging Face via variable d'environnement ---
HF_TOKEN = os.environ.get("HF_TOKEN", "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")  # Ton token ici si variable pas définie

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
                return _json_response(False, "Aucun texte fourni", status=400)

            # Prompt pour forcer le modèle à renvoyer du JSON
            prompt = f"""
            Analyse ce texte de facture et retourne strictement en JSON avec les champs :
            date, total, numero_facture, fournisseur, lignes [{{name, quantity, unit_price}}].
            Ne rien ajouter d'autre. Texte : \"\"\"{text}\"\"\"
            """

            # Appel Hugging Face
            completion = client.chat.completions.create(
                model="moonshotai/Kimi-K2-Instruct-0905",
                messages=[{"role": "user", "content": prompt}],
            )

            choice = completion.choices[0]

            # Accéder correctement au texte
            if hasattr(choice, "message") and choice.message is not None:
                result_text = choice.message.content  # <- ici on prend content directement
            else:
                result_text = getattr(choice, "text", "")

            # Essayer de parser en JSON mais fallback si impossible
            try:
                invoice_data = json.loads(result_text)
            except json.JSONDecodeError:
                invoice_data = {"raw_text": result_text}

            return _json_response(True, "Extraction réussie", data=invoice_data)

        except Exception as e:
            return _json_response(False, f"Erreur AI: {str(e)}", status=500)

    # --- Création facture ---
    @http.route("/api/invoice/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_invoice(self, **kwargs):
        data = request.httprequest.get_json()
        try:
            partner_id = data.get("partner_id")
            move_type = data.get("move_type", "out_invoice")
            invoice_date = data.get("invoice_date") or str(date.today())
            lines = data.get("lines", [])

            if not partner_id:
                return _json_response(False, "partner_id requis", status=400)
            if not lines:
                return _json_response(False, "Au moins une ligne de facture est requise", status=400)

            invoice_lines = []
            for line in lines:
                vals = {
                    "name": line.get("name", "Ligne"),
                    "quantity": line.get("quantity", 1),
                    "price_unit": line.get("price_unit", 0.0),
                }
                if line.get("account_id"):
                    vals["account_id"] = line["account_id"]
                tax_ids = line.get("tax_ids")
                if tax_ids:
                    vals["tax_ids"] = [(6, 0, tax_ids)]
                invoice_lines.append((0, 0, vals))

            move_vals = {
                "move_type": move_type,
                "partner_id": partner_id,
                "invoice_date": invoice_date,
                "invoice_line_ids": invoice_lines,
            }

            move = request.env["account.move"].sudo().create(move_vals)
            return _json_response(True, "Facture créée", data={"id": move.id, "name": move.name}, status=201)

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

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

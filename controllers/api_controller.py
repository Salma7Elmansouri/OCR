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
    """Nettoie une chaîne de type '1 200,50 DH' -> float."""
    if not value:
        return 0.0
    value = str(value)

    # Retirer tout sauf chiffres, virgules, points et signe -
    value = ''.join(c for c in value if c.isdigit() or c in [',', '.', '-'])

    if not value:
        return 0.0

    # Si format européen avec virgule décimale
    if value.count(',') == 1 and value.count('.') == 0:
        value = value.replace(',', '.')

    # Si format "1.234,56"
    if value.count(',') == 1 and value.count('.') > 0:
        value = value.replace('.', '').replace(',', '.')

    try:
        return float(value)
    except Exception:
        return 0.0


def parse_date(value):
    """Accepte 11/28/2025, 28/11/2025, 2025-11-28, 28-11-2025, etc., et renvoie YYYY-MM-DD."""
    if not value:
        return str(date.today())

    value = str(value).strip().replace('.', '/').replace('-', '/')

    formats = [
        "%Y/%m/%d",  # 2025/11/28
        "%d/%m/%Y",  # 28/11/2025
        "%m/%d/%Y",  # 11/28/2025
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue

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
            raw_body = request.httprequest.data.decode("utf-8").strip()

            # Essayer de lire un JSON {"text": "..."}
            text = ""
            try:
                payload = json.loads(raw_body)
                text = payload.get("text", "").strip()
            except ValueError:
                text = raw_body

            if not text:
                return self._json_response(False, "Aucun texte fourni", status=400)

            # Prompt: structure de facture complète
            prompt = f"""
Tu es un extracteur de données de factures. À partir du texte brut suivant, produis STRICTEMENT un JSON valide respectant exactement cette structure (clés et types) :

{{
  "invoice_number": "",
  "invoice_date": "",
  "due_date": "",
  "supplier": {{
    "name": "",
    "street": "",
    "city": "",
    "country": ""
  }},
  "client": {{
    "name": "",
    "street": "",
    "city": "",
    "country": ""
  }},
  "lines": [
    {{
      "name": "",
      "description": "",
      "quantity": "",
      "unit_price": "",
      "tax_rate": ""
    }}
  ],
  "totals": {{
    "untaxed": "",
    "tva": "",
    "total": ""
  }},
  "payment_terms": "",
  "reference": ""
}}

Règles :
- Si une information est introuvable, laisse une chaîne vide "".
- Les montants et quantités restent sous forme de chaînes (ex: "100", "100.50", "100 DH").
- Ne renvoie QUE le JSON, sans texte avant ou après.

Texte de la facture :
\"\"\"{text}\"\"\"
"""

            completion = client.chat.completions.create(
                model="moonshotai/Kimi-K2-Instruct-0905",
                messages=[{"role": "user", "content": prompt}],
            )

            choice = completion.choices[0]
            result_text = getattr(choice, "message", None).content if getattr(choice, "message", None) else getattr(choice, "text", "")

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

            # Meta
            supplier_name = data.get("supplier")
            client_name = data.get("client")
            invoice_number = data.get("invoice_number")
            invoice_date = parse_date(data.get("invoice_date"))
            due_date = parse_date(data.get("due_date")) if data.get("due_date") else None
            reference = data.get("reference")
            payment_terms = data.get("payment_terms")

            # Lignes
            lines = data.get("lines") or []

            # Totaux (optionnels)
            totals = data.get("totals") or {}
            total_without_tax = clean_number(
                totals.get("untaxed") or data.get("total_without_tax")
            )
            tva_total = clean_number(totals.get("tva") or data.get("tva"))
            total_ttc = clean_number(totals.get("total") or data.get("total_ttc"))

            # Vérification minimale
            if not client_name or not invoice_number:
                return self._json_response(False, "Client et numéro de facture requis", status=400)

            # Recherche partenaire client
            partner_client = request.env["res.partner"].sudo().search(
                [("name", "ilike", client_name)], limit=1
            )
            if not partner_client:
                return self._json_response(False, f"Client '{client_name}' non trouvé", status=400)

            # Recherche partenaire fournisseur (optionnel)
            partner_supplier = None
            if supplier_name:
                partner_supplier = request.env["res.partner"].sudo().search(
                    [("name", "ilike", supplier_name)], limit=1
                )

            invoice_line_ids = []

            # Si on a des lignes détaillées : on les utilise
            if lines:
                for line in lines:
                    name = line.get("name") or line.get("description") or f"Facture {invoice_number}"
                    qty = clean_number(line.get("quantity") or 1)
                    unit_price = clean_number(line.get("unit_price") or line.get("unitPrice") or 0)
                    tax_rate = clean_number(line.get("tax_rate") or line.get("taxRate") or 0)

                    line_vals = {
                        "name": name,
                        "quantity": qty if qty > 0 else 1.0,
                        "price_unit": unit_price,
                    }

                    if tax_rate > 0:
                        tax = request.env["account.tax"].sudo().search(
                            [("amount", "=", tax_rate)], limit=1
                        )
                        if tax:
                            line_vals["tax_ids"] = [(6, 0, [tax.id])]

                    invoice_line_ids.append((0, 0, line_vals))

            # Sinon : fallback sur une seule ligne avec total hors taxe
            if not invoice_line_ids:
                line_vals = {
                    "name": f"Facture {invoice_number}",
                    "quantity": 1,
                    "price_unit": total_without_tax,
                }
                invoice_line_ids.append((0, 0, line_vals))

            move_vals = {
                "name": invoice_number,
                "move_type": "out_invoice",
                "partner_id": partner_client.id,
                "invoice_date": invoice_date,
                "ref": reference,
                "invoice_line_ids": invoice_line_ids,
            }

            if due_date:
                move_vals["invoice_date_due"] = due_date

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

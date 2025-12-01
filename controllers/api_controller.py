from odoo import http
from odoo.http import request
import json
from datetime import date, datetime
import os
from openai import OpenAI
from .config_secret import HUGGINGFACE_API_KEY
import logging

# Créez un logger pour ce fichier/module
_logger = logging.getLogger(__name__)

# HuggingFace token
HF_TOKEN = os.environ.get("HF_TOKEN", HUGGINGFACE_API_KEY)

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)

# ============================================================
#                     JSON RESPONSE
# ============================================================
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

# ============================================================
#                   CLEANERS
# ============================================================
def clean_number(value):
    if not value:
        return 0.0
    value = str(value)
    value = ''.join(c for c in value if c.isdigit() or c in [',', '.', '-'])
    if not value:
        return 0.0
    if value.count(',') == 1 and '.' not in value:
        value = value.replace(",", ".")
    if value.count(',') == 1 and value.count('.') > 0:
        value = value.replace('.', '').replace(',', '.')
    try:
        return float(value)
    except:
        return 0.0

def parse_date(value):
    if not value:
        return str(date.today())
    value = str(value).strip().replace('.', '/').replace('-', '/')
    formats = ["%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).strftime("%Y-%m-%d")
        except:
            continue
    return str(date.today())

# ============================================================
#                FULL CONTROLLER CLASS
# ============================================================
class OcrApiController(http.Controller):

    @http.route("/api/ping", type="json", auth="public", methods=["GET"], csrf=False)
    def ping(self):
        return {"success": True, "message": "API OK"}

    # ========================================================
    #                  AI EXTRACT — INVOICE
    # ========================================================
    @http.route("/api/ocr/ai_extract", type="http", auth="public", methods=["POST"], csrf=False)
    def ai_extract(self, **kwargs):
        try:
            raw_body = request.httprequest.data.decode("utf-8").strip()
            try:
                text = json.loads(raw_body).get("text", "").strip()
            except:
                text = raw_body

            if not text:
                return _json_response(False, "Aucun texte fourni", 400)

            prompt = f"""
Tu es un extracteur de données de FACTURE. Renvoie STRICTEMENT ce JSON :

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

Ne renvoie QUE du JSON.
Texte :
\"\"\"{text}\"\"\""""

            response = client.chat.completions.create(
                model="moonshotai/Kimi-K2-Instruct-0905",
                messages=[{"role": "user", "content": prompt}],
            )

            raw = response.choices[0].message.content.strip()

            if raw.startswith("```"):
                raw = raw.split("```")[1]
                raw = raw.replace("json", "").strip()

            try:
                invoice_data = json.loads(raw)
            except:
                return _json_response(False, "JSON invalide", {"raw": raw}, 500)

            return _json_response(True, "Extraction réussie", data=invoice_data)

        except Exception as e:
            return _json_response(False, str(e), 500)

    # ========================================================
    #                CREATE INVOICE IN ODOO
    # ========================================================
    @http.route("/api/invoice/create", type="http", auth="public", methods=["POST"], csrf=False)
    def create_invoice(self):
        try:
            data = json.loads(request.httprequest.data.decode("utf-8"))

            client_name = data.get("client")
            invoice_number = data.get("invoice_number")

            if not client_name or not invoice_number:
                return _json_response(False, "client & invoice_number requis", 400)

            partner = request.env["res.partner"].sudo().search(
                [("name", "ilike", client_name)], limit=1
            )
            if not partner:
                return _json_response(False, f"Client '{client_name}' introuvable", 400)

            lines = data.get("lines", [])
            invoice_lines = []

            for l in lines:
                qty = clean_number(l.get("quantity"))
                price = clean_number(l.get("unit_price"))
                tax_rate = clean_number(l.get("tax_rate"))

                vals = {
                    "name": l.get("name", invoice_number),
                    "quantity": qty or 1,
                    "price_unit": price,
                }

                if tax_rate > 0:
                    tax = request.env["account.tax"].sudo().search(
                        [("amount", "=", tax_rate)], limit=1
                    )
                    if tax:
                        vals["tax_ids"] = [(6, 0, [tax.id])]

                invoice_lines.append((0, 0, vals))

            move = request.env["account.move"].sudo().create({
                "move_type": "out_invoice",
                "name": invoice_number,
                "partner_id": partner.id,
                "invoice_date": parse_date(data.get("invoice_date")),
                "invoice_line_ids": invoice_lines,
            })

            return _json_response(True, "Facture créée", {"id": move.id, "name": move.name}, 201)

        except Exception as e:
            return _json_response(False, f"Erreur: {e}", 500)

    # ========================================================
    #         AI EXTRACT — PURCHASE ORDER (PO)
    # ========================================================
    @http.route("/api/po/ai_extract", type="http", auth="public", methods=["POST"], csrf=False)
    def ai_extract_po(self):
        raw = request.httprequest.data.decode("utf-8").strip()

        try:
            text = json.loads(raw).get("text", "")
        except:
            text = raw

        if not text:
            return _json_response(False, "Aucun texte fourni", 400)

        prompt = f"""
Tu dois extraire un BON DE COMMANDE. Renvoie CE JSON EXACT :

{{
  "po_number": "",
  "po_date": "",
  "expected_date": "",
  "reference_supplier": "",
  "payment_terms": "",
  "vendor": {{
    "name": "",
    "street": "",
    "city": "",
    "country": "",
    "phone": ""
  }},
  "company": {{
    "name": "",
    "street": "",
    "city": "",
    "country": "",
    "phone": ""
  }},
  "shipping_address": {{
    "name": "",
    "street": "",
    "city": "",
    "country": "",
    "phone": ""
  }},
  "lines": [
    {{
      "name": "",
      "expected_date": "",
      "quantity": "",
      "unit_price": "",
      "tax_rate": ""
    }}
  ],
  "totals": {{
    "untaxed": "",
    "taxes": "",
    "total": ""
  }}
}}

Texte :
\"\"\"{text}\"\"\""""

        response = client.chat.completions.create(
            model="moonshotai/Kimi-K2-Instruct-0905",
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.choices[0].message.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            raw = raw.replace("json", "").strip()

        try:
            data = json.loads(raw)
        except Exception as e:
            return _json_response(False, f"Erreur JSON : {e}", {"raw": raw}, 500)

        return _json_response(True, "Extraction PO réussie", data=data)

    # ========================================================
    #               CREATE PURCHASE ORDER
    # ========================================================
    @http.route("/api/po/create", type="http", auth="public", methods=["POST"], csrf=False)
    def create_purchase_order(self):
        try:
            data = json.loads(request.httprequest.data.decode("utf-8"))

            vendor_name = data["vendor"]["name"]
            po_date = parse_date(data.get("po_date"))

            expected_date = data.get("expected_date")
            if expected_date:
                try:
                    expected_date = parse_date(expected_date) + " 00:00:00"
                except:
                    expected_date = str(date.today()) + " 00:00:00"

            reference_supplier = data.get("reference_supplier")

            lines = data.get("lines", [])

            if not vendor_name:
                return _json_response(False, "Fournisseur requis", 400)

            vendor = request.env["res.partner"].sudo().search(
                [("name", "ilike", vendor_name)], limit=1
            )
            if not vendor:
                return _json_response(False, f"Fournisseur '{vendor_name}' introuvable", 400)

            # UoM par défaut
            uom_unit = request.env["uom.uom"].sudo().search([("name", "=", "Units")], limit=1)

            po_lines = []
            for l in lines:
                qty = clean_number(l.get("quantity"))
                price = clean_number(l.get("unit_price"))
                name = l.get("name", "Line")

                # rechercher ou créer produit
                product = request.env["product.product"].sudo().search(
                    [("name", "ilike", name)], limit=1
                )

                if not product:
                    product = request.env["product.product"].sudo().create({
                        "name": name,
                        "type": "service",
                    })

                po_lines.append((0, 0, {
                    "name": product.name,
                    "product_id": product.id,
                    "product_qty": qty,
                    "price_unit": price,
                    "date_planned": expected_date,
                    "product_uom": product.uom_id.id or uom_unit.id,
                }))

            po_vals = {
                "partner_id": vendor.id,
                "date_order": po_date,
                "partner_ref": reference_supplier,
                "order_line": po_lines,
            }

            po = request.env["purchase.order"].sudo().create(po_vals)

            return _json_response(True, "PO créé", {"id": po.id, "name": po.name}, 201)

        except Exception as e:
            return _json_response(False, f"Erreur création PO : {str(e)}", 500)
# -------------------------
#   AI EXTRACT POUR SALES ORDER
# -------------------------
    @http.route("/api/so/ai_extract", type="http", auth="public", methods=["POST"], csrf=False)
    def ai_extract_so(self):

        raw = request.httprequest.data.decode("utf-8").strip()

        try:
            text = json.loads(raw).get("text", "")
        except:
            text = raw

        if not text:
            return _json_response(False, "Aucun texte fourni", 400)

        prompt = f"""
        Tu extraits un BON DE VENTE (Sales Order). Renvoie UNIQUEMENT ce JSON :

        {{
          "so_number": "",
          "so_date": "",
          "expected_date": "",
          "reference_customer": "",
          "payment_terms": "",
          "customer": {{
            "name": "",
            "street": "",
            "city": "",
            "country": "",
            "phone": ""
          }},
          "company": {{
            "name": "",
            "street": "",
            "city": "",
            "country": "",
            "phone": ""
          }},
          "lines": [
            {{
              "name": "",
              "expected_date": "",
              "quantity": "",
              "unit_price": "",
              "tax_rate": ""
            }}
          ],
          "totals": {{
            "untaxed": "",
            "taxes": "",
            "total": ""
          }}
        }}

        Texte :
        \"\"\"{text}\"\"\"
        """

        response = client.chat.completions.create(
            model="moonshotai/Kimi-K2-Instruct-0905",
            messages=[{"role": "user", "content": prompt}],
        )

        raw = response.choices[0].message.content.strip()

        # 🔥 Nettoyage des ```json
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            raw = raw.replace("json", "").strip()

        try:
            data = json.loads(raw)
        except Exception as e:
            return _json_response(False, f"Erreur JSON : {e}", {"raw": raw}, 500)

        return _json_response(True, "Extraction SO réussie", data=data)
    # -------------------------
#   CREATE SALES ORDER
# -------------------------
    @http.route("/api/so/create", type="http", auth="user", methods=["POST"], csrf=False)
    def create_sales_order(self):
        try:
            # Récupérer les données envoyées
            data = json.loads(request.httprequest.data.decode("utf-8"))

            # Chercher le partenaire en fonction du nom (ou de l'email ou d'autres critères uniques)
            partner_name = data.get("customer", {}).get("name")
            partner = request.env['res.partner'].sudo().search([('name', '=', partner_name)], limit=1)

            # Si le client n'existe pas, retourner une erreur
            if not partner:
                return _json_response(False, "Client non trouvé", 400)

            # Récupérer les lignes de commande
            lines = data.get("lines", [])
            if not lines:
                return _json_response(False, "Lignes requises", 400)

            # Construction des lignes de commande
            order_lines = []
            for l in lines:
                # Chercher ou créer un produit
                product = request.env["product.product"].sudo().search([("name", "ilike", l["name"])], limit=1)
                if not product:
                    # Créer un produit si nécessaire
                    product = request.env["product.product"].sudo().create({
                        "name": l["name"],
                        "type": "service",
                    })

                # Ajouter la ligne de commande
                order_lines.append((0, 0, {
                    "name": product.name,
                    "product_id": product.id,
                    "product_uom_qty": l.get("quantity", 1),
                    "price_unit": l.get("unit_price", 0.0),
                }))

            # Créer la commande de vente dans Odoo
            order_vals = {
                "partner_id": partner.id,  # Utiliser l'ID du client trouvé
                "date_order": data.get("so_date", str(date.today())),
                "order_line": order_lines,
                "client_order_ref": data.get("reference_customer", ""),
            }

            order = request.env["sale.order"].sudo().create(order_vals)

            # Retourner la réponse JSON
            return _json_response(True, "SO créé", {"id": order.id, "name": order.name})

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", 500)





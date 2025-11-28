from odoo import http
from odoo.http import request
import json
from datetime import date

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

class OcrApiController(http.Controller):

    # Ping
    @http.route("/api/ping", type="json", auth="public", methods=["GET"], csrf=False)
    def ping(self):
        return {"success": True, "message": "API OK"}

    # Create invoice
    @http.route("/api/invoice/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_invoice(self, **kwargs):

        # Utilisation de httprequest.get_json()
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

            return _json_response(
                True,
                "Facture créée",
                data={"id": move.id, "name": move.name},
                status=201,
            )

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

    # Create sale order
    @http.route("/api/so/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_sale_order(self, **kwargs):

        # Utilisation de httprequest.get_json()
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

            return _json_response(
                True,
                "Sales Order créée",
                data={"id": order.id, "name": order.name},
                status=201,
            )

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

    # Create purchase order
    @http.route("/api/po/create", type="json", auth="user", methods=["POST"], csrf=False)
    def create_purchase_order(self, **kwargs):

        # Utilisation de httprequest.get_json()
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

            return _json_response(
                True,
                "Purchase Order créée",
                data={"id": order.id, "name": order.name},
                status=201,
            )

        except Exception as e:
            return _json_response(False, f"Erreur: {str(e)}", status=500)

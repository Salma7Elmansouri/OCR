import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from "react-native";

export default function InvoicePreviewScreen({ route, navigation }) {
  const { parsedInvoice } = route.params;
  const [data, setData] = useState(parsedInvoice);

  const sendToOdoo = async () => {
    const payload = {
      partner_id: 3,
      move_type: "out_invoice",
      invoice_date: data.invoice_date,
      amount_total: data.total_ttc,
      lines: data.lines.map((l) => ({
        name: l.description,
        quantity: l.quantity,
        price_unit: l.unit_price,
        account_id: 1,
      })),
    };

    try {
      const res = await fetch("http://192.168.1.21:8069/api/invoice/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      console.log(json);
      alert("Facture envoyée à Odoo !");
      navigation.goBack();

    } catch (err) {
      console.log(err);
      alert("Erreur lors de l'envoi");
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.title}>Vérifier la facture</Text>

      <Field label="Type document" value={data.document_type} />
      <Field label="Numéro" value={data.document_number} />
      <Field label="Date" value={data.invoice_date} />
      <Field label="Total" value={String(data.total_ttc)} />

      <BigField label="Adresse société" value={data.company_address} />
      <BigField label="Adresse fournisseur" value={data.vendor_address} />
      <BigField label="Adresse livraison" value={data.shipping_address} />

      <Button title="Envoyer vers Odoo" onPress={sendToOdoo} />
    </ScrollView>
  );
}

const Field = ({ label, value }) => (
  <>
    <Text>{label}:</Text>
    <TextInput style={styles.input} value={value || ""} />
  </>
);

const BigField = ({ label, value }) => (
  <>
    <Text>{label}:</Text>
    <TextInput
      style={[styles.input, { height: 140 }]}
      multiline
      value={value || ""}
    />
  </>
);

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "white" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 12,
    borderRadius: 5,
  },
});

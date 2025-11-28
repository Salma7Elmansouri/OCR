import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

export default function OcrScreen({ route, navigation }) {
  const { base64 } = route.params;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runOCR();
  }, []);

  const runOCR = async () => {
    try {
      const formData = new FormData();
      formData.append("apikey", "helloworld");
      formData.append("base64Image", `data:image/png;base64,${base64}`);
      formData.append("language", "eng");
      formData.append("scale", "true");

      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      console.log("OCR RESULT:", JSON.stringify(json, null, 2));

      const text = json?.ParsedResults?.[0]?.ParsedText || "";
      const parsed = parseInvoice(text);

      navigation.replace("InvoicePreviewScreen", { parsedInvoice: parsed });

    } catch (error) {
      console.log("OCR ERROR:", error);
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="blue" />
      <Text>Analyse du document...</Text>
    </View>
  );
}

/* ============================================================================
    🔥 PARSEUR GÉNÉRAL POUR TOUTES LES FACTURES / RFQ / PO / DEVIS
============================================================================ */

/* ----- NORMALISATION TEXTE ----- */
const normalizeText = (txt) => {
  return txt
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/* ----- DÉTECTION TYPE DOCUMENT ----- */
const detectDocumentType = (text) => {
  if (/invoice/i.test(text)) return "INVOICE";
  if (/request for quotation|rfq/i.test(text)) return "RFQ";
  if (/purchase order|po/i.test(text)) return "PO";
  if (/quotation/i.test(text)) return "QUOTATION";
  return "UNKNOWN";
};

/* ----- DÉTECTION NUMÉRO DOCUMENT ----- */
const detectDocumentNumber = (text) => {
  const m = text.match(/(INV|PO|SO|RFQ|P|Q|I)[-_]?\d{3,10}/i);
  return m ? m[0] : null;
};

/* ----- DÉTECTION DATES ----- */
const detectDate = (text) => {
  const m = text.match(
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(\s*\d{1,2}:\d{2}:\d{2})?\b/
  );
  return m ? m[0] : null;
};

/* ----- DÉTECTION TOTAL ----- */
const detectTotal = (text) => {
  const m = text.match(/total[: ]+([\d.,]+)/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  return null;
};

/* ----- DÉTECTION DEVISE ----- */
const detectCurrency = (text) => {
  if (/\bDH\b|MAD/i.test(text)) return "MAD";
  if (/\bEUR|\€/i.test(text)) return "EUR";
  if (/\$|USD/i.test(text)) return "USD";
  return "UNKNOWN";
};

/* ----- BLOC SOCIÉTÉ ----- */
const detectCompanyBloc = (text) => {
  const lines = text.split("\n");
  const firstLines = lines.slice(0, 6).join("\n");
  return firstLines;
};

/* ----- BLOC SHIPPING ----- */
const detectShippingBloc = (text) => {
  const match = text.match(/(shipping|delivery)[\s\S]{0,150}/i);
  return match ? match[0].trim() : null;
};

/* ----- BLOC FOURNISSEUR OU CLIENT ----- */
const detectVendorBloc = (text) => {
  const m = text.match(
    /(United States|Morocco|France|Germany|Spain)[\s\S]{0,120}/i
  );
  return m ? m[0].trim() : null;
};

/* ----- EXTRACTION LIGNES (UNIVERSAL TABLE PARSER) ----- */
const detectLines = (text) => {
  const lines = [];

  const regex =
    /(.*?)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}.*?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/gi;

  let m;
  while ((m = regex.exec(text)) !== null) {
    lines.push({
      description: m[1].trim(),
      date_required: m[2].trim(),
      quantity: parseFloat(m[3]),
      unit_price: parseFloat(m[4]),
      amount: parseFloat(m[5]),
    });
  }

  return lines;
};

/* ----- PARSEUR COMPLET ----- */
const parseInvoice = (text) => {
  const cleaned = normalizeText(text);

  return {
    document_type: detectDocumentType(cleaned),
    document_number: detectDocumentNumber(cleaned),

    invoice_date: detectDate(cleaned),

    total_ttc: detectTotal(cleaned),
    currency: detectCurrency(cleaned),

    company_address: detectCompanyBloc(cleaned),
    vendor_address: detectVendorBloc(cleaned),
    shipping_address: detectShippingBloc(cleaned),

    lines: detectLines(cleaned),
  };
};

/* ----- STYLE ----- */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});

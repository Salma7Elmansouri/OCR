import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";

export default function OcrScreen({ route }) {
  const { base64 } = route.params || {};
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!base64) {
      setText("Aucune image reçue");
      setLoading(false);
      return;
    }
    runOCR();
  }, []);

  const runOCR = async () => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("apikey", "helloworld"); // clé gratuite (tu peux mettre la tienne)
      formData.append("base64Image", `data:image/png;base64,${base64}`);
      formData.append("language", "eng"); // "eng" fonctionne mieux que "fre"
      formData.append("scale", "true");
      formData.append("isTable", "true");

      // Timeout auto
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const json = await res.json();

      // LOG du résultat complet pour debug
      console.log("OCR RESULT JSON:", JSON.stringify(json, null, 2));

      const extracted =
        json?.ParsedResults?.[0]?.ParsedText?.trim() || "Aucun texte détecté";

      setText(extracted);
    } catch (error) {
      console.log("OCR ERROR:", error);
      setText("Erreur OCR ou problème réseau.");
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Texte détecté :</Text>

      {loading ? (
        <ActivityIndicator size="large" color="blue" style={{ marginTop: 30 }} />
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "white" },

  title: {
    fontSize: 22,
    fontWeight: "bold",
  },

  text: {
    marginTop: 20,
    fontSize: 16,
    backgroundColor: "#f1f1f1",
    padding: 10,
    borderRadius: 8,
  },
});

import React, { useState } from "react";
import { View, Text, Button, Image, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation } from "@react-navigation/native";

export default function DocumentScanner() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const compressed = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            setImage(compressed.uri);
            processImage(compressed.uri);
        }
    };

    // Fonction pour envoyer l'image OCR Space et récupérer le texte
    const processImage = async (imageUri) => {
        try {
            setLoading(true);

            // Lire l'image en Base64
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });

            const form = new FormData();
            form.append("base64Image", `data:image/jpeg;base64,${base64}`);
            form.append("language", "fre");
            form.append("isTable", "true");
            form.append("scale", "true");
            form.append("OCREngine", "2");

            // Appel à OCR Space
            const res = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                headers: { apikey: "helloworld" }, // Remplacer par votre clé OCR Space
                body: form,
            });

            const result = await res.json();
            const text = result?.ParsedResults?.[0]?.ParsedText;

            if (!text) return Alert.alert("Erreur", "Impossible de lire le document");

            // --- ENVOI AU BACKEND POUR AI ---
            const backendRes = await fetch("http://192.168.1.210:8069/api/ocr/ai_extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const invoiceData = await backendRes.json();

            if (!invoiceData.success) {
                Alert.alert("Erreur AI", invoiceData.message || "Erreur lors de l'extraction AI");
                return;
            }

            // Naviguer vers la page de prévisualisation avec les données extraites
            navigation.navigate("InvoicePreview", { data: invoiceData.data });

        } catch (err) {
            console.log(err);
            Alert.alert("Erreur", "OCR ou AI failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Button title="Scanner un document" onPress={pickImage} />
            {image && <Image source={{ uri: image }} style={{ width: "100%", height: 300, marginTop: 20 }} />}
            {loading && (
                <View style={{ marginTop: 20 }}>
                    <ActivityIndicator size="large" />
                    <Text>Analyse du document…</Text>
                </View>
            )}
        </View>
    );
}

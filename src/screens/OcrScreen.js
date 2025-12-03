import React, { useState } from "react";
import { View, Text, Image, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext } from "react";
import { HistoryContext } from "../Utils/HistoryContext";

const PRIMARY = "#6200EE";
const BG = "#F5F5F5";
const SURFACE = "#FFFFFF";
const TEXT_PRIMARY = "#212121";
const TEXT_SECONDARY = "#757575";

export default function DocumentScanner() {

    console.log("📌 DocumentScanner MONTÉ");

    const route = useRoute();
    const { mode, ip } = route.params || {};

    console.log("📥 PARAMS REÇUS :", route.params);
    console.log("➡️ mode =", mode);
    console.log("➡️ ip =", ip);

    const navigation = useNavigation();
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!ip) {
        console.log("❌ ERREUR : ip absent dans route.params");
        Alert.alert("Erreur", "Aucune adresse IP fournie.");
        return null;
    }

    // ----------------------------
    // SAUVEGARDE HISTORIQUE
    // ----------------------------
    const { addToHistory } = useContext(HistoryContext);
    const context = useContext(HistoryContext);
    console.log("HistoryContext complet :", context);

    // ----------------------------
    // PRENDRE PHOTO
    // ----------------------------
    const takePhoto = async () => {
        console.log("📸 takePhoto() appelé");

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 1,
            });

            console.log("📤 Résultat camera :", result);

            if (result.canceled) {
                console.log("❌ Photo annulée");
                return Alert.alert("Erreur", "Aucune image prise.");
            }

            const uri = result.assets[0].uri;
            console.log("📌 URI photo :", uri);

            const compressed = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );

            console.log("🗜️ Compressé :", compressed);

            const file = {
                type: mode,
                name: `image_${Date.now()}.jpg`,
                uri: compressed.uri,
                date: new Date().toISOString(),
            };

            setImage(compressed.uri);
            await addToHistory(file);

            processImage(compressed.uri);

        } catch (e) {
            console.log("🔥 ERREUR CAMERA :", e);
            Alert.alert("Erreur", "Impossible d'ouvrir la caméra");
        }
    };

    // ----------------------------
    // IMPORTER IMAGE
    // ----------------------------
    const pickImage = async () => {
        console.log("🖼️ pickImage() appelé");

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: false,
                quality: 1,
            });

            console.log("📤 Résultat galerie :", result);

            if (result.canceled) {
                console.log("❌ Image annulée");
                return Alert.alert("Erreur", "Aucune image sélectionnée.");
            }

            const uri = result.assets[0].uri;
            console.log("📌 URI image galerie :", uri);

            const compressed = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );

            console.log("🗜️ Compressé :", compressed);

            const file = {
                type: mode,
                name: `image_${Date.now()}.jpg`,
                uri: compressed.uri,
                date: new Date().toISOString(),
            };

            setImage(compressed.uri);
            await addToHistory(file);

            processImage(compressed.uri);

        } catch (e) {
            console.log("🔥 ERREUR GALLERIE :", e);
            Alert.alert("Erreur", "Impossible d'ouvrir la galerie");
        }
    };

    // ----------------------------
    // OCR + BACKEND
    // ----------------------------
    const processImage = async (imageUri) => {
        console.log("🧠 Début OCR pour :", imageUri);

        try {
            setLoading(true);

            const info = await FileSystem.getInfoAsync(imageUri);
            console.log("📁 Infos fichier OCR :", info);

            if (!info.exists) throw new Error("Image introuvable");

            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            console.log("📤 Base64 généré (taille) :", base64.length);

            const form = new FormData();
            form.append("base64Image", `data:image/jpeg;base64,${base64}`);
            form.append("language", "fre");
            form.append("isTable", "true");
            form.append("scale", "true");

            console.log("➡️ Envoi OCR…");

            const ocrRes = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                headers: { apikey: "helloworld" },
                body: form,
            });

            const ocrJson = await ocrRes.json();
            console.log("📥 Réponse OCR :", ocrJson);

            const text = ocrJson?.ParsedResults?.[0]?.ParsedText;

            if (!text) {
                console.log("❌ Aucun texte OCR");
                return Alert.alert("Erreur", "Aucune donnée lisible");
            }

            console.log("📌 Texte OCR extrait :", text.substring(0, 100), "...");

            let endpoint = "/api/ocr/ai_extract";
            if (mode === "po") endpoint = "/api/po/ai_extract";
            if (mode === "so") endpoint = "/api/so/ai_extract";

            console.log("➡️ Envoi backend :", `http://${ip}:8069${endpoint}`);

            const backendRes = await fetch(`http://${ip}:8069${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const data = await backendRes.json();
            console.log("📥 Réponse backend :", data);

            // Navigation
            if (mode === "invoice") {
                console.log("➡️ Navigation → InvoicePreview");
                navigation.navigate("InvoicePreview", { data: data.data, ip });
                // navigation.navigate("History");
            }
            else if (mode === "po") {
                console.log("➡️ Navigation → PurchaseOrder");
                navigation.navigate("PurchaseOrder", { data: data.data, ip });
            }
            else if (mode === "so") {
                console.log("➡️ Navigation → SalesOrder");
                navigation.navigate("SalesOrder", { data: data.data, ip });
            }

        } catch (err) {
            console.log("🔥 ERREUR OCR/BACKEND :", err);
            Alert.alert("Erreur", "OCR ou backend indisponible");
        } finally {
            setLoading(false);
            console.log("⏹️ OCR terminé");
        }
    };

    // ----------------------------
    // UI
    // ----------------------------
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Scan du document</Text>
                <Text style={styles.subtitle}>Photo ou image → analyse automatique</Text>
            </View>

            <View style={styles.card}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>Aucune image</Text>
                        <Text style={styles.placeholderSub}>Scannez ou importez</Text>
                    </View>
                )}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={takePhoto} disabled={loading}>
                    <Text style={styles.primaryButtonText}>{loading ? "Analyse..." : "Scanner"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secButton} onPress={pickImage} disabled={loading}>
                    <Text style={styles.secButtonText}>{loading ? "Analyse..." : "Télécharger"}</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>Analyse…</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        backgroundColor: BG
    },
    header: {
        marginTop: 30,
        marginBottom: 30
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: TEXT_PRIMARY,
        textAlign: "center"
    },
    subtitle: {
        fontSize: 14,
        color: TEXT_SECONDARY,
        textAlign: "center",
        marginBottom: 20
    },
    card: {
        flex: 1,
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 12,
        elevation: 4,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,  // Ajustement de l'espace en bas de la carte
    },
    image: {
        width: "100%", // Taille de l'image réduite
        height: "100%",
        borderRadius: 12,
        marginBottom: 20  // Espacement entre l'image et les boutons
    },
    placeholder: {
        alignItems: "center"
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: "600",
        color: TEXT_PRIMARY
    },
    placeholderSub: {
        fontSize: 13,
        color: TEXT_SECONDARY
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",  // Espacement des boutons
        marginTop: 10,  // Moins d'espace au-dessus des boutons
    },
    primaryButton: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: PRIMARY,
        paddingVertical: 12, // Moins d'espace vertical pour les boutons
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 80

    },
    secButton: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: PRIMARY,
        paddingVertical: 12, // Moins d'espace vertical pour les boutons
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 80
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600"
    },
    secButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600"
    },
    loadingContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 16
    },
    loadingText: {
        marginLeft: 10,
        color: TEXT_SECONDARY
    },
});
import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useNavigation } from "@react-navigation/native";

const PRIMARY = "#6200EE";
const SECONDARY = "#03DAC6";
const BG = "#F5F5F5";
const SURFACE = "#FFFFFF";
const TEXT_PRIMARY = "#212121";
const TEXT_SECONDARY = "#757575";

export default function DocumentScanner() {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 1,
            });

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
        } catch (e) {
            console.log(e);
            Alert.alert("Erreur", "Impossible d'ouvrir la caméra");
        }
    };

    // Fonction pour envoyer l'image à OCR Space et récupérer le texte
    const processImage = async (imageUri) => {
        try {
            setLoading(true);

            // Lire l'image en Base64
            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const form = new FormData();
            form.append("base64Image", `data:image/jpeg;base64,${base64}`);
            form.append("language", "fre");
            form.append("isTable", "true");
            form.append("scale", "true");
            form.append("OCREngine", "2");

            // Appel à OCR Space
            const res = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                headers: { apikey: "helloworld" }, // TODO: remplacer par ta vraie clé
                body: form,
            });

            const result = await res.json();
            console.log("OCR RESULT:", JSON.stringify(result, null, 2));

            const text = result?.ParsedResults?.[0]?.ParsedText;

            if (!text) {
                Alert.alert("Erreur", "Impossible de lire le document.");
                return;
            }

            // --- ENVOI AU BACKEND POUR IA (JSON propre) ---
            const backendRes = await fetch("http://192.168.1.31:8069/api/ocr/ai_extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const invoiceData = await backendRes.json();
            console.log("AI BACKEND RESULT:", JSON.stringify(invoiceData, null, 2));

            if (!invoiceData.success) {
                Alert.alert("Erreur IA", invoiceData.message || "Erreur lors de l'extraction IA");
                return;
            }

            // Naviguer vers la page de prévisualisation avec les données extraites
            navigation.navigate("InvoicePreview", { data: invoiceData.data });
        } catch (err) {
            console.log(err);
            Alert.alert("Erreur", "OCR ou IA a échoué");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Scan de facture</Text>
                <Text style={styles.subtitle}>
                    Prenez une photo de la facture pour analyser automatiquement les données.
                </Text>
            </View>

            <View style={styles.card}>
                {image ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Text style={styles.placeholderText}>
                            Aucune image pour le moment.
                        </Text>
                        <Text style={styles.placeholderSub}>
                            Appuyez sur le bouton ci-dessous pour scanner une facture.
                        </Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={pickImage} disabled={loading}>
                <Text style={styles.primaryButtonText}>
                    {loading ? "Analyse en cours..." : "Scanner une facture"}
                </Text>
            </TouchableOpacity>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>Analyse du document…</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: TEXT_PRIMARY,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: TEXT_SECONDARY,
    },
    card: {
        flex: 1,
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    placeholder: {
        alignItems: "center",
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: "600",
        color: TEXT_PRIMARY,
        marginBottom: 4,
    },
    placeholderSub: {
        fontSize: 13,
        color: TEXT_SECONDARY,
        textAlign: "center",
        paddingHorizontal: 20,
    },
    primaryButton: {
        marginTop: 20,
        backgroundColor: PRIMARY,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    loadingContainer: {
        marginTop: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginLeft: 10,
        color: TEXT_SECONDARY,
    },
});

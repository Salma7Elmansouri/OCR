import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView, SafeAreaView, StyleSheet, Alert } from "react-native";

export default function InvoicePreview({ route, navigation }) {
    const { data } = route.params;
    console.log("Données reçues :", data);

    // Mettre à jour les clés du state pour correspondre aux noms du JSON
    const [invoiceData, setInvoiceData] = useState({
        fournisseur: data["Fournisseur"] || "",
        client: data["Client"] || "",
        numero_facture: data["Numéro de la facture"] || "",
        date_facture: data["Date de la facture"] || "",
        date_echeance: data["Date d'échéance"] || "",
        total_hors_taxes: data["Total hors taxes"] || "",
        tva: data["TVA"] || "",
        total_ttc: data["Total TTC"] || "",
        reference: data["Référence"] || ""
    });

    if (!data) {
        return (
            <View style={styles.center}>
                <Text>Aucune donnée de facture disponible</Text>
            </View>
        );
    }

    const handleInputChange = (field, value) => {
        setInvoiceData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const createInvoiceInOdoo = async () => {
        try {
            const res = await fetch("http://192.168.1.31:8069/api/invoice/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client: invoiceData.client,
                    supplier: invoiceData.fournisseur,
                    invoice_number: invoiceData.numero_facture,
                    invoice_date: invoiceData.date_facture,
                    due_date: invoiceData.date_echeance,
                    total_without_tax: invoiceData.total_hors_taxes,
                    tva: invoiceData.tva,
                    total_ttc: invoiceData.total_ttc,
                    reference: invoiceData.reference,
                }),
            });

            // Récupérer la réponse sous forme de texte brut
            const textResponse = await res.text();
            console.log("Réponse brute du backend :", textResponse); // Affiche la réponse brute

            // Si la réponse est un JSON valide, essayons de la parser
            try {
                const result = JSON.parse(textResponse);  // Essaie de parser la réponse en JSON

                // Vérification de la structure de la réponse
                if (res.ok && result.success) {
                    Alert.alert("Succès", `Facture créée: ${result.data.name}`);
                    navigation.goBack();
                } else {
                    // Si le backend renvoie une erreur, affichez-la
                    const errorMessage = result.message || "Erreur lors de la création de la facture";
                    Alert.alert("Erreur", errorMessage);
                }
            } catch (jsonError) {
                console.log("Erreur lors du parsing du JSON :", jsonError);
                Alert.alert("Erreur", "La réponse du serveur n'est pas un JSON valide.");
            }
        } catch (err) {
            console.log("Erreur lors de la création de la facture :", err);
            Alert.alert("Erreur", "Impossible de créer la facture");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <Text style={styles.title}>Prévisualisation de la facture</Text>

                {/* Fournisseur */}
                <View style={styles.section}>
                    <Text style={styles.label}>Fournisseur:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.fournisseur}
                        onChangeText={(text) => handleInputChange("fournisseur", text)}
                    />
                </View>

                {/* Client */}
                <View style={styles.section}>
                    <Text style={styles.label}>Client:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.client}
                        onChangeText={(text) => handleInputChange("client", text)}
                    />
                </View>

                {/* Numéro de facture */}
                <View style={styles.section}>
                    <Text style={styles.label}>Numéro de la facture:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.numero_facture}
                        onChangeText={(text) => handleInputChange("numero_facture", text)}
                    />
                </View>

                {/* Date de la facture */}
                <View style={styles.section}>
                    <Text style={styles.label}>Date de la facture:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.date_facture}
                        onChangeText={(text) => handleInputChange("date_facture", text)}
                    />
                </View>

                {/* Date d'échéance */}
                <View style={styles.section}>
                    <Text style={styles.label}>Date d'échéance:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.date_echeance}
                        onChangeText={(text) => handleInputChange("date_echeance", text)}
                    />
                </View>

                {/* Total hors taxes */}
                <View style={styles.section}>
                    <Text style={styles.label}>Total hors taxes:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.total_hors_taxes}
                        onChangeText={(text) => handleInputChange("total_hors_taxes", text)}
                    />
                </View>

                {/* TVA */}
                <View style={styles.section}>
                    <Text style={styles.label}>TVA:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.tva}
                        onChangeText={(text) => handleInputChange("tva", text)}
                    />
                </View>

                {/* Total TTC */}
                <View style={styles.section}>
                    <Text style={styles.label}>Total TTC:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.total_ttc}
                        onChangeText={(text) => handleInputChange("total_ttc", text)}
                    />
                </View>

                {/* Référence */}
                <View style={styles.section}>
                    <Text style={styles.label}>Référence:</Text>
                    <TextInput
                        style={styles.input}
                        value={invoiceData.reference}
                        onChangeText={(text) => handleInputChange("reference", text)}
                    />
                </View>

                <Button title="Créer la facture dans Odoo" onPress={createInvoiceInOdoo} />
            </SafeAreaView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f9f9f9",
    },
    safeArea: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 20,
        textAlign: "center",
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontWeight: "bold",
        fontSize: 16,
        color: "#333",
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#333",
    },
    button: {
        marginTop: 20,
        backgroundColor: "#4CAF50",
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 50,
    },
});

import React from "react";
import { View, Text, Button, ScrollView, StyleSheet, Alert } from "react-native";

export default function InvoicePreview({ route, navigation }) {
    const { data } = route.params;

    if (!data) {
        return (
            <View style={styles.center}>
                <Text>Aucune donnée de facture disponible</Text>
            </View>
        );
    }

    const createInvoiceInOdoo = async () => {
        try {
            const res = await fetch("http://192.168.1.210:8069/api/invoice/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partner_id: data.partner_id || 1, // Remplacer selon votre logique
                    invoice_date: data.invoice_date,
                    lines: data.lines || [],
                }),
            });
            const result = await res.json();
            if (result.success) {
                Alert.alert("Succès", `Facture créée: ${result.data.name}`);
                navigation.goBack();
            } else {
                Alert.alert("Erreur", result.message || "Erreur lors de la création");
            }
        } catch (err) {
            console.log(err);
            Alert.alert("Erreur", "Impossible de créer la facture");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Prévisualisation de la facture</Text>
            <View style={styles.section}>
                <Text style={styles.label}>Fournisseur:</Text>
                <Text>{data.fournisseur || "N/A"}</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Date:</Text>
                <Text>{data.date || "N/A"}</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Numéro de facture:</Text>
                <Text>{data.numero_facture || "N/A"}</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.label}>Total:</Text>
                <Text>{data.total || "N/A"}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Lignes de facture:</Text>
                {data.lines && data.lines.length > 0 ? (
                    data.lines.map((line, idx) => (
                        <View key={idx} style={styles.line}>
                            <Text>Produit: {line.name}</Text>
                            <Text>Quantité: {line.quantity}</Text>
                            <Text>Prix unitaire: {line.unit_price}</Text>
                        </View>
                    ))
                ) : (
                    <Text>Aucune ligne détectée</Text>
                )}
            </View>

            <Button title="Créer la facture dans Odoo" onPress={createInvoiceInOdoo} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 20,
    },
    section: {
        marginBottom: 15,
    },
    label: {
        fontWeight: "bold",
    },
    line: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: "#f2f2f2",
        borderRadius: 5,
    },
});

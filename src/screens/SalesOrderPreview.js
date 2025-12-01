import React, { useState, useMemo } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity } from "react-native";

const PRIMARY = "#6200EE";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const SUB = "#6A6A6A";
const BORDER = "#E5E5E5";

export default function SalesOrderPreview({ route, navigation }) {
    const { data } = route.params || {};

    if (!data) {
        return <Text>Aucune donnée SO reçue</Text>;
    }

    const [soData, setSoData] = useState({
        so_number: data.so_number || "",
        so_date: data.so_date || "",
        expected_date: data.expected_date || "",
        payment_terms: data.payment_terms || "",
        reference_customer: data.reference_customer || "",
        company_name: data.company_name || "",  // String, no longer an object
        company: {
            name: data.company?.name || "",
            street: data.company?.street || "",
            city: data.company?.city || "",
            country: data.company?.country || "",
            phone: data.company?.phone || "",
        },
        customer: {
            name: data.customer?.name || "",
            street: data.customer?.street || "",
            city: data.customer?.city || "",
            country: data.customer?.country || "",
            phone: data.customer?.phone || "",
        },
        lines: Array.isArray(data.lines)
            ? data.lines.map((l) => ({
                name: l.name || "",
                expected_date: l.expected_date || "",
                quantity: l.quantity || "1",
                unit_price: l.unit_price || "",
            }))
            : [],
    });

    const total = useMemo(() => {
        let total = 0;
        soData.lines.forEach((l) => {
            const qty = parseFloat(l.quantity) || 1;
            const price = parseFloat(l.unit_price) || 0;
            total += qty * price;
        });
        return total;
    }, [soData.lines]);

    const updateRoot = (field, value) =>
        setSoData((prev) => ({ ...prev, [field]: value }));

    const updateNested = (section, field, value) =>
        setSoData((prev) => ({
            ...prev,
            [section]: { ...prev[section], [field]: value },
        }));

    const updateLine = (i, field, value) =>
        setSoData((prev) => {
            const list = [...prev.lines];
            list[i] = { ...list[i], [field]: value };
            return { ...prev, lines: list };
        });

    const addLine = () =>
        setSoData((prev) => ({
            ...prev,
            lines: [...prev.lines, { name: "", expected_date: "", quantity: "1", unit_price: "" }],
        }));

    const removeLine = (i) =>
        setSoData((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, idx) => idx !== i),
        }));

    const formatDate = (dateStr) => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;  // Corrected the date format
        }
        return dateStr;
    };

    const createSO = async () => {
        try {
            const payload = {
                ...soData,
                so_date: formatDate(soData.so_date),
                expected_date: formatDate(soData.expected_date),
                lines: soData.lines.map((l) => ({
                    name: l.name,
                    expected_date: formatDate(l.expected_date),
                    quantity: parseFloat(l.quantity),
                    unit_price: parseFloat(l.unit_price),
                })),
                total: total,
            };

            console.log("📦 Payload envoyé SO:", JSON.stringify(payload, null, 2));

            const res = await fetch("http://192.168.1.195:8069/api/so/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseText = await res.text();
            console.log("Réponse brute du backend:", responseText);

            if (!res.ok) {
                console.error("Erreur dans la réponse du backend:", res.statusText);
                Alert.alert("Erreur", "Erreur du serveur");
                return;
            }

            let json;
            try {
                json = JSON.parse(responseText);
                console.log("Réponse JSON du backend:", JSON.stringify(json, null, 2));
            } catch (err) {
                console.error("Erreur lors du parsing JSON:", err.message);
                Alert.alert("Erreur", "Réponse du serveur invalide");
                return;
            }

            if (json.success) {
                Alert.alert("Succès", "Commande de vente créée !");
                navigation.goBack();
            } else {
                console.error("Erreur dans la création de la SO:", json.message);
                Alert.alert("Erreur", json.message);
            }
        } catch (e) {
            console.error("Erreur lors de la création de la SO:", e.message);
            Alert.alert("Erreur", "Erreur lors de la communication avec le serveur.");
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Prévisualisation de la SO</Text>
            {/* Numéro de commande */}
            <TextInput
                style={styles.input}
                placeholder="Numéro de commande"
                value={soData.so_number}
                onChangeText={(v) => updateRoot("so_number", v)}
            />
            {/* Nom de la société */}

            {["name", "street", "city", "country", "phone"].map((field) => (
                <TextInput
                    key={field}
                    style={styles.input}
                    placeholder={`Entreprise ${field}`}
                    value={soData.company[field]}
                    onChangeText={(v) => updateNested("company", field, v)}
                />
            ))}
            {/* Informations client */}
            <Text style={styles.section}>Client</Text>
            {["name", "street", "city", "country", "phone"].map((field) => (
                <TextInput
                    key={field}
                    style={styles.input}
                    placeholder={`Client ${field}`}
                    value={soData.customer[field]}
                    onChangeText={(v) => updateNested("customer", field, v)}
                />
            ))}

            {/* Lignes de commande */}
            <View style={styles.rowBetween}>
                <Text style={styles.section}>Lignes</Text>
                <TouchableOpacity onPress={addLine}>
                    <Text style={styles.add}>+ Ajouter</Text>
                </TouchableOpacity>
            </View>
            {soData.lines.map((line, idx) => (
                <View key={idx} style={styles.card}>
                    <TextInput
                        placeholder="Nom"
                        style={styles.input}
                        value={line.name}
                        onChangeText={(v) => updateLine(idx, "name", v)}
                    />
                    <TextInput
                        placeholder="Date prévue"
                        style={styles.input}
                        value={line.expected_date}
                        onChangeText={(v) => updateLine(idx, "expected_date", v)}
                    />
                    <TextInput
                        placeholder="Quantité"
                        style={styles.input}
                        value={line.quantity}
                        onChangeText={(v) => updateLine(idx, "quantity", v)}
                    />
                    <TextInput
                        placeholder="Prix unitaire"
                        style={styles.input}
                        value={line.unit_price}
                        onChangeText={(v) => updateLine(idx, "unit_price", v)}
                    />
                    <TouchableOpacity onPress={() => removeLine(idx)} style={styles.deleteBtn}>
                        <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                </View>
            ))}
            {/* Total */}
            <View style={styles.card}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{total.toFixed(2)} DH</Text>
            </View>
            {/* Bouton pour créer la SO */}
            <TouchableOpacity style={styles.btn} onPress={createSO}>
                <Text style={styles.btnText}>Créer la SO dans Odoo</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: BG },
    title: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 12 },
    section: { fontSize: 18, fontWeight: "700", marginTop: 20, color: TEXT },
    card: { backgroundColor: CARD, padding: 14, borderRadius: 12, marginTop: 10 },
    input: { backgroundColor: "#FAFAFA", padding: 10, borderRadius: 8, marginTop: 10 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between" },
    add: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
    deleteBtn: { marginTop: 10, alignItems: "center" },
    deleteText: { color: "red", fontWeight: "700", fontSize: 16 },
    totalLabel: { fontSize: 18, fontWeight: "700", color: TEXT },
    totalValue: { fontSize: 20, fontWeight: "800", color: PRIMARY },
    btn: { backgroundColor: PRIMARY, padding: 15, borderRadius: 50, alignItems: "center", marginTop: 20 },
    btnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

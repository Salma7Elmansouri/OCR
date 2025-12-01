import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from "react-native";

const PRIMARY = "#6200EE";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const SUB = "#6A6A6A";
const BORDER = "#E5E5E5";

/* -------------------------------------------------------------------------- */
/*                              UTILS                                         */
/* -------------------------------------------------------------------------- */

const cleanNumber = (value) => {
    if (!value) return 0;
    let v = String(value).trim().replace(/\s+/g, "");

    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, "");
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, "").replace(",", ".");
    if (v.includes(",") && !v.includes(".")) v = v.replace(",", ".");
    v = v.replace(/[^0-9.]/g, "");

    return parseFloat(v) || 0;
};

const computeTotals = (lines) => {
    let total = 0;
    lines.forEach((l) => {
        total += cleanNumber(l.quantity) * cleanNumber(l.unit_price);
    });
    return total;
};

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

export default function PurchaseOrderPreview({ route, navigation }) {
    const { data } = route.params || {};

    if (!data) return <Text>Aucune donnée PO reçue</Text>;

    /* ------------------------------ INIT STATE ----------------------------- */

    const [poData, setPoData] = useState(() => ({
        po_number: data.po_number || "",
        po_date: data.po_date || "",
        expected_date: data.expected_date || "",
        payment_terms: data.payment_terms || "",
        reference_supplier: data.reference_supplier || "",

        vendor: { ...data.vendor },
        company: { ...data.company },
        shipping_address: { ...data.shipping_address },

        lines: Array.isArray(data.lines)
            ? data.lines.map((l) => ({
                name: l.name || "",
                expected_date: l.expected_date || "",
                quantity: l.quantity || "1",
                unit_price: l.unit_price || "",
            }))
            : [],

        totals: {
            untaxed: data.totals?.untaxed || "",
            taxes: data.totals?.taxes || "",
            total: data.totals?.total || "",
        },
    }));

    /* ------------------------------ COMPUTE TOTALS ------------------------ */
    const localTotal = useMemo(
        () => computeTotals(poData.lines || []),
        [poData.lines]
    );

    /* ------------------------------ UPDATE FUNCTIONS ----------------------- */

    const updateRoot = (field, value) =>
        setPoData((prev) => ({ ...prev, [field]: value }));

    const updateNested = (section, field, value) =>
        setPoData((prev) => ({
            ...prev,
            [section]: { ...prev[section], [field]: value },
        }));

    const updateLine = (i, field, value) =>
        setPoData((prev) => {
            const list = [...prev.lines];
            list[i] = { ...list[i], [field]: value };
            return { ...prev, lines: list };
        });

    const addLine = () =>
        setPoData((prev) => ({
            ...prev,
            lines: [
                ...prev.lines,
                { name: "", expected_date: "", quantity: "1", unit_price: "" },
            ],
        }));

    const removeLine = (i) =>
        setPoData((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, idx) => idx !== i),
        }));

    /* ------------------------------ SEND TO ODOO -------------------------- */

    const createPO = async () => {
        try {
            const payload = {
                ...poData,
                lines: poData.lines.map((l) => ({
                    name: l.name,
                    expected_date: l.expected_date,
                    quantity: cleanNumber(l.quantity),
                    unit_price: cleanNumber(l.unit_price),
                })),
                total: localTotal,
            };

            console.log("📦 Payload envoyé PO:", JSON.stringify(payload, null, 2));

            const res = await fetch("http://192.168.1.195:8069/api/po/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const txt = await res.text();
            console.log("Réponse brute:", txt);

            const json = JSON.parse(txt);

            if (json.success) {
                Alert.alert("Succès", "Purchase Order créé !");
                navigation.goBack();
            } else {
                Alert.alert("Erreur", json.message);
            }
        } catch (e) {
            Alert.alert("Erreur", e.message);
        }
    };

    /* -------------------------------------------------------------------------- */
    /*                              RENDER UI                                    */
    /* -------------------------------------------------------------------------- */

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Prévisualisation du PO</Text>

            {/* ------------------------------ HEADER DETAILS ------------------------------ */}
            <View style={styles.card}>
                {["po_number", "po_date", "expected_date", "payment_terms", "reference_supplier"].map((f) => (
                    <TextInput
                        key={f}
                        style={styles.input}
                        placeholder={f.replace("_", " ")}
                        value={poData[f]}
                        onChangeText={(v) => updateRoot(f, v)}
                    />
                ))}
            </View>

            {/* ------------------------------ VENDOR ------------------------------ */}
            <Text style={styles.section}>Fournisseur</Text>
            <View style={styles.card}>
                {Object.keys(poData.vendor).map((field) => (
                    <TextInput
                        key={field}
                        style={styles.input}
                        placeholder={field}
                        value={poData.vendor[field]}
                        onChangeText={(v) => updateNested("vendor", field, v)}
                    />
                ))}
            </View>

            {/* ------------------------------ COMPANY ------------------------------ */}
            <Text style={styles.section}>Société</Text>
            <View style={styles.card}>
                {Object.keys(poData.company).map((field) => (
                    <TextInput
                        key={field}
                        style={styles.input}
                        placeholder={field}
                        value={poData.company[field]}
                        onChangeText={(v) => updateNested("company", field, v)}
                    />
                ))}
            </View>

            {/* ------------------------------ SHIPPING ADDRESS ------------------------------ */}
            <Text style={styles.section}>Adresse de livraison</Text>
            <View style={styles.card}>
                {Object.keys(poData.shipping_address).map((field) => (
                    <TextInput
                        key={field}
                        style={styles.input}
                        placeholder={field}
                        value={poData.shipping_address[field]}
                        onChangeText={(v) =>
                            updateNested("shipping_address", field, v)
                        }
                    />
                ))}
            </View>

            {/* ------------------------------ LINES ------------------------------ */}
            <View style={styles.rowBetween}>
                <Text style={styles.section}>Lignes</Text>
                <TouchableOpacity onPress={addLine}>
                    <Text style={styles.add}>+ Ajouter</Text>
                </TouchableOpacity>
            </View>

            {poData.lines.map((line, idx) => (
                <View style={styles.card} key={idx}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.lineTitle}>Ligne {idx + 1}</Text>
                        <TouchableOpacity onPress={() => removeLine(idx)}>
                            <Text style={styles.delete}>Supprimer</Text>
                        </TouchableOpacity>
                    </View>

                    {["name", "expected_date", "quantity", "unit_price"].map((f) => (
                        <TextInput
                            key={f}
                            placeholder={f}
                            style={styles.input}
                            value={line[f]}
                            onChangeText={(v) => updateLine(idx, f, v)}
                        />
                    ))}
                </View>
            ))}

            {/* ------------------------------ TOTALS ------------------------------ */}
            <Text style={styles.section}>Totaux</Text>
            <View style={styles.card}>
                <TextInput
                    style={styles.input}
                    placeholder="Montant HT"
                    value={poData.totals.untaxed}
                    onChangeText={(v) =>
                        updateNested("totals", "untaxed", v)
                    }
                />
                <TextInput
                    style={styles.input}
                    placeholder="Taxes"
                    value={poData.totals.taxes}
                    onChangeText={(v) =>
                        updateNested("totals", "taxes", v)
                    }
                />
                <TextInput
                    style={styles.input}
                    placeholder="Total"
                    value={poData.totals.total}
                    onChangeText={(v) =>
                        updateNested("totals", "total", v)
                    }
                />

                <Text style={styles.localTotal}>
                    Total calculé automatiquement :{" "}
                    <Text style={{ color: PRIMARY, fontWeight: "bold" }}>
                        {localTotal.toFixed(2)} DH
                    </Text>
                </Text>
            </View>

            {/* ------------------------------ BUTTON ------------------------------ */}
            <TouchableOpacity style={styles.btn} onPress={createPO}>
                <Text style={styles.btnText}>Créer le PO dans Odoo</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

/* -------------------------------------------------------------------------- */
/*                                  STYLES                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: BG },
    title: { fontSize: 22, fontWeight: "700", color: TEXT, marginBottom: 12 },
    section: { fontSize: 18, fontWeight: "700", marginTop: 20, color: TEXT },
    card: {
        backgroundColor: CARD,
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    input: {
        backgroundColor: "#FAFAFA",
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    lineTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
    add: { color: PRIMARY, fontWeight: "700", fontSize: 16 },
    delete: { color: "red", fontWeight: "700" },
    localTotal: {
        marginTop: 10,
        fontSize: 16,
        color: TEXT,
    },
    btn: {
        backgroundColor: PRIMARY,
        padding: 15,
        borderRadius: 50,
        alignItems: "center",
        marginVertical: 25,
    },
    btnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

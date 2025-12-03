import React, {useState, useMemo, useEffect} from "react";
import {
    View,
    Text,
    TextInput,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    Alert,
    TouchableOpacity,
} from "react-native";

const PRIMARY = "#6200EE";
const SECONDARY = "#03DAC6";
const BG = "#F5F5F5";
const SURFACE = "#FFFFFF";
const TEXT_PRIMARY = "#212121";
const TEXT_SECONDARY = "#757575";
const BORDER = "#E0E0E0";

const cleanNumber = (value) => {
    if (!value) return 0;

    let v = String(value).trim();

    // Retirer les espaces
    v = v.replace(/\s+/g, "");

    // Cas format anglo-saxon : 4,000.00
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) {
        v = v.replace(/,/g, ""); // => 4000.00
    }

    // Cas format européen : 4.000,00
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) {
        v = v.replace(/\./g, "").replace(",", "."); // => 4000.00
    }

    // Cas 4000,00
    if (v.includes(",") && !v.includes(".")) {
        v = v.replace(",", "."); // => 4000.00
    }

    // Supprimer tout ce qui n'est pas numérique/point
    v = v.replace(/[^0-9.]/g, "");

    return parseFloat(v) || 0;
};

const computeTotals = (lines) => {
    let untaxed = 0;
    let tva = 0;

    lines.forEach((line) => {
        const qty = cleanNumber(line.quantity ?? 1);
        const price = cleanNumber(line.unit_price ?? line.unitPrice ?? 0);
        const lineTotal = qty * price;
        untaxed += lineTotal;

        const taxRate = cleanNumber(line.tax_rate ?? line.taxRate ?? 0);
        if (taxRate > 0) {
            tva += lineTotal * (taxRate / 100);
        }
    });

    const total = untaxed + tva;
    return { untaxed, tva, total };
};

export default function InvoicePreview({ route, navigation }) {
    const { data,ip } = route.params || {};
    console.log("Données reçues :", data);

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>Aucune donnée de facture disponible</Text>
            </View>
        );
    }

    const [invoiceData, setInvoiceData] = useState(() => {
        const safe = data || {};
        return {
            invoice_number:
                safe.invoice_number || safe["Numéro de la facture"] || "",
            invoice_date:
                safe.invoice_date || safe["Date de la facture"] || "",
            due_date:
                safe.due_date || safe["Date d'échéance"] || "",
            reference: safe.reference || safe["Référence"] || "",
            payment_terms: safe.payment_terms || "",
            supplier: {
                name: safe.supplier?.name || safe["Fournisseur"] || "",
                street: safe.supplier?.street || "",
                city: safe.supplier?.city || "",
                country: safe.supplier?.country || "",
            },
            client: {
                name: safe.client?.name || safe["Client"] || "",
                street: safe.client?.street || "",
                city: safe.client?.city || "",
                country: safe.client?.country || "",
            },
            lines: Array.isArray(safe.lines)
                ? safe.lines.map((l) => ({
                    name: l.name || "",
                    description: l.description || "",
                    quantity: l.quantity ?? "1",
                    unit_price: l.unit_price ?? "",
                    tax_rate: l.tax_rate ?? "",
                }))
                : [],
        };
    });

    const totals = useMemo(
        () => computeTotals(invoiceData.lines || []),
        [invoiceData.lines]
    );

    const handleRootChange = (field, value) => {
        setInvoiceData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleNestedChange = (section, field, value) => {
        setInvoiceData((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    };

    const handleLineChange = (index, field, value) => {
        setInvoiceData((prev) => {
            const updated = [...(prev.lines || [])];
            updated[index] = {
                ...updated[index],
                [field]: value,
            };
            return { ...prev, lines: updated };
        });
    };

    const addLine = () => {
        setInvoiceData((prev) => ({
            ...prev,
            lines: [
                ...(prev.lines || []),
                {
                    name: "",
                    description: "",
                    quantity: "1",
                    unit_price: "",
                    tax_rate: "",
                },
            ],
        }));
    };

    const removeLine = (index) => {
        setInvoiceData((prev) => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index),
        }));
    };

    const formatMoney = (n) => {
        return `${n.toFixed(2)} DH`;
    };

    const createInvoiceInOdoo = async () => {
        try {
            // 🔥 Nettoyage des lignes AVANT envoi
            const cleanedLines = invoiceData.lines.map((l) => ({
                name: l.name,
                description: l.description,
                quantity: cleanNumber(l.quantity),
                unit_price: cleanNumber(l.unit_price),
                tax_rate: cleanNumber(l.tax_rate), // devient un nombre
            }));

            // 🔥 Nouveau payload propre
            const payload = {
                client: invoiceData.client?.name,
                supplier: invoiceData.supplier?.name,
                invoice_number: invoiceData.invoice_number,
                invoice_date: invoiceData.invoice_date,
                due_date: invoiceData.due_date,
                reference: invoiceData.reference,
                payment_terms: invoiceData.payment_terms,
                lines: cleanedLines,        // 👈 IMPORTANT !
                totals: {
                    untaxed: totals.untaxed,
                    tva: totals.tva,
                    total: totals.total,
                },
            };

            console.log("Payload envoyé à Odoo:", JSON.stringify(payload, null, 2));

            const res = await fetch(`http://${ip}:8069/api/invoice/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const textResponse = await res.text();
            console.log("Réponse brute du backend :", textResponse);

            try {
                const result = JSON.parse(textResponse);

                if (res.ok && result.success) {
                    Alert.alert("Succès", `Facture créée: ${result.data.name}`);
                    navigation.navigate("Main",{ip:ip})

                } else {
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
                <Text style={styles.screenTitle}>Prévisualisation de la facture</Text>

                {/* HEADER FACTURE */}
                <View style={styles.card}>
                    {invoiceData.invoice_number ? (
                        <Text style={styles.invoiceNumber}>
                            Facture {invoiceData.invoice_number}
                        </Text>
                    ) : null}
                    <View style={styles.row}>
                        {invoiceData.invoice_date ? (
                            <Text style={styles.metaText}>
                                Date : {invoiceData.invoice_date}
                            </Text>
                        ) : null}
                        {invoiceData.due_date ? (
                            <Text style={styles.metaText}>
                                Échéance : {invoiceData.due_date}
                            </Text>
                        ) : null}
                    </View>

                    {invoiceData.reference ? (
                        <Text style={styles.metaText}>
                            Référence : {invoiceData.reference}
                        </Text>
                    ) : null}

                    {invoiceData.payment_terms ? (
                        <Text style={styles.metaText}>
                            Conditions paiement : {invoiceData.payment_terms}
                        </Text>
                    ) : null}
                </View>

                {/* CLIENT / FOURNISSEUR */}
                <View style={styles.row}>

                    {/* CLIENT */}
                    <View style={[styles.card, styles.halfCard]}>
                        <Text style={styles.sectionTitle}>Client</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nom du client"
                            value={invoiceData.client.name}
                            onChangeText={(v) => handleNestedChange("client", "name", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Adresse"
                            value={invoiceData.client.street}
                            onChangeText={(v) => handleNestedChange("client", "street", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Ville"
                            value={invoiceData.client.city}
                            onChangeText={(v) => handleNestedChange("client", "city", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Pays"
                            value={invoiceData.client.country}
                            onChangeText={(v) => handleNestedChange("client", "country", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />
                    </View>

                    {/* FOURNISSEUR */}
                    <View style={[styles.card, styles.halfCard]}>
                        <Text style={styles.sectionTitle}>Fournisseur</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nom du fournisseur"
                            value={invoiceData.supplier.name}
                            onChangeText={(v) => handleNestedChange("supplier", "name", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Adresse"
                            value={invoiceData.supplier.street}
                            onChangeText={(v) => handleNestedChange("supplier", "street", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Ville"
                            value={invoiceData.supplier.city}
                            onChangeText={(v) => handleNestedChange("supplier", "city", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Pays"
                            value={invoiceData.supplier.country}
                            onChangeText={(v) => handleNestedChange("supplier", "country", v)}
                            multiline={true}
                            scrollEnabled={false}
                            textAlign="left"
                            textAlignVertical="top"
                        />
                    </View>

                </View>

                {/* LIGNES DE FACTURE */}
                <View style={styles.card}>
                    <View style={styles.linesHeader}>
                        <Text style={styles.sectionTitle}>Lignes de facture</Text>
                        <TouchableOpacity onPress={addLine}>
                            <Text style={styles.addLine}>+ Ajouter une ligne</Text>
                        </TouchableOpacity>
                    </View>

                    {invoiceData.lines && invoiceData.lines.length > 0 ? (
                        invoiceData.lines.map((line, index) => (
                            <View key={index} style={styles.lineCard}>
                                <View style={styles.lineHeader}>
                                    <Text style={styles.lineTitle}>
                                        Ligne {index + 1}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => removeLine(index)}
                                    >
                                        <Text style={styles.removeLine}>
                                            Supprimer
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Nom / Référence produit"
                                    value={line.name}
                                    onChangeText={(v) =>
                                        handleLineChange(index, "name", v)
                                    }
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Description"
                                    value={line.description}
                                    onChangeText={(v) =>
                                        handleLineChange(index, "description", v)
                                    }
                                />

                                <View style={styles.row}>
                                    <View style={styles.rowField}>
                                        <Text style={styles.label}>Quantité</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="1"
                                            keyboardType="numeric"
                                            value={String(line.quantity ?? "")}
                                            onChangeText={(v) =>
                                                handleLineChange(index, "quantity", v)
                                            }
                                        />
                                    </View>

                                    <View style={styles.rowField}>
                                        <Text style={styles.label}>
                                            Prix unitaire
                                        </Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0.00"
                                            keyboardType="numeric"
                                            value={String(line.unit_price ?? "")}
                                            onChangeText={(v) =>
                                                handleLineChange(
                                                    index,
                                                    "unit_price",
                                                    v
                                                )
                                            }
                                        />
                                    </View>

                                    <View style={styles.rowField}>
                                        <Text style={styles.label}>TVA (%)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={String(line.tax_rate ?? "")}
                                            onChangeText={(v) =>
                                                handleLineChange(
                                                    index,
                                                    "tax_rate",
                                                    v
                                                )
                                            }
                                        />
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>
                            Aucune ligne pour le moment. Ajoutez-en une.
                        </Text>
                    )}
                </View>

                {/* TOTAUX */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Totaux</Text>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalLabel}>Total HT</Text>
                        <Text style={styles.totalValue}>
                            {formatMoney(totals.untaxed)}
                        </Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalLabel}>TVA</Text>
                        <Text style={styles.totalValue}>
                            {formatMoney(totals.tva)}
                        </Text>
                    </View>
                    <View style={[styles.totalsRow, styles.totalRowStrong]}>
                        <Text style={styles.totalLabelStrong}>Total TTC</Text>
                        <Text style={styles.totalValueStrong}>
                            {formatMoney(totals.total)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={createInvoiceInOdoo}
                >
                    <Text style={styles.primaryButtonText}>
                        Créer la facture dans Odoo
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    safeArea: {
        flex: 1,
        padding: 16,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: TEXT_PRIMARY,
        marginBottom: 20,
        marginTop:40,
        alignItems: "center",
    },
    card: {
        backgroundColor: SURFACE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },
    halfCard: {
        flex: 1,
    },
    invoiceNumber: {
        fontSize: 18,
        fontWeight: "700",
        color: PRIMARY,
        marginBottom: 8,
    },
    metaText: {
        fontSize: 13,
        color: TEXT_SECONDARY,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: TEXT_PRIMARY,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: "#FAFAFA",
        color: TEXT_PRIMARY,
        marginBottom: 8,
    },
    linesHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    addLine: {
        color: PRIMARY,
        fontWeight: "600",
        fontSize: 13,
    },
    lineCard: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        padding: 10,
        marginTop: 10,
    },
    lineHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    lineTitle: {
        fontWeight: "600",
        fontSize: 14,
        color: TEXT_PRIMARY,
    },
    removeLine: {
        color: "#D32F2F",
        fontSize: 12,
        fontWeight: "600",
    },
    rowField: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: TEXT_SECONDARY,
        marginBottom: 2,
    },
    emptyText: {
        fontSize: 13,
        color: TEXT_SECONDARY,
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    totalLabel: {
        fontSize: 14,
        color: TEXT_SECONDARY,
    },
    totalValue: {
        fontSize: 14,
        color: TEXT_PRIMARY,
    },
    totalRowStrong: {
        borderTopWidth: 1,
        borderTopColor: BORDER,
        marginTop: 6,
        paddingTop: 6,
    },
    totalLabelStrong: {
        fontSize: 15,
        fontWeight: "700",
        color: TEXT_PRIMARY,
    },
    totalValueStrong: {
        fontSize: 15,
        fontWeight: "700",
        color: PRIMARY,
    },
    primaryButton: {
        marginTop: 8,
        marginBottom: 24,
        backgroundColor: PRIMARY,
        paddingVertical: 14,
        borderRadius: 999,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: BG,
    },
});

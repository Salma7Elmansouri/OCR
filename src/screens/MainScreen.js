import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from "react-native";

const PRIMARY = "#6200EE";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const SUB = "#6A6A6A";

export default function MainSelector({ navigation }) {
    const handleSelect = (type) => {
        if (type === "invoice") {
            navigation.navigate("Ocr", {
                mode: "invoice",
            });
        } else if (type === "po") {
            navigation.navigate("Ocr", {
                mode: "po",
            });
        } else if (type === "so") {
            navigation.navigate("Ocr", {
                mode: "so",
            });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sélection du document</Text>
            <Text style={styles.subtitle}>
                Choisissez le type de document que vous souhaitez scanner ou créer.
            </Text>

            <View style={styles.grid}>
                {/* FACTURE */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleSelect("invoice")}
                >

                    <Text style={styles.cardTitle}>Facture</Text>
                    <Text style={styles.cardText}>
                        Scanner et générer une facture automatiquement.
                    </Text>
                </TouchableOpacity>

                {/* PURCHASE ORDER */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleSelect("po")}
                >

                    <Text style={styles.cardTitle}>Bon d'achat (PO)</Text>
                    <Text style={styles.cardText}>
                        Scanner et créer un Purchase Order.
                    </Text>
                </TouchableOpacity>

                {/* SALES ORDER */}
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleSelect("so")}
                >

                    <Text style={styles.cardTitle}>Bon de vente (SO)</Text>
                    <Text style={styles.cardText}>
                        Scanner et créer un Sales Order.
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => navigation.replace("Login")}
            >
                <Text style={styles.logoutTxt}>Déconnexion</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
        padding: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: TEXT,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 14,
        color: SUB,
        marginBottom: 20,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    card: {
        width: "48%",
        backgroundColor: CARD,
        padding: 15,
        borderRadius: 14,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        alignItems: "center",
    },
    icon: {
        width: 60,
        height: 60,
        marginBottom: 10,
        tintColor: PRIMARY,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: TEXT,
        marginBottom: 6,
        textAlign: "center",
    },
    cardText: {
        fontSize: 13,
        color: SUB,
        textAlign: "center",
    },
    logoutBtn: {
        marginTop: 40,
        backgroundColor: PRIMARY,
        padding: 14,
        borderRadius: 999,
        alignItems: "center",
    },
    logoutTxt: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
});

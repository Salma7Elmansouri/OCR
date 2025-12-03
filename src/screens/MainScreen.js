import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PRIMARY = "#6200EE";
const BG = "#F5F5F5";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const SUB = "#6A6A6A";

export default function MainSelector({ route, navigation }) {
    const { ip,odooResponse } = route.params || {};
    console.log("Adresse IP récupérée : ", ip);


    const handleSelect = (type) => {
        if (type === "invoice") {
            navigation.navigate("Ocr", { mode: "invoice", ip: ip });
        } else if (type === "po") {
            navigation.navigate("Ocr", { mode: "po", ip: ip});
        } else if (type === "so") {
            navigation.navigate("Ocr", { mode: "so", ip: ip });
        }
    };

    const viewHistory = () => {
        navigation.navigate("History");
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../Utils/img.png')}
                    style={styles.logo}
                />
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate("Profil",{odooResponse})} style={styles.iconBtn}>
                        <MaterialCommunityIcons name="account" size={30} color={PRIMARY} />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.title}>Sélection du document</Text>
            <Text style={styles.subtitle}>Choisissez le type de document à scanner ou créer.</Text>

            <View style={styles.grid}>
                <TouchableOpacity style={styles.card} onPress={() => handleSelect("invoice")}>
                    <MaterialCommunityIcons name="file-document" size={50} color={PRIMARY} style={styles.icon} />
                    <Text style={styles.cardTitle}>Facture</Text>
                    <Text style={styles.cardText}>Scanner et générer une facture automatiquement.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => handleSelect("po")}>
                    <MaterialCommunityIcons name="clipboard-check" size={50} color={PRIMARY} style={styles.icon} />
                    <Text style={styles.cardTitle}>Bon d'achat (PO)</Text>
                    <Text style={styles.cardText}>Scanner et créer un Purchase Order.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => handleSelect("so")}>
                    <MaterialCommunityIcons name="clipboard-text" size={50} color={PRIMARY} style={styles.icon} />
                    <Text style={styles.cardTitle}>Bon de vente (SO)</Text>
                    <Text style={styles.cardText}>Scanner et créer un Sales Order.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={viewHistory}>
                    <MaterialCommunityIcons name="history" size={50} color={PRIMARY} style={styles.icon} />
                    <Text style={styles.cardTitle}>Historique</Text>
                    <Text style={styles.cardText}>Voir les fichiers scannés (Facture, PO, SO).</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace("Login")}>
                <Text style={styles.logoutTxt}>Déconnexion</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG, padding: 20 },
    logo: { width: 70, height: 70, resizeMode: 'contain', marginTop: 10 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15 },
    headerIcons: { flexDirection: "row", alignItems: "center" },
    iconBtn: { marginLeft: 15 },
    title: { fontSize: 28, fontWeight: "800", color: TEXT, marginTop: 20, textAlign: "center" },
    subtitle: { fontSize: 16, color: SUB, marginBottom: 30, textAlign: "center", fontWeight: "400" },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 30 },
    card: { width: "48%", backgroundColor: CARD, padding: 20, borderRadius: 12, marginBottom: 20, alignItems: "center", justifyContent: "center" },
    icon: { marginBottom: 15 },
    cardTitle: { fontSize: 18, fontWeight: "700", color: TEXT, marginBottom: 6, textAlign: "center" },
    cardText: { fontSize: 14, color: SUB, textAlign: "center" },
    logoutBtn: { marginTop: 30, backgroundColor: PRIMARY, padding: 15, borderRadius: 50, alignItems: "center", width: "100%" },
    logoutTxt: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

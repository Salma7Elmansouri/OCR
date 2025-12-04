import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PROFILE_BG = "#F9F9F9"; // Arrière-plan du profil
const TEXT_PRIMARY = "#212121";
const TEXT_SECONDARY = "#757575";
const PRIMARY = "#6200EE";  // Couleur principale
const BORDER_COLOR = "#E0E0E0";  // Couleur de la bordure

export default function ProfileScreen({ route, navigation }) {
    const { odooResponse } = route.params;  // Récupérer la réponse Odoo envoyée lors de la connexion

    const { name, username, partner_display_name, is_admin, company_id } = odooResponse;

    // Fonction de déconnexion (à adapter selon le besoin)
    const handleLogout = () => {
        Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
            { text: "Annuler", style: "cancel" },
            {
                text: "Déconnexion",
                onPress: () => {
                    // Redirige l'utilisateur vers l'écran de connexion
                    navigation.replace("Login");
                },
            },
        ]);
    };

    // Fonction pour afficher les informations de l'application
    const handleAbout = () => {
        Alert.alert(
            "À propos de l'application",
            "Cette application est sur un plan gratuit. Vous disposez de 300 requêtes AI par mois.\n\nPour plus de requêtes et d'autres fonctionnalités, souscrivez à notre plan payant.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Souscrire au plan payant",
                    onPress: () => Linking.openURL("https://huggingface.co/pricing")  // Lien vers la page de souscription
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* En-tête de l'utilisateur */}
            <View style={styles.profileHeader}>
                <Image
                    source={require('../Utils/img.png')} // Remplacez par l'image de profil réelle
                    style={styles.profileImage}
                />
                <Text style={styles.userName}>{name}</Text>
                <Text style={styles.userEmail}>{username}</Text>
            </View>

            {/* Détails du profil */}
            <View style={styles.profileDetails}>
                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="account-circle" size={28} color={PRIMARY} />
                    <View style={styles.textContainer}>
                        <Text style={styles.detailText}>Entreprise</Text>
                        <Text style={styles.detailValue}>{partner_display_name}</Text>
                    </View>
                </View>

                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="email" size={28} color={PRIMARY} />
                    <View style={styles.textContainer}>
                        <Text style={styles.detailText}>Email</Text>
                        <Text style={styles.detailValue}>{username}</Text>
                    </View>
                </View>

                <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="shield-lock" size={28} color={PRIMARY} />
                    <View style={styles.textContainer}>
                        <Text style={styles.detailText}>Rôle</Text>
                        <Text style={styles.detailValue}>{is_admin ? "Administrateur" : "Utilisateur"}</Text>
                    </View>
                </View>


            </View>

            {/* Bouton "A propos" */}
            <TouchableOpacity style={styles.aboutButton} onPress={handleAbout}>
                <Text style={styles.aboutButtonText}>A propos de l'application</Text>
            </TouchableOpacity>

            {/* Bouton de déconnexion */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PROFILE_BG,
        padding: 20,
    },
    profileHeader: {
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
        marginTop: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: PRIMARY,
        marginBottom: 15,
    },
    userName: {
        fontSize: 26,
        fontWeight: "700",
        color: TEXT_PRIMARY,
    },
    userEmail: {
        fontSize: 18,
        color: TEXT_SECONDARY,
    },

    // Détails du profil
    profileDetails: {
        marginTop: 30,  // Espacement ajouté en haut pour séparer des autres sections
        paddingBottom: 20, // Espacement pour séparer le bas du bloc
    },
    detailItem: {
        flexDirection: "row", // Alignement horizontal pour l'icône et le texte
        alignItems: "flex-start", // Alignement à gauche
        borderBottomWidth: 1, // Ligne séparatrice entre chaque élément
        borderColor: BORDER_COLOR,
        paddingVertical: 12, // Espacement vertical entre les lignes
    },
    textContainer: {
        marginLeft: 10, // Espacement entre l'icône et le texte
        flexDirection: "column", // Empilement vertical du titre et de la valeur
    },
    detailText: {
        fontSize: 16, // Taille de police réduite pour plus de clarté
        color: TEXT_PRIMARY,
        fontWeight: "500", // Un peu plus léger que le nom de l'utilisateur
        flexWrap: 'wrap', // Force un retour à la ligne si le texte dépasse
    },
    detailValue: {
        fontSize: 16, // Taille de police homogène
        color: TEXT_SECONDARY,
        fontWeight: "500", // Poids moyen pour une bonne lisibilité
    },

    // Bouton de déconnexion
    logoutButton: {
        backgroundColor: PRIMARY,
        paddingVertical: 14, // Un peu plus de padding pour le bouton
        paddingHorizontal: 40, // Plus large pour une meilleure interaction
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 30, // Un peu plus d'espacement du reste du contenu
        marginBottom: 15,
    },
    logoutButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },

    // Bouton A propos
    aboutButton: {
        backgroundColor: "#f1f1f1",
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 25,
        marginBottom: 15,
    },
    aboutButtonText: {
        color: PRIMARY,
        fontWeight: "700",
        fontSize: 16,
    },
});

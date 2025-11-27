import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { odooLogin } from "../Utils/odooApi"; // Assurez-vous que cette fonction est correctement configurée

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;

const handleFirebaseLogin = async () => {
    if (!email || !password) {
        Alert.alert("⚠️", "Please fill in both fields");
        return;
    }

    setLoading(true);
    try {
        // Authentification Firebase
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        console.log("Firebase login successful");

        // Authentification avec Odoo
        const odooResponse = await handleOdooLogin(user.email, password);

        if (odooResponse) {
            // Si l'authentification Odoo réussit, redirigez vers MainScreen
            navigation.replace("Main", { odooResponse });
        } else {
            // Si l'authentification Odoo échoue, afficher un message d'erreur
            Alert.alert("❌", "Odoo authentication failed. Please try again.");
        }
    } catch (error) {
        Alert.alert("❌", error.message); // Afficher l'erreur d'authentification Firebase ou Odoo
    } finally {
        setLoading(false);
    }
};

    // Odoo Authentication
const handleOdooLogin = async (email, password) => {
    try {
        console.log("Attempting Odoo login...");

        // Appel à la fonction odooLogin pour l'authentification
        const response = await odooLogin(email, password);

        // Vérifier si la réponse contient le résultat avec un `uid` (l'utilisateur authentifié)
        if (response && response.uid) {
            console.log("Odoo login successful", response);
            return response;  // Retourner la réponse complète
        } else {
            console.log("Odoo login failed: No valid response received");
            throw new Error("Odoo login failed: Invalid response");
        }
    } catch (error) {
        console.error("Odoo login error:", error);
        Alert.alert("❌", "Odoo login failed. Please check your credentials.");
        return null;  // Retourne null en cas d'erreur
    }
};

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#000" style={styles.icon} />
                <TextInput
                    placeholder="Email address"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />
            </View>

            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#000" style={styles.icon} />
                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleFirebaseLogin}>
                <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login with Firebase"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                <Text style={styles.createText}>
                    Don’t have an account? <Text style={styles.createLink}>Sign up</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fffbb78b",
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#000",
        borderRadius: 12,
        width: "100%",
        paddingHorizontal: 10,
        marginVertical: 8,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 12, fontSize: 16 },
    button: {
        backgroundColor: "#ffd700ff",
        borderColor: "#000",
        borderWidth: 1,
        padding: 15,
        width: "100%",
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: { fontWeight: "bold", color: "#000" },
    createText: { color: "#555", marginTop: 10 },
    createLink: { color: "#1E90FF", fontWeight: "bold" },
});

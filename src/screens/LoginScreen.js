import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Linking,
    Image,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { odooLogin } from "../Utils/odooApi"; // Assurez-vous que cette fonction est correctement configurée

const PRIMARY = "#6200EE"; // Couleur principale
const BG = "#F5F5F5"; // Fond clair
const SURFACE = "#FFFFFF"; // Surface blanche
const TEXT_PRIMARY = "#212121"; // Texte principal
const TEXT_SECONDARY = "#757575"; // Texte secondaire
const BUTTON_COLOR = "#6200EE"; // Couleur des boutons

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [ipAddress, setIpAddress] = useState("");  // Nouvel état pour l'adresse IP
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;

    const handleFirebaseLogin = async () => {
        if (!email || !password || !ipAddress) {  // Vérifiez si l'IP est également renseignée
            Alert.alert("⚠️", "Please fill in all fields (Email, Password, and IP Address)");
            return;
        }

        setLoading(true);
        try {
            // Authentification Firebase
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            console.log("Firebase login successful");

            // Authentification avec Odoo
            const odooResponse = await handleOdooLogin(user.email, password, ipAddress);  // Passez l'IP ici

            if (odooResponse) {
                // Si l'authentification Odoo réussit, redirigez vers MainScreen
                navigation.replace("Main", { odooResponse:odooResponse, ip: ipAddress });
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
    const handleOdooLogin = async (email, password, ipAddress) => {
        try {
            console.log("Attempting Odoo login...");

            // Appel à la fonction odooLogin pour l'authentification avec l'IP
            const response = await odooLogin(email, password, ipAddress);

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

    const handleOpenLink = () => {
        const url = "https://www.odoo.com/web/signup";
        Linking.openURL(url).catch((err) =>
            console.error("An error occurred while opening the link", err)
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"} // Ajuste le comportement du clavier selon la plateforme
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.innerContainer}>
                    <Image
                        source={require('../Utils/img.png')} // Remplacez ceci par le chemin de votre image locale ou un URL
                        style={styles.logo}
                    />
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="email-outline" size={20} color={TEXT_PRIMARY} style={styles.icon} />
                        <TextInput
                            placeholder="Email address"
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            placeholderTextColor={TEXT_SECONDARY}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="lock-outline" size={20} color={TEXT_PRIMARY} style={styles.icon} />
                        <TextInput
                            placeholder="Password"
                            secureTextEntry
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholderTextColor={TEXT_SECONDARY}
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="ip" size={20} color={TEXT_PRIMARY} style={styles.icon} />
                        <TextInput
                            placeholder="ex:192.168.1.1"
                            style={styles.input}
                            value={ipAddress}
                            onChangeText={setIpAddress}
                            keyboardType="default"
                            placeholderTextColor={TEXT_SECONDARY}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleFirebaseLogin}>
                        <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login "}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleOpenLink()}>
                        <Text style={styles.createText}>
                            Don’t have an account? <Text style={styles.createLink}>Create Odoo Account</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
        padding: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    innerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D1D1",
        borderRadius: 12,
        width: "100%",
        paddingHorizontal: 15,
        marginVertical: 10,
        backgroundColor: SURFACE,
    },
    icon: { marginRight: 12 },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: TEXT_PRIMARY,
    },
    button: {
        backgroundColor: BUTTON_COLOR,
        padding: 15,
        width: "100%",
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: {
        fontWeight: "bold",
        color: "#fff",
    },
    createText: {
        color: TEXT_SECONDARY,
        marginTop: 10,
        fontSize: 14,
    },
    createLink: {
        color: BUTTON_COLOR,
        fontWeight: "bold",
    },
    logo: {
        width: 220, // Largeur de l'image
        height: 220, // Hauteur de l'image
        resizeMode: 'contain',
        marginBottom: 60, // Adaptation de l'image à la taille
    },
});

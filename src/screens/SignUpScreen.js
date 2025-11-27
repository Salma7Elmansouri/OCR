import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUpScreen({ navigation }) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const auth = FIREBASE_AUTH;

    const handleSignUp = async () => {
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            Alert.alert("⚠️", "Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert("❌", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(user, { displayName: fullName });
            await setDoc(doc(FIREBASE_DB, "users", user.uid), {
                fullName,
                email,
                phone,
                createdAt: new Date().toISOString(),
            });

            Alert.alert("✅ Success", "Account created successfully!");
            navigation.navigate("LoginScreen");
        } catch (error) {
            console.error(error);
            Alert.alert("❌ Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account-outline" size={20} color="#000" style={styles.icon} />
                <TextInput placeholder="Full Name" style={styles.input} value={fullName} onChangeText={setFullName} />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#000" style={styles.icon} />
                <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="phone-outline" size={20} color="#000" style={styles.icon} />
                <TextInput placeholder="Phone Number" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#000" style={styles.icon} />
                <TextInput placeholder="Password" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color="#000" style={styles.icon} />
                <TextInput placeholder="Confirm Password" secureTextEntry style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? "Creating..." : "Sign Up"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.createText}>
                    Already have an account? <Text style={styles.createLink}>Sign In</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fffbb78b", padding: 20, alignItems: "center", justifyContent: "center" },
    inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#000", borderRadius: 12, width: "100%", paddingHorizontal: 10, marginVertical: 8 },
    icon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 12, fontSize: 16 },
    button: { backgroundColor: "#ffd700ff", borderColor: "#000", borderWidth: 1, padding: 15, width: "100%", borderRadius: 12, alignItems: "center", marginTop: 20 },
    buttonText: { fontWeight: "bold", color: "#000" },
    createText: { color: "#555", marginTop: 10 },
    createLink: { color: "#1E90FF", fontWeight: "bold" },
});

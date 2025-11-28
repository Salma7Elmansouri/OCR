import React, { useState } from "react";
import { View, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Button title="Autoriser la caméra" onPress={requestPermission} />
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef) return;

    try {
      const photo = await cameraRef.takePictureAsync({
        base64: true,
        quality: 0.4, // réduction taille = OCR plus efficace
      });

      navigation.navigate("Ocr", { base64: photo.base64 });
    } catch (err) {
      console.log("Erreur capture photo:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Bouton Scanner en haut */}
      <View style={styles.topButton}>
        <Button title="Scanner" onPress={takePicture} />
      </View>

      {/* Camera */}
      <CameraView
        style={styles.camera}
        ref={setCameraRef}
        flash="on"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  topButton: {
    position: "absolute",
    top: 40,
    zIndex: 10,
    alignSelf: "center",
  },

  camera: {
    flex: 1,
    width: "100%",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

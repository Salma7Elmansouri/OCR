import React, { useContext, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    SafeAreaView
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { HistoryContext } from "../Utils/HistoryContext";
import { Picker } from '@react-native-picker/picker';

// Couleurs pour les types
const TYPE_COLORS = {
    invoice: "#0D9488",
    po: "#2563EB",
    so: "#F97316",
    photo: "#9333EA"
};

export default function HistoryScreen() {
    const { history, removeFromHistory } = useContext(HistoryContext);
    const [filter, setFilter] = useState("all");
    const [zoomIndex, setZoomIndex] = useState(null);

    const handleDelete = (item) => {
        Alert.alert(
            "Suppression",
            "Voulez-vous supprimer cet élément ?",
            [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => removeFromHistory(item.date) }
            ]
        );
    };

    const filteredHistory =
        filter === "all" ? history : history.filter((item) => item.type === filter);

    const sortedHistory = [...filteredHistory].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    const images = sortedHistory.map((item) => ({ url: item.uri }));

    const renderItem = ({ item, index }) => (
        <View style={styles.card}>
            <TouchableOpacity onPress={() => setZoomIndex(index)}>
                <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
            </TouchableOpacity>

            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>

                <Text style={[styles.typeDate, { color: TYPE_COLORS[item.type] }]}>
                    {item.type.toUpperCase()} • {item.date ? new Date(item.date).toLocaleString() : ""}
                </Text>
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteText}>Supprimer</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>Historique des scans</Text>

                {/* Filtres */}
                <View style={styles.filterContainer}>
                    <Text style={styles.filterTitle}>Filtrer :</Text>

                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={filter}
                            onValueChange={(itemValue) => setFilter(itemValue)}
                            style={styles.picker}
                            dropdownIconColor="#2563EB"
                        >
                            <Picker.Item label="Tous" value="all" />
                            <Picker.Item label="Factures" value="invoice" />
                            <Picker.Item label="PO" value="po" />
                            <Picker.Item label="SO" value="so" />
                        </Picker>
                    </View>
                </View>

                {/* Vide */}
                {sortedHistory.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Aucun scan disponible</Text>
                    </View>
                ) : (
                    <FlatList
                        data={sortedHistory}
                        keyExtractor={(item, index) => item.uri || index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 25 }}
                    />
                )}

                {/* Zoom */}
                <Modal visible={zoomIndex !== null} transparent onRequestClose={() => setZoomIndex(null)}>
                    <ImageViewer
                        imageUrls={images}
                        index={zoomIndex || 0}
                        onCancel={() => setZoomIndex(null)}
                        enableSwipeDown
                        backgroundColor="#000"
                    />
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },

    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 50,
    },

    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 20,
    },

    // Filtres
    filterContainer: {
        marginBottom: 15,
    },

    filterTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },

    pickerWrapper: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 2,
    },

    picker: {
        height: 50,
        color: "#111827",
    },

    // Vide
    empty: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 40,
    },

    emptyText: {
        fontSize: 16,
        color: "#6B7280",
    },

    // Card
    card: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    image: {
        width: 75,
        height: 75,
        borderRadius: 12,
        marginRight: 15,
    },

    info: {
        flex: 1,
    },

    name: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },

    typeDate: {
        marginTop: 5,
        fontSize: 13,
        fontWeight: "500",
    },

    // Delete
    deleteBtn: {
        backgroundColor: "#EF4444",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
    },

    deleteText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 13,
    },
});

import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HistoryContext = createContext();

export const HistoryProvider = ({ children }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const stored = await AsyncStorage.getItem("scanHistory");
            if (stored) setHistory(JSON.parse(stored));
        } catch (e) {
            console.log("Erreur chargement historique :", e);
        }
    };

    const addToHistory = async (item) => {
        try {
            const updated = [item, ...history];
            setHistory(updated);
            await AsyncStorage.setItem("scanHistory", JSON.stringify(updated));
        } catch (e) {
            console.log("Erreur ajout historique :", e);
        }
    };

    const removeFromHistory = async (date) => {
        try {
            const updated = history.filter((item) => item.date !== date);
            setHistory(updated);
            await AsyncStorage.setItem("scanHistory", JSON.stringify(updated));
        } catch (e) {
            console.log("Erreur suppression historique :", e);
        }
    };

    return (
        <HistoryContext.Provider value={{ history, addToHistory, removeFromHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";

const MainScreen = ({ route, navigation }) => {
  const [odooResponse, setOdooResponse] = useState(null);

  const { odooResponse: initialResponse } = route.params || {};

  useEffect(() => {
    if (initialResponse) {
      setOdooResponse(initialResponse);
    } else {
      pingOdooApi(); // Tester l'API "ping" si aucune réponse initiale
    }
  }, []);

  const pingOdooApi = async () => {
    try {
      const response = await fetch("http://192.168.1.28:8069/api/ping", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      console.log("Ping Response: ", data);
      setOdooResponse(data); // Sauvegarder la réponse dans l'état
    } catch (error) {
      console.error("Error pinging Odoo API:", error);
    }
  };

  const createInvoice = async () => {
    const invoiceData = {
      partner_id: 3, // ID du partenaire dans Odoo
      move_type: "out_invoice",
      invoice_date: "2025-11-24",
      lines: [
        {
          name: "Produit A",
          quantity: 2,
          price_unit: 100,
          account_id: 1,
          tax_ids: [1, 2],
        },
      ],
    };

    try {
      const response = await fetch("http://192.168.1.28:8069/api/invoice/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });
      const data = await response.json();
      console.log("Invoice Creation Response: ", data);
      setOdooResponse(data); // Mettre à jour la réponse affichée
    } catch (error) {
      console.error("Error creating invoice:", error);
    }
  };

  const createSaleOrder = async () => {
    const saleOrderData = {
      partner_id: 3,
      date_order: "2025-11-24",
      lines: [
        {
          product_id: 1,
          quantity: 2,
          price_unit: 100,
          name: "Produit A",
        },
      ],
    };

    try {
      const response = await fetch("http://192.168.1.28:8069/api/so/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleOrderData),
      });
      const data = await response.json();
      console.log("Sale Order Creation Response: ", data);
      setOdooResponse(data); // Mettre à jour la réponse affichée
    } catch (error) {
      console.error("Error creating sale order:", error);
    }
  };

  const createPurchaseOrder = async () => {
    const purchaseOrderData = {
      partner_id: 5,
      date_order: "2025-11-24",
      lines: [
        {
          product_id: 2,
          quantity: 5,
          price_unit: 50,
          name: "Produit achat",
        },
      ],
    };

    try {
      const response = await fetch("http://192.168.1.28:8069/api/po/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseOrderData),
      });
      const data = await response.json();
      console.log("Purchase Order Creation Response: ", data);
      setOdooResponse(data); // Mettre à jour la réponse affichée
    } catch (error) {
      console.error("Error creating purchase order:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Bienvenue sur la page principale !</Text>

      <Button
        title="Créer une facture"
        onPress={createInvoice}
      />
      <Button
        title="Créer un ordre de vente"
        onPress={createSaleOrder}
      />
      <Button
        title="Créer un ordre d'achat"
        onPress={createPurchaseOrder}
      />
      <Button
        title="Déconnexion"
        onPress={() => {
          // FirebaseAuth.signOut(); (si vous avez Firebase intégré)
          navigation.replace("Login"); // Rediriger vers la page de connexion après déconnexion
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fffbb78b",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  responseText: {
    fontSize: 16,
    color: "#333",
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    textAlign: "center",
  },
});

export default MainScreen;

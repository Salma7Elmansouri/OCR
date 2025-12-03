const ODOO_URL = "http://192.168.1.82:8069"; // Default URL, but we will modify it dynamically based on IP
const DB = "db"; // Nom de la base de données Odoo

// Fonction pour faire des requêtes JSON-RPC vers Odoo
async function jsonRpc(path, params, ip) {
    try {
        const url = `http://${ip}:8069${path}`; // URL dynamique avec IP
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params,
                id: Date.now(),
            }),
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        if (data.error) {
            console.error("Odoo Error:", data.error);
            throw new Error(data.error.message);
        }

        return data.result;
    } catch (error) {
        console.error("Error making request to Odoo:", error);
        throw error;
    }
}

// Authentification avec Odoo
export async function odooLogin(email, password, ip) {
    try {
        const result = await jsonRpc("/web/session/authenticate", {
            db: DB,
            login: email,
            password: password,
        }, ip);
        return result;
    } catch (error) {
        console.error("Odoo login failed:", error);
        throw new Error("Odoo login failed: " + error.message);
    }
}

// Exemple de fonction pour lire un modèle avec des critères
export async function odooSearchRead(model, domain = [], fields = [], ip) {
    return jsonRpc("/web/dataset/search_read", {
        model,
        domain,
        fields,
        limit: 10,
    }, ip);
}

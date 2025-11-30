const ODOO_URL = "http://100.93.99.20:8069"; // URL de votre serveur Odoo
const DB = "db"; // Nom de la base de données Odoo

async function jsonRpc(path, params) {
    try {
        const response = await fetch(`${ODOO_URL}${path}`, {
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

        return data.result;  // Assurez-vous que la réponse renvoie `result`
    } catch (error) {
        console.error("Error making request to Odoo:", error);
        throw error;
    }
}

// Authentification avec Odoo
export async function odooLogin(email, password) {
    try {
        // Assurez-vous que le paramètre 'db' est correct
        const result = await jsonRpc("/web/session/authenticate", {
            db: DB,
            login: email,
            password: password,
        });
        return result;  // Retourner la réponse complète de l'API Odoo
    } catch (error) {
        console.error("Odoo login failed:", error);
        throw new Error("Odoo login failed: " + error.message);
    }
}

export async function odooSearchRead(model, domain = [], fields = []) {
    return jsonRpc("/web/dataset/search_read", {
        model,
        domain,
        fields,
        limit: 10,
    });
}

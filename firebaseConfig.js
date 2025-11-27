import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB7HJjP8FAe0br4diQK-0I0oWIZSl5M_3E",
    authDomain: "ocr-odoo-e1df8.firebaseapp.com",
    projectId: "ocr-odoo-e1df8",
    storageBucket: "ocr-odoo-e1df8.firebasestorage.app",
    messagingSenderId: "301127147338",
    appId: "1:301127147338:web:7a6080a15004c14f366bb3"
};

export const FIREBASE_APP = initializeApp(firebaseConfig);

initializeFirestore(FIREBASE_APP, {
    experimentalForceLongPolling: true,
    useFetchStreams: true,
});

export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
export const FIREBASE_DB = getFirestore(FIREBASE_APP);

// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAkN-mKVXj-Rjl0EcFzF0QZC-O8Uyghzq4",
  authDomain: "pki-f24b2.firebaseapp.com",
  projectId: "pki-f24b2",
  storageBucket: "pki-f24b2.firebasestorage.app",
  messagingSenderId: "906137473",
  appId: "1:906137473:web:cd84fb2a300da484e1a280",
  measurementId: "G-N3RW637EBW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Use region if you deployed functions to a region other than default
// export const functions = getFunctions(app, "asia-south1"); 
export default app;

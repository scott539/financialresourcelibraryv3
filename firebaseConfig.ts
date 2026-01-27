
// Initialize Firebase services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- PROJECT CONFIG: BP Money Resources ---
const firebaseConfig = {
  apiKey: "AIzaSyDFSAWofsCaT-EhU42yQn72Zkgv67X6bHA",
  authDomain: "bp-money-resources.firebaseapp.com",
  projectId: "bp-money-resources",
  storageBucket: "bp-money-resources.firebasestorage.app",
  messagingSenderId: "272224588349",
  appId: "1:272224588349:web:6e7afaa4102ce1de679054",
  measurementId: "G-KHYCEEZ2XP"
};
// -----------------------------------------

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Explicitly providing the bucket URL to ensure it connects to the one we configured with CORS
export const storage = getStorage(app, "gs://bp-money-resources.firebasestorage.app");

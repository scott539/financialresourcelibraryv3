
// Initialize Firebase services
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- UPDATED TO MATCH YOUR PROJECT: BP Money Resources ---
const firebaseConfig = {
  apiKey: "AIzaSyDFSAWofsCaT-EhU42yQn72Zkgv67X6bHA",
  authDomain: "bp-money-resources.firebaseapp.com",
  projectId: "bp-money-resources",
  storageBucket: "bp-money-resources.firebasestorage.app",
  messagingSenderId: "272224588349",
  appId: "1:272224588349:web:6e7afaa4102ce1de679054",
  measurementId: "G-KHYCEEZ2XP"
};
// ---------------------------------------------------------

const app = initializeApp(firebaseConfig);

// We do not initialize Analytics here because it requires the Installations API 
// to be enabled in Google Cloud, which is currently causing your 403 error.
// The app will function perfectly without it.

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

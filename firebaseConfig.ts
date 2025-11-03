// IMPORTANT: Replace the placeholder values below with your own Firebase project configuration.

// How to find your Firebase config:
// 1. Go to your Firebase project in the Firebase Console: https://console.firebase.google.com/
// 2. In the left-hand menu, click the gear icon next to "Project Overview", then select "Project settings".
// 3. In the "General" tab, scroll down to the "Your apps" section.
// 4. If you haven't created a web app yet, click the web icon (</>) to add one.
// 5. In the app's settings, find the "Firebase SDK snippet" section and select "Config".
// 6. Copy the firebaseConfig object and paste it here, replacing the placeholder object below.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// --- PASTE YOUR FIREBASE CONFIG OBJECT BELOW ---
const firebaseConfig = {
  apiKey: "AIzaSyDFSAWofsCaT-EhU42yQn72Zkgv67X6bHA",
  authDomain: "bp-money-resources.firebaseapp.com",
  projectId: "bp-money-resources",
  storageBucket: "bp-money-resources.firebasestorage.app",
  messagingSenderId: "272224588349",
  appId: "1:272224588349:web:6e7afaa4102ce1de679054",
  measurementId: "G-KHYCEEZ2XP"
};
// ---------------------------------------------


// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const analytics = getAnalytics(app);
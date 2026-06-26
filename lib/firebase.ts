import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase config. These NEXT_PUBLIC_ values are safe to expose in the client
// (Firestore is secured by its security rules, not by hiding the config).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDLxe4w7Tf1Y1TdRVM_JTtSPbnjhfi1dR4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "waitlist-for-nichespy.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "waitlist-for-nichespy",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "waitlist-for-nichespy.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "377269725115",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:377269725115:web:8e0de8890c430d2183869e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-GT800L35S3",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

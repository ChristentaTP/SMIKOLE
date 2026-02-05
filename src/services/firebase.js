// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDBN3EObs6BgYA_YkpBIvCTi7GnH7brqXQ",
  authDomain: "smikole-75926.firebaseapp.com",
  projectId: "smikole-75926",
  storageBucket: "smikole-75926.firebasestorage.app",
  messagingSenderId: "55977556270",
  appId: "1:55977556270:web:8a511c1573d84d3292e2bf",
  measurementId: "G-WK1344BJSN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
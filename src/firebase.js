import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBotuOL6StgIVaqtNzQ-ZdaNcdbc0ytFLE",
  authDomain: "jhin-stats.firebaseapp.com",
  projectId: "jhin-stats",
  storageBucket: "jhin-stats.firebasestorage.app",
  messagingSenderId: "741209159374",
  appId: "1:741209159374:web:685d232d6bc2599ba7829f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
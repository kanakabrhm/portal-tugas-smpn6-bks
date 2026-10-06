import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCpDgF2mC9n6aT3RUWANXNj0-hh7Ud_eLw",
  authDomain: "portal-tugas-ff747.firebaseapp.com",
  projectId: "portal-tugas-ff747",
  storageBucket: "portal-tugas-ff747.firebasestorage.app",
  messagingSenderId: "879700967156",
  appId: "1:879700967156:web:171ee92229c8cd5442e8a1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

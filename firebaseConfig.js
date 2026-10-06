import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "PROJECT_ID_KAMU.firebaseapp.com",
  projectId: "PROJECT_ID_KAMU",
  storageBucket: "PROJECT_ID_KAMU.appspot.com",
  messagingSenderId: "SENDER_ID_KAMU",
  appId: "APP_ID_KAMU"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

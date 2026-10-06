import { auth, googleProvider } from "./firebaseConfig";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

// 1. Login dengan Google
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Login Google Berhasil:", user);
    return user;
  } catch (error) {
    console.error("Gagal Login Google:", error.message);
  }
};

// 2. Login dengan Email & Password
export const loginWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login Email Berhasil:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Gagal Login Email:", error.message);
  }
};

// 3. Register Akun Baru dengan Email & Password
export const registerWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Registrasi Berhasil:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Gagal Registrasi:", error.message);
  }
};

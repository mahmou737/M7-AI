import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzTdm4I6N0l9R4avIN3ur4MMlXyLSRGV8",
  authDomain: "m7-ai-1e429.firebaseapp.com",
  projectId: "m7-ai-1e429",
  storageBucket: "m7-ai-1e429.firebasestorage.app",
  messagingSenderId: "664017433881",
  appId: "1:664017433881:web:f2e587891eb6b3df238188",
  measurementId: "G-7D8Q43FBQQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── Auth helpers ─────────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  // Save profile in Firestore
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    displayName,
    email,
    photoURL: null,
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string }
) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, data);
  }
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export { onAuthStateChanged };
export type { User };

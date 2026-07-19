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
  // Step 1: Create the Firebase Auth account (throws on any auth error)
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Step 2: Set display name — best effort, never blocks login
  try {
    await updateProfile(credential.user, { displayName });
  } catch (e) {
    console.warn("[M7] updateProfile failed:", e);
  }

  // Step 3: Save profile to Firestore — best effort
  // If Firestore isn't enabled yet the user is still created & logged in
  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      displayName,
      email,
      photoURL: null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[M7] Firestore profile save failed (Firestore may not be enabled):", e);
  }

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

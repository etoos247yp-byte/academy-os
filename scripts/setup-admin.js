/**
 * Setup Script: Create First Superadmin
 * 
 * This script creates the first superadmin account.
 * Run this once after deploying your Firebase project.
 * 
 * Prerequisites:
 * 1. Enable Email/Password authentication in Firebase Console
 * 2. Create Firestore database in Firebase Console
 * 3. Update the Firebase config below
 * 
 * Usage:
 * node scripts/setup-admin.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB23mMxoSfdP8DoOQKFPnPHXYUyeTb-HTY",
  authDomain: "student-scheduler-fcdc1.firebaseapp.com",
  projectId: "student-scheduler-fcdc1",
  storageBucket: "student-scheduler-fcdc1.firebasestorage.app",
  messagingSenderId: "974885722668",
  appId: "1:974885722668:web:d0d7e8d9d8d3bb19e34f89"
};

// Admin credentials
const ADMIN_EMAIL = "admin@academy.local";
const ADMIN_PASSWORD = "etoos0247!!";
const ADMIN_NAME = "관리자";

async function setupAdmin() {
  console.log("🚀 Starting admin setup...\n");

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log("📦 Firebase initialized");

    // Create auth user
    console.log("👤 Creating admin user...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );

    console.log(`✅ Auth user created: ${userCredential.user.uid}`);

    // Create admin document in Firestore
    console.log("📝 Creating admin document in Firestore...");
    await setDoc(doc(db, "admins", userCredential.user.uid), {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "superadmin",
      createdAt: serverTimestamp(),
      invitedBy: null,
    });

    console.log("✅ Admin document created");

    console.log("\n========================================");
    console.log("🎉 Setup Complete!");
    console.log("========================================");
    console.log(`\nAdmin Login Credentials:`);
    console.log(`  ID: admin`);
    console.log(`  Password: etoos0247!!`);
    console.log(`\nYou can now login at: /admin`);
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("\n⚠️  Admin user already exists!");
      console.log("If you need to reset, delete the user from Firebase Console first.");
    } else {
      console.error("\n❌ Setup failed:", error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

setupAdmin();

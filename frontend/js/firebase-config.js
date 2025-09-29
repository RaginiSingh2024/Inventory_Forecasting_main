// Firebase Configuration for Inventory Forecasting App
// Replace with your actual Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyDSprraOBsOLmYZzaPOuxwe1QgQZ0KfzSw",
    authDomain: "inventory-forecasting-d406b.firebaseapp.com",
    projectId: "inventory-forecasting-d406b",
    storageBucket: "inventory-forecasting-d406b.firebasestorage.app",
    messagingSenderId: "701346681771",
    appId: "1:701346681771:web:667cd682bd2066b574f8ee",
    measurementId: "G-3J8VRCVJF6"
  };
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Make services available globally
window.auth = auth;
window.db = db;

console.log('Firebase initialized - Real-time authentication ready!');

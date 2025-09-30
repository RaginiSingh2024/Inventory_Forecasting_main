// Firebase Configuration for Inventory Forecasting App
// Replace with your actual Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyBmO8LdvQ9_R22c4KUxxiMQg0YO9j06ZOc",
  authDomain: "inventory---forecast.firebaseapp.com",
  projectId: "inventory---forecast",
  storageBucket: "inventory---forecast.firebasestorage.app",
  messagingSenderId: "368692153179",
  appId: "1:368692153179:web:eeb23b5b2b73415d26287e",
  measurementId: "G-DR4HGRKJWW"
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

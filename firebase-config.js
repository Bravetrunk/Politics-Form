// Import Firebase modules
import { initializeApp } from '<https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js>';
import { getDatabase } from '<https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js>';

// Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    databaseURL: "your-database-url",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export
export const database = getDatabase(app);

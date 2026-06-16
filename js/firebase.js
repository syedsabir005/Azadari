import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBx-9rgrDRNGs0AXptg2sofS64AxxGL8yI",
  authDomain: "azadari-ff6a1.firebaseapp.com",
  projectId: "azadari-ff6a1",
  storageBucket: "azadari-ff6a1.firebasestorage.app",
  messagingSenderId: "173522237755",
  appId: "1:173522237755:web:96081bb9d0fa82c66bdf1e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
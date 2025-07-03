// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  updateProfile,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTHXyQZhPriaPwHjfGTXrE8i_SBMcQus4",
  authDomain: "web--webshop-project.firebaseapp.com",
  projectId: "web--webshop-project",
  storageBucket: "web--webshop-project.firebasestorage.app",
  messagingSenderId: "331524748182",
  appId: "1:331524748182:web:f8b9874cd84a03ac65a3b7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

//Button
document.getElementById("register-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }
    if(name.trim()===""){
        alert("Please enter your name.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Registration successful!");
            console.log("User registered:", userCredential.user);
            // Update user profile with name
            return updateProfile(userCredential.user, {
                displayName: name,
            });
        })
        .then(() => {
            window.location.href = "index.html"; 
        })
        .catch((error) => {
            console.error("Error during registration:" + error.message);
            alert(error.message);
        });
});
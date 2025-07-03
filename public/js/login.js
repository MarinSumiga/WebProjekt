// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
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


// Function to display Bootstrap alerts
function showAlert(message, type) {
  const alertContainer = document.getElementById("alert-container");
  alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
  `;
}

//Button
const loginButton = document.getElementById("login-button");
loginButton.addEventListener("click", function (event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert("Please fill in all fields.", "danger");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user;
      showAlert("User registered" , "success");
      setTimeout(() => {
        window.location.href = "/";
      }, 2000); 
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      showAlert(error.message, "danger");
    });
});

// Google login
const googleLoginButton = document.getElementById("google-login-button");
googleLoginButton.addEventListener("click", function (event) {
  event.preventDefault();

  const provider = new GoogleAuthProvider();

  signInWithPopup(auth, provider)
    .then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      const user = result.user;
      showAlert("User registered" + user , "success");
      window.location.href = "/";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      showAlert("Google login failed: " + errorMessage, "danger");
    });
});
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase inicijalizacija
const firebaseConfig = {
  apiKey: "AIzaSyDTHXyQZhPriaPwHjfGTXrE8i_SBMcQus4",
  authDomain: "web--webshop-project.firebaseapp.com",
  projectId: "web--webshop-project",
  storageBucket: "web--webshop-project.firebasestorage.app",
  messagingSenderId: "331524748182",
  appId: "1:331524748182:web:f8b9874cd84a03ac65a3b7",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utility funkcija za dohvaćanje imena korisnika
const getDisplayName = (user, userData) => {
  return userData?.displayName || user.displayName || (user.email ? user.email.split('@')[0] : 'Korisnik');
};

// Dohvati dodatne podatke korisnika iz Firestore
const fetchUserData = async (uid) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Greška pri dohvaćanju korisničkih podataka:', error);
    return null;
  }
};

// Funkcija za animaciju mijenjanja teksta
const animateTextChange = (element, newText) => {
  if (element) {
    element.style.transition = 'opacity 0.3s ease';
    element.style.opacity = '0';
    setTimeout(() => {
      element.innerHTML = newText;
      element.style.opacity = '1';
    }, 300);
  }
};

// Funkcija za odjavu
const handleLogout = async () => {
  try {
    await signOut(auth);
    window.location.href = '/';
  } catch (error) {
    console.error('Greška pri odjavi:', error);
  }
};

// Prikaz loading stanja za navbar
const showNavbarLoading = () => {
  const navLinks = document.getElementById('nav-links');
  if (navLinks) {
    navLinks.innerHTML = `<li class="nav-item"><span class="nav-link text-light">Učitavanje...</span></li>`;
  }
};

// Prikaz navbara s dodatnim korisničkim podacima
const updateNavbar = async (user) => {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (user) {
    const userData = await fetchUserData(user.uid);
    const displayName = getDisplayName(user, userData);
    navLinks.innerHTML = `
      <li class="nav-item">
        <a class="nav-link nav-link-animated text-light disabled" tabindex="-1">Pozdrav, ${displayName}</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated text-light" href="/ads">Oglasi</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated text-light" href="/profile">Profil</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated text-light" href="/create-ad">Objavi Oglas</a>
      </li>
      <li class="nav-item">
        <button class="nav-link nav-link-animated btn btn-outline-danger ms-2 px-3" id="logout-btn" type="button">Odjava</button>
      </li>
    `;
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  } else {
    navLinks.innerHTML = `
      <li class="nav-item">
        <a class="nav-link nav-link-animated active fw-semibold text-light" href="/">Početna</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated text-light" href="/ads">Oglasi</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated btn btn-outline-primary ms-2 px-3" href="/login">Prijava</a>
      </li>
      <li class="nav-item">
        <a class="nav-link nav-link-animated btn btn-outline-success ms-2 px-3" href="/register">Registracija</a>
      </li>
    `;
  }
};

// Funkcija za ažuriranje hero sekcije
const updateHeroSection = async (user) => {
  const heroText = document.getElementById('hero-text');
  const heroDescription = document.getElementById('hero-description');
  const heroCta = document.getElementById('hero-cta');

  if (heroText && heroDescription && heroCta) {
    if (user) {
      const userData = await fetchUserData(user.uid);
      const displayName = getDisplayName(user, userData);
      animateTextChange(heroText, `Dobrodošli, ${displayName}!`);
      animateTextChange(heroDescription, `Lijepo vas je ponovno vidjeti.`);
      heroCta.innerHTML = `Moji oglasi`;
      heroCta.href = `/profile`;
      heroCta.className = `btn btn-outline-warning btn-lg`;
    } else {
      animateTextChange(heroText, `Dobrodošli u Web Shop`);
      animateTextChange(heroDescription, `Vaša destinacija za kvalitetne proizvode.`);
      heroCta.innerHTML = `Prijavi se`;
      heroCta.href = `/login`;
      heroCta.className = `btn btn-outline-light btn-lg`;
    }
  }
};

// Glavna inicijalizacija
document.addEventListener('DOMContentLoaded', () => {
  showNavbarLoading();
  onAuthStateChanged(auth, async (user) => {
    await updateNavbar(user);
    await updateHeroSection(user);
  });
});

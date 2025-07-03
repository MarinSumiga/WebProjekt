import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const getLocationBtn = document.getElementById('getLocationBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const createAdForm = document.getElementById('createAdForm');
  const publishBtn = document.getElementById('publishBtn');

  // Ograničenje na 3 slike
  imageInput.addEventListener('change', (e) => {
    imagePreview.innerHTML = '';
    const files = Array.from(e.target.files).slice(0, 3);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.className = 'preview-img';
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Dohvaćanje lokacije
  getLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          // Simulacija Geocoder-a (treba API za stvarnu adresu)
          document.getElementById('locationInput').value = `Lat: ${lat}, Lon: ${lon}`;
        },
        (error) => {
          alert('Nije moguće dohvatiti lokaciju. Provjerite dozvole.');
        }
      );
    } else {
      alert('Vaš preglednik ne podržava geolokaciju.');
    }
  });

  // Odustani gumb
  cancelBtn.addEventListener('click', () => {
    window.history.back();
  });

  // Objavi oglas
  createAdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Objavljivanje...';

    const formData = new FormData(createAdForm);
    const adData = {
      title: formData.get('titleInput'),
      description: formData.get('descriptionInput'),
      price: parseFloat(formData.get('priceInput')),
      requesterId:null,
      currency: formData.get('currencySelect'),
      category: formData.get('categorySelect'),
      condition: formData.get('conditionSelect'),
      location: formData.get('locationInput'),
      contactPhone: formData.get('phoneInput'),
      imageUrls: [],
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      userId: auth.currentUser ? auth.currentUser.uid : null
    };

    try {
      // Provjera autentifikacije
      if (!auth.currentUser) {
        throw new Error('Korisnik nije prijavljen.');
      }

      // Upload slika ako postoje
      const files = Array.from(imageInput.files).slice(0, 3);
      if (files.length > 0) {
        for (const file of files) {
          const storageRef = ref(storage, `ads/${auth.currentUser.uid}/${Date.now()}-${file.name}`);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          adData.imageUrls.push(downloadURL);
        }
      }

      // Spremanje oglasa u Firestore
      const docRef = await addDoc(collection(db, 'ads'), adData);
      console.log('Oglas uspješno objavljen s ID-om:', docRef.id);
      alert('Oglas je uspješno objavljen!');
      window.location.href = '/profile';
    } catch (error) {
      console.error('Greška pri objavi oglasa:', error);
      alert('Došlo je do greške pri objavi oglasa.');
    } finally {
      publishBtn.disabled = false;
      publishBtn.innerHTML = 'Objavi Oglas';
    }
  });

  // Provjera autentifikacije prilikom učitavanja stranice
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = '/login';
    }
  });
});

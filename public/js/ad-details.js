// Potrebno je imati Firebase importove na vrhu
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js"; // Import za updateDoc

// Tvoja Firebase konfiguracija
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
const db = getFirestore(app); // Inicijalizacija Firestore-a


document.addEventListener('DOMContentLoaded', () => {
    const adDetailsContainer = document.getElementById('ad-details-container');
    const params = new URLSearchParams(window.location.search);
    const adId = params.get('id');

    if (!adId) {
        adDetailsContainer.innerHTML = '<div class="alert alert-danger text-center">Greška: ID oglasa nije naveden.</div>';
        return;
    }

    // Ispravna logika: Čeka se status korisnika, a zatim se dohvaća oglas
    onAuthStateChanged(auth, (user) => {
        fetchAndDisplayAd(user);
    });

    // --- NOVA FUNKCIJA ZA SLANJE ZAHTJEVA ---
    async function handleRequestAd(ad, buyer) {
        const requestButton = document.getElementById('request-btn');
        if (!requestButton) return;

        requestButton.disabled = true;
        requestButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Slanje zahtjeva...';

        try {
            // Ažuriranje statusa i requesterId-ja direktno na backendu
            const response = await fetch(`/api/ads/${ad.id}/request`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: buyer.uid })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Slanje zahtjeva nije uspjelo.');
            }
            
            // Nakon uspješnog zahtjeva, ponovno dohvati i prikaži oglas
            // kako bi se UI ispravno ažurirao (npr. gumb će sada biti "Zahtjev poslan")
            fetchAndDisplayAd(buyer);

        } catch (error) {
            console.error('Greška pri slanju zahtjeva:', error);
            requestButton.classList.replace('btn-primary', 'btn-danger');
            requestButton.innerHTML = 'Greška';
            // Omogući gumb nakon kratke pauze da korisnik vidi poruku
            setTimeout(() => {
                requestButton.disabled = false;
                requestButton.classList.replace('btn-danger', 'btn-primary');
                requestButton.innerHTML = '<i class="bi bi-patch-check-fill me-2"></i> Zatraži proizvod';
            }, 3000);
        }
    }

    // --- FUNKCIJA ZA PRIKAZ DETALJA (KOMPLETIRANA I POBOLJŠANA) ---
function displayAdDetails(ad, currentUser) {
    // 1. Mapiranje vrijednosti za bolji prikaz (npr. 'USED' -> 'Korišteno')
    const conditionMap = { 'NEW': 'Novo', 'LIKE_NEW': 'Kao novo', 'USED': 'Korišteno' };
    const conditionText = conditionMap[ad.condition] || 'Korišteno'; // Postavi 'Korišteno' kao default
    
    // Formatiranje kategorije (npr. 'HOME_GARDEN' -> 'Home & Garden')
    const categoryText = ad.category ? ad.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Nije navedeno';

    // 2. POBOLJŠANA GALERIJA SLIKA: Glavna slika u karuselu + thumbnailovi ispod
    const imagesCarousel = ad.imageUrls && ad.imageUrls.length > 0 
        ? `
            <!-- Glavni karusel za slike -->
            <div id="adImageCarousel" class="carousel slide mb-3 shadow-lg rounded" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${ad.imageUrls.map((url, index) => `
                        <div class="carousel-item ${index === 0 ? 'active' : ''}">
                            <img src="${url}" class="d-block w-100 ad-details-img" alt="Slika oglasa ${index + 1}">
                        </div>
                    `).join('')}
                </div>
                
                <!-- Gumbi za navigaciju (samo ako ima više od jedne slike) -->
                ${ad.imageUrls.length > 1 ? `
                    <button class="carousel-control-prev" type="button" data-bs-target="#adImageCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Prethodna</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#adImageCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Sljedeća</span>
                    </button>
                ` : ''}
            </div>

            <!-- Thumbnailovi za brzu navigaciju (samo ako ima više od jedne slike) -->
            ${ad.imageUrls.length > 1 ? `
                <div class="d-flex justify-content-center flex-wrap thumbnail-container">
                    ${ad.imageUrls.map((url, index) => `
                        <img src="${url}" class="ad-thumbnail img-fluid rounded m-1 ${index === 0 ? 'active' : ''}" 
                             data-bs-target="#adImageCarousel" data-bs-slide-to="${index}" 
                             alt="Thumbnail ${index + 1}">
                    `).join('')}
                </div>
            ` : ''}
        `
        // Ako nema slika, prikaži placeholder
        : '<img src="https://placehold.co/800x600/2a2a2a/777?text=Nema+slike" class="img-fluid rounded mb-4" alt="Nema slike">';

    // 3. DINAMIČKI GUMBI OVISNO O VLASNIŠTVU OGLASA
    let actionButtonsHTML = '';
    const isOwner = currentUser && ad.userId && currentUser.uid === ad.userId;

    if (isOwner) {
        // Vlasnik vidi gumbe za uređivanje i brisanje
        actionButtonsHTML = `
            <h5 class="mt-4">Upravljanje oglasom</h5>
            <div class="d-grid gap-2">
                 <div class="alert alert-info mt-4 text-center">
                    <i class="bi bi-info-circle me-2"></i>
                    <strong>Ovo je vaš oglas</strong>
                </div>
            </div>
        `;
    } else {
        // Logika za sve ostale korisnike ovisno o statusu oglasa
        let buttonHTML = '';
        switch (ad.status) {
            case 'AVAILABLE':
                if (currentUser) {
                    buttonHTML = `<button class="btn btn-primary btn-lg" id="request-btn"><i class="bi bi-patch-check-fill me-2"></i> Zatraži proizvod</button>`;
                } else {
                    buttonHTML = `<a href="/login" class="btn btn-outline-light btn-lg"><i class="bi bi-box-arrow-in-right me-2"></i> Prijavite se da biste zatražili</a>`;
                }
                break;
            case 'PENDING':
                if (currentUser && ad.requesterId && currentUser.uid === ad.requesterId) {
                    buttonHTML = `<button class="btn btn-success btn-lg" disabled><i class="bi bi-hourglass-split me-2"></i> Vaš zahtjev je na čekanju</button>`;
                } else {
                    buttonHTML = `<button class="btn btn-secondary btn-lg" disabled><i class="bi bi-lock-fill me-2"></i> Rezervirano</button>`;
                }
                break;
            case 'SOLD':
                buttonHTML = `<button class="btn btn-danger btn-lg" disabled><i class="bi bi-x-circle-fill me-2"></i> Prodano</button>`;
                break;
            default:
                buttonHTML = `<button class="btn btn-secondary btn-lg" disabled>Nedostupno</button>`;
        }
        
        actionButtonsHTML = `
            <h5 class="mt-4">Kupovina</h5>
            <div class="d-grid">${buttonHTML}</div>
        `;
    }

    // 4. Finalni HTML koji spaja sve poboljšane dijelove
    adDetailsContainer.innerHTML = `
        <div class="row g-lg-5">
            <div class="col-lg-7">
                ${imagesCarousel}
            </div>
            <div class="col-lg-5">
                <h1 class="display-5 fw-bold mb-2">${ad.title}</h1>
                <div class="price-display mb-4">${ad.price} ${ad.currency || 'EUR'}</div>
                
                <div class="info-panel p-3 rounded mb-4">
                    <div class="row">
                        <div class="col-6 mb-3 info-item"><i class="bi bi-gem me-2"></i><strong>Stanje:</strong><br>${conditionText}</div>
                        <div class="col-6 mb-3 info-item"><i class="bi bi-tag-fill me-2"></i><strong>Kategorija:</strong><br>${categoryText}</div>
                        <div class="col-12 info-item"><i class="bi bi-geo-alt-fill me-2"></i><strong>Lokacija:</strong><br>${ad.location || 'Nije navedeno'}</div>
                    </div>
                </div>

                <h5>Opis</h5>
                <p class="ad-description">${ad.description || 'Nema opisa.'}</p>
                
                ${actionButtonsHTML}
            </div>
        </div>
    `;

    // 5. Nakon što se HTML postavi, dodaj event listener ako postoji gumb za zahtjev
    if (document.getElementById('request-btn')) {
        document.getElementById('request-btn').addEventListener('click', () => handleRequestAd(ad, currentUser));
    }
}


    async function fetchAndDisplayAd(currentUser) {
        try {
            const response = await fetch(`/api/ads/${adId}`);
            if (!response.ok) throw new Error('Oglas nije pronađen.');
            const ad = await response.json();
            
            displayAdDetails(ad, currentUser);
        } catch (error) {
            adDetailsContainer.innerHTML = `<div class="alert alert-warning text-center">${error.message}</div>`;
        }
    }
});

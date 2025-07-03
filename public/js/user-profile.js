import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

const adsContainer = document.getElementById("user-ads-container");
let allUserAds = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    adsContainer.innerHTML = `
      <div class="alert alert-warning d-flex align-items-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Prijavite se za pregled svojih oglasa.
      </div>`;
    return;
  }

  try {
    console.log("Dohvaćam oglase za korisnika:", user.uid); // DODAJ OVO
    
    const q = query(collection(db, "ads"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    console.log("Broj pronađenih oglasa:", querySnapshot.size); // DODAJ OVO

    if (querySnapshot.empty) {
      adsContainer.innerHTML = `
        <div class="alert alert-info d-flex align-items-center">
          <i class="fas fa-info-circle me-2"></i>
          Nemate nijedan oglas. <a href="/ads" class="ms-2">Dodajte prvi oglas</a>
        </div>`;
      return;
    }

    allUserAds = [];
    querySnapshot.forEach(doc => {
      allUserAds.push({ id: doc.id, ...doc.data() });
    });

    console.log("Učitani oglasi:", allUserAds); // DODAJ OVO
    
    displayAds(allUserAds);
    setupFilters();

  } catch (error) {
    console.error("Greška pri dohvaćanju oglasa:", error);
    adsContainer.innerHTML = `
      <div class="alert alert-danger d-flex align-items-center">
        <i class="fas fa-exclamation-circle me-2"></i>
        Greška pri učitavanju oglasa: ${error.message}
      </div>`;
  }
});

function displayAds(ads) {
  if (ads.length === 0) {
    adsContainer.innerHTML = `
      <div class="alert alert-info d-flex align-items-center">
        <i class="fas fa-search me-2"></i>
        Nema oglasa koji odgovaraju filteru.
      </div>`;
    return;
  }

  let html = "";
  ads.forEach(ad => {
    const statusBadge = getStatusBadge(ad.status);
    const defaultImage = "https://via.placeholder.com/400x250/6c757d/ffffff?text=Nema+slike";
    
    // --- ISPRAVLJENA LOGIKA ZA PRIKAZ KONTROLA ZA ZAHTJEVE ---
    let requestControlsHTML = '';
    if (ad.status === 'PENDING' && ad.requesterId) {
        requestControlsHTML = `
            <div class="alert alert-warning mt-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="alert-heading mb-0"><i class="fas fa-clock me-2"></i>Zahtjev na čekanju</h6>
                        <small class="text">Korisnik ID: ${ad.requesterId}</small>
                    </div>
                    <div>
                        <button class="btn btn-success btn-sm me-2" onclick="handleAdResponse('${ad.id}', 'accept')" title="Prihvati zahtjev">
                            <i class="fas fa-check"></i> Prihvati
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleAdResponse('${ad.id}', 'reject')" title="Odbij zahtjev">
                            <i class="fas fa-times"></i> Odbij
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    html += `
      <div class="card mb-3 shadow-sm">
        <div class="row g-0">
          <div class="col-md-4">
            <div class="card-img-wrapper">
              <img src="${ad.imageUrls?.[0] || defaultImage}" class="ad-image img-fluid rounded-start" alt="${ad.title}" onerror="this.src='${defaultImage}'" style="height: 200px; object-fit: cover;">
            </div>
          </div>
          <div class="col-md-8">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title mb-0">${ad.title}</h5>
                ${statusBadge}
              </div>
              <p class="card-text text mb-2">${ad.description || "Nema opisa."}</p>
              
              <div class="row mb-3">
                 <div class="col-sm-6"><strong class="text-success fs-5">€${ad.price}</strong></div>
                 <div class="col-sm-6 text-sm-end"><small class="text"><i class="fas fa-calendar me-1"></i>${formatDate(ad.createdAt)}</small></div>
              </div>

              <!-- Gumbovi za uređivanje i brisanje -->
              <div class="d-flex justify-content-end border-top pt-2">
                 <button class="btn btn-outline-primary btn-sm me-2" onclick="editAd('${ad.id}')" title="Uredi oglas">
                     <i class="fas fa-edit"></i> Uredi
                 </button>
                 <button class="btn btn-outline-danger btn-sm" onclick="deleteAd('${ad.id}')" title="Obriši oglas">
                     <i class="fas fa-trash"></i> Obriši
                 </button>
              </div>

              <!-- Prikaz kontrola za zahtjeve -->
              ${requestControlsHTML}
              
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  adsContainer.innerHTML = html;
}


function getStatusBadge(status) {
  const badges = {
    'AVAILABLE': '<span class="badge bg-success">Dostupno</span>',
    'SOLD': '<span class="badge bg-secondary">Prodano</span>',
    'PENDING': '<span class="badge bg-warning">Na čekanju</span>'
  };
  return badges[status] || '<span class="badge bg-light text-dark">Nepoznato</span>';
}

function formatDate(timestamp) {
  if (!timestamp) return "Nepoznato";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('hr-HR');
}

async function loadOrders(adId) {
  const ordersDiv = document.getElementById(`orders-${adId}`);
  
  try {
    const q = query(collection(db, "orders"), where("adId", "==", adId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      ordersDiv.innerHTML = '<small class="text-muted">Nema narudžbi za ovaj oglas.</small>';
      return;
    }

    let html = "";
    querySnapshot.forEach(orderDoc => {
      const order = orderDoc.data();
      html += `
        <div class="border rounded p-2 mb-2 bg-light">
          <div class="row align-items-center">
            <div class="col-md-6">
              <div><strong>Kupac:</strong> ${order.buyerName || order.buyerEmail}</div>
              <small class="text-muted">${formatDate(order.createdAt)}</small>
            </div>
            <div class="col-md-3">
              <span class="badge ${order.status === 'accepted' ? 'bg-success' : order.status === 'rejected' ? 'bg-danger' : 'bg-secondary'}">
                ${order.status === 'pending' ? 'Na čekanju' : order.status === 'accepted' ? 'Prihvaćeno' : 'Odbijeno'}
              </span>
            </div>
            <div class="col-md-3">
              ${order.status === 'pending' ? `
                <button class="btn btn-success btn-sm me-1" onclick="handleOrderAction('${orderDoc.id}', 'accepted')">
                  <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleOrderAction('${orderDoc.id}', 'rejected')">
                  <i class="fas fa-times"></i>
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    });
    
    ordersDiv.innerHTML = html;
  } catch (error) {
    ordersDiv.innerHTML = '<small class="text-danger">Greška pri učitavanju narudžbi.</small>';
  }
}

function setupFilters() {
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');

  function filterAds() {
    const searchValue = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;

    const filtered = allUserAds.filter(ad => {
      const matchesSearch = ad.title.toLowerCase().includes(searchValue) || 
                           (ad.description && ad.description.toLowerCase().includes(searchValue));
      const matchesStatus = !statusValue || ad.status === statusValue;
      return matchesSearch && matchesStatus;
    });

    displayAds(filtered);
  }

  searchInput.addEventListener('input', filterAds);
  statusFilter.addEventListener('change', filterAds);
}

window.handleOrderAction = async (orderId, action) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: action });
    
    // Refresh samo tu narudžbu
    const orderDoc = await orderRef.get();
    if (orderDoc.exists()) {
      const adId = orderDoc.data().adId;
      loadOrders(adId);
    }
  } catch (error) {
    alert("Greška pri ažuriranju narudžbe: " + error.message);
  }
};

// Postojeća funkcija editAd, sada s novom logikom
window.editAd = (adId) => {
  // 1. Pronađi oglas u lokalnom polju `allUserAds`
  const adToEdit = allUserAds.find(ad => ad.id === adId);
  if (!adToEdit) {
    console.error("Oglas nije pronađen!");
    alert("Greška: Oglas nije pronađen.");
    return;
  }

  // 2. Popuni formu u modalu s podacima oglasa
  document.getElementById('editAdId').value = adToEdit.id;
  document.getElementById('editTitleInput').value = adToEdit.title;
  document.getElementById('editDescriptionInput').value = adToEdit.description;
  document.getElementById('editPriceInput').value = adToEdit.price;
  document.getElementById('editConditionSelect').value = adToEdit.condition;

  // 3. Pokaži modal
  const editModal = new bootstrap.Modal(document.getElementById('editAdModal'));
  editModal.show();
};


// Listener za gumb "Spremi izmjene" unutar modala
const saveChangesBtn = document.getElementById('saveAdChangesBtn');
saveChangesBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Morate biti prijavljeni.");
    return;
  }

  // Pripremi gumb za feedback korisniku
  saveChangesBtn.disabled = true;
  saveChangesBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Spremanje...';

  // Pokupi podatke iz forme
  const adId = document.getElementById('editAdId').value;
  const updatedData = {
    title: document.getElementById('editTitleInput').value,
    description: document.getElementById('editDescriptionInput').value,
    price: parseFloat(document.getElementById('editPriceInput').value),
    condition: document.getElementById('editConditionSelect').value,
  };

  try {
    // Šalji PUT zahtjev na backend API (kao što je opisano u prethodnom odgovoru)
    const response = await fetch(`/api/ads/${adId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}` // Token za autorizaciju
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Spremanje nije uspjelo.');
    }

    // Ažuriraj lokalne podatke i ponovno prikaži oglase
    const adIndex = allUserAds.findIndex(ad => ad.id === adId);
    if (adIndex > -1) {
      // Spoji stare podatke s novima kako ne bi izgubio one koje ne uređuješ
      allUserAds[adIndex] = { ...allUserAds[adIndex], ...updatedData };
    }
    displayAds(allUserAds);

    // Sakrij modal i prikaži poruku o uspjehu
    const editModal = bootstrap.Modal.getInstance(document.getElementById('editAdModal'));
    editModal.hide();
    alert("Oglas je uspješno ažuriran!");

  } catch (error) {
    console.error('Greška pri spremanju izmjena:', error);
    alert(`Greška: ${error.message}`);
  } finally {
    // Vrati gumb u normalno stanje
    saveChangesBtn.disabled = false;
    saveChangesBtn.innerHTML = 'Spremi izmjene';
  }
});

window.deleteAd = async (adId) => {
    const user = auth.currentUser;
    if (!user) {
        alert("Morate biti prijavljeni da biste obrisali oglas.");
        return;
    }

    // Potvrda brisanja
    const confirmed = confirm("Jeste li sigurni da želite trajno obrisati ovaj oglas? Ova akcija se ne može poništiti.");
    if (!confirmed) return;

    // Onemogući gumb za brisanje
    const deleteButton = document.querySelector(`button[onclick="deleteAd('${adId}')"]`);
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Brišem...';
    }

    try {
        const response = await fetch(`/api/ads/${adId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerId: user.uid })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Greška pri brisanju oglasa.' }));
            throw new Error(errorData.message);
        }

        alert("Oglas je uspješno obrisan!");
        
        // Ukloni oglas iz prikaza bez potrebe za ponovnim dohvaćanjem
        allUserAds = allUserAds.filter(ad => ad.id !== adId);
        displayAds(allUserAds);

    } catch (error) {
        console.error('Greška pri brisanju oglasa:', error);
        alert(`Greška pri brisanju: ${error.message}`);
        
        // Vrati gumb u prvobitno stanje
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = '<i class="fas fa-trash"></i> Obriši';
        }
    }
};


window.handleAdResponse = async (adId, action) => {
    const user = auth.currentUser;
    if (!user) {
        alert("Morate biti prijavljeni da biste izvršili ovu akciju.");
        return;
    }

    // Onemogući sve gumbe za taj oglas da se spriječi dvostruki klik
    const buttons = document.querySelectorAll(`button[onclick*="${adId}"]`);
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = action === 'accept' ? 
            '<span class="spinner-border spinner-border-sm me-1"></span>Prihvaćam...' : 
            '<span class="spinner-border spinner-border-sm me-1"></span>Odbijem...';
    });

    try {
        const response = await fetch(`/api/ads/${adId}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action,
                ownerId: user.uid
            })
        });

        // Provjeri je li odgovor uspješan
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Nepoznata greška na serveru.' }));
            throw new Error(errorData.message);
        }

        const result = await response.json();
        
        // Prikaži poruku o uspjehu
        const message = action === 'accept' ? 'Zahtjev je uspješno prihvaćen!' : 'Zahtjev je uspješno odbijen!';
        alert(message);
        
        // Osvježi prikaz oglasa da se vidi promjena statusa
        const q = query(collection(db, "ads"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        allUserAds = [];
        querySnapshot.forEach(doc => {
            allUserAds.push({ id: doc.id, ...doc.data() });
        });
        
        displayAds(allUserAds);

    } catch (error) {
        console.error(`Greška pri akciji '${action}':`, error);
        alert(`Greška: ${error.message}`);
        
        // Vrati gumbe u prvobitno stanje
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = action === 'accept' ? 
                '<i class="fas fa-check"></i> Prihvati' : 
                '<i class="fas fa-times"></i> Odbij';
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Reference na DOM elemente
    const adsContainer = document.getElementById('ads-container');
    const searchInput = document.getElementById('search-input');
    const categorySelect = document.getElementById('category-select');
    const minPriceInput = document.getElementById('min-price-input');
    const maxPriceInput = document.getElementById('max-price-input');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Varijabla za spremanje svih dohvaćenih oglasa
    let allAds = [];

    // Funkcija za kreiranje kartice oglasa
    function createAdCard(adData) {
        if (!adData || !adData.title || !adData.price) {
            console.error("Preskačem oglas zbog nepotpunih podataka:", adData);
            return null;
        }
        const {
            title,
            price,
            currency = 'EUR',
            condition = 'USED',
            location = 'Nepoznata lokacija',
            description = 'Nema opisa.',
            imageUrls = [],
            id
        } = adData;

        const conditionBadge = condition === 'NEW'
            ? '<span class="badge bg-success-subtle text-success-emphasis rounded-pill ad-condition">NOVO</span>'
            : '<span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill ad-condition">KORIŠTENO</span>';

        const imageUrl = imageUrls.length > 0 ? imageUrls[0] : 'https://placehold.co/600x400/eee/ccc?text=Nema+slike';
        const shortDescription = description.length > 80 ? description.substring(0, 80) + '...' : description;

        const card = document.createElement('div');
        card.className = 'col-lg-4 col-md-6 col-sm-12 ad-card-container';
        card.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${imageUrl}" class="card-img-top" alt="Slika za ${title}" loading="lazy">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${title}</h5>
                    <div class="ad-price mb-2 fw-bold">${price} ${currency}</div>
                    <p class="card-text text mb-2">${shortDescription}</p>
                    <div class="mb-2">${conditionBadge}</div>
                    <div class="ad-location mb-2"><i class="bi bi-geo-alt-fill me-1"></i>${location}</div>
                    <a href="ad-details?id=${id}" class="btn btn-dark mt-auto w-100">Pogledaj oglas</a>
                </div>
            </div>
        `;
        return card;
    }

    // Funkcija za prikaz filtriranih oglasa
    function displayAds(ads) {
        adsContainer.innerHTML = '';
        if (ads.length === 0) {
            adsContainer.innerHTML = '<div class="col-12 text-center py-5" style="color: #f0f5f1;"><i class="bi bi-search fs-1"></i><br>Nema rezultata za odabrane filtere.</div>';
            return;
        }
        ads.forEach(ad => {
            const adCardElement = createAdCard(ad);
            if (adCardElement) adsContainer.appendChild(adCardElement);
        });
    }

    // Funkcija za primjenu filtera
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categorySelect.value;
        const minPrice = parseFloat(minPriceInput.value) || 0;
        const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

        let filteredAds = allAds.filter(ad => {
            const matchesSearch = ad.title.toLowerCase().includes(searchTerm) || ad.description.toLowerCase().includes(searchTerm);
            const matchesCategory = !selectedCategory || ad.category === selectedCategory;
            const matchesPrice = ad.price >= minPrice && ad.price <= maxPrice;

            return matchesSearch && matchesCategory && matchesPrice;
        });

        displayAds(filteredAds);
    }

    // Funkcija za dohvat oglasa
    async function fetchAndInitializeAds() {
        const loadingSpinner = document.getElementById('loading-spinner');
        try {
            const response = await fetch('/api/ads');
            if (!response.ok) throw new Error(`HTTP greška! Status: ${response.status}`);
            
            allAds = await response.json();
            displayAds(allAds);
        } catch (error) {
            console.error('Greška pri dohvaćanju oglasa:', error);
            adsContainer.innerHTML = '<div class="col-12 text-center text-danger py-5"><i class="bi bi-exclamation-triangle fs-1"></i><br>Nije moguće učitati oglase.</div>';
        } finally {
            if (loadingSpinner) loadingSpinner.remove();
        }
    }

    // Event listeneri za filtere
    searchInput.addEventListener('input', applyFilters);
    categorySelect.addEventListener('change', applyFilters);
    minPriceInput.addEventListener('input', applyFilters);
    maxPriceInput.addEventListener('input', applyFilters);
    
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        categorySelect.value = '';
        minPriceInput.value = '';
        maxPriceInput.value = '';
        displayAds(allAds);
    });

    // Pokretanje inicijalnog dohvata oglasa
    fetchAndInitializeAds();
});

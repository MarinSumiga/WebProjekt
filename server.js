const express = require('express');
const path = require('path');
const app = express();
const nodemailer = require('nodemailer');
const PORT = process.env.PORT || 3000;

// --- Firebase Admin Setup ---
const admin = require('firebase-admin');
const serviceAccount = require('./web--webshop-project-firebase-adminsdk-fbsvc-4c96232089.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
// ----------------------------

app.use(express.json());


const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'monroe.lueilwitz@ethereal.email',
        pass: 'GrRuZDrBBveuRPaYcu'
    }
});

// DODAJ OVO ZA PROVJERU KONEKCIJE PRILIKOM POKRETANJA SERVERA
transporter.verify(function(error, success) {
    if (error) {
        console.error("Greška pri spajanju na SMTP server:", error);
    } else {
        console.log("Server je spreman za primanje naših poruka (Ethereal).");
    }
});

// Posluživanje statičkih datoteka iz 'public' direktorija
app.use(express.static(path.join(__dirname, 'public')));

// --- Rute za serviranje HTML stranica ---
// Svaka ruta vraća odgovarajuću HTML stranicu iz 'views' direktorija
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/ads', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ads.html'));
});

app.get('/create-ad', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'create-ad.html'));
}); 

app.get('/ad-details', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ad-details.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'user-profile.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});


// --- API Rute ---

// Middleware za dohvaćanje tokena iz zaglavlja Authorization
const getAuthToken = (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        req.authToken = req.headers.authorization.split(' ')[1];
    } else {
        req.authToken = null;
    }
    next();
};

// Middleware za provjeru autentifikacije korisnika pomoću Firebase tokena
const checkIfAuthenticated = async (req, res, next) => {
    getAuthToken(req, res, async () => {
        try {
            if (!req.authToken) {
                return res.status(401).json({ message: 'Nema autentifikacijskog tokena.' });
            }
            const userInfo = await admin.auth().verifyIdToken(req.authToken);
            req.authId = userInfo.uid;
            next();
        } catch (error) {
            console.error('Greška pri verifikaciji tokena:', error);
            return res.status(403).json({ message: 'Nevažeći ili istekao token.' });
        }
    });
};

// Ruta za prikaz stranice za kreiranje oglasa, samo za autentificirane korisnike
app.get('/create-ad', (req, res, next) => {
    getAuthToken(req, res, async () => {
        try {
            if (!req.authToken) {
                return res.redirect('/login');
            }
            const userInfo = await admin.auth().verifyIdToken(req.authToken);
            req.authId = userInfo.uid;
            res.sendFile(path.join(__dirname, 'views', 'create-ad.html'));
        } catch (error) {
            console.error('Greška pri verifikaciji tokena:', error);
            res.redirect('/login');
        }
    });
});

// API ruta za kreiranje novog oglasa (autentifikacija obavezna)
app.post('/api/ads', checkIfAuthenticated, async (req, res) => {
    try {
        const { title, description, price, currency, category, condition, location, contactPhone, imageUrls } = req.body;
        const userId = req.authId; // Dohvaćamo ID korisnika iz tokena

        if (!title || !description || !price || !category || !condition) {
            return res.status(400).json({ message: 'Nedostaju obavezni podaci za oglas.' });
        }

        const adData = {
            userId,
            title,
            description,
            price: parseFloat(price),
            currency: currency || 'EUR',
            category,
            condition,
            location: location || 'Nepoznata lokacija',
            contactPhone: contactPhone || '',
            imageUrls: imageUrls || [],
            status: 'AVAILABLE',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const adRef = await db.collection('ads').add(adData);
        res.status(201).json({ id: adRef.id, message: 'Oglas je uspješno objavljen.' });
    } catch (error) {
        console.error('Greška pri objavi oglasa:', error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});

// --- Upload slika oglasa ---
// Uvoz i konfiguracija Multera za upload slika u memoriju
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Ruta za upload do 3 slike (autentifikacija obavezna)
app.post('/api/upload', checkIfAuthenticated, upload.array('images', 3), async (req, res) => {
    try {
        const userId = req.authId;
        const files = req.files;
        const imageUrls = [];

        for (const file of files) {
            const fileName = `ads/${userId}/${Date.now()}-${file.originalname}`;
            const fileUpload = bucket.file(fileName);
            const blobStream = fileUpload.createWriteStream({
                metadata: { contentType: file.mimetype }
            });

            blobStream.on('error', (error) => {
                console.error('Greška pri uploadu slike:', error);
                res.status(500).json({ message: 'Greška pri uploadu slike.' });
            });

            blobStream.on('finish', async () => {
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                imageUrls.push(publicUrl);
                if (imageUrls.length === files.length) {
                    res.status(200).json({ imageUrls });
                }
            });

            blobStream.end(file.buffer);
        }
    } catch (error) {
        console.error('Greška pri uploadu slika:', error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});

// PUT /api/ads/:id - Ruta za ažuriranje oglasa
app.put('/api/ads/:id', async (req, res) => {
  try {
    // 1. Autorizacija: Provjeri je li korisnik prijavljen i je li vlasnik
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).send({ message: 'Nema tokena za autorizaciju.' });
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const adId = req.params.id;
    const adRef = db.collection('ads').doc(adId);
    const adDoc = await adRef.get();

    if (!adDoc.exists) {
      return res.status(404).send({ message: 'Oglas nije pronađen.' });
    }
    if (adDoc.data().userId !== userId) {
      return res.status(403).send({ message: 'Nemate dopuštenje za uređivanje ovog oglasa.' });
    }

    // 2. Ažuriranje: Spremi nove podatke u Firestore
    const updatedData = req.body;
    await adRef.update(updatedData);

    res.status(200).send({ message: 'Oglas uspješno ažuriran.', data: updatedData });

  } catch (error) {
    console.error('Greška na serveru pri ažuriranju oglasa:', error);
    res.status(500).send({ message: 'Interna greška servera.' });
  }
});

// --- Rute za upravljanje statusom oglasa (prihvati/odbij zahtjev) ---
// Ovdje vlasnik oglasa može prihvatiti ili odbiti zahtjev kupca
app.patch('/api/ads/:id/respond', async (req, res) => {
    try {
        const adId = req.params.id;
        const { action, ownerId } = req.body;

        console.log(`--- RESPOND RUTA POZVANA ---`);
        console.log(`ID oglasa: ${adId}`);
        console.log(`Akcija: ${action}`);
        console.log(`ID vlasnika: ${ownerId}`);

        if (!action || !ownerId) {
            console.log("GREŠKA: Nedostaju podaci");
            return res.status(400).json({ message: 'Akcija i ID vlasnika su obavezni.' });
        }

        const adRef = db.collection('ads').doc(adId);
        const adDoc = await adRef.get();

        if (!adDoc.exists) {
            console.log("GREŠKA: Oglas ne postoji");
            return res.status(404).json({ message: 'Oglas nije pronađen.' });
        }

        const adData = adDoc.data();
        console.log("Podaci oglasa:", adData);

        // Sigurnosna provjera: Samo vlasnik može mijenjati status
        if (adData.userId !== ownerId) {
            console.log("GREŠKA: Neovlašteni pristup");
            return res.status(403).json({ message: 'Nemate ovlasti za izvršavanje ove akcije.' });
        }
        
        let updateData = {};
        if (action === 'accept') {
            updateData = { status: 'SOLD' };
            console.log("Prihvaćam zahtjev - mijenjam status u SOLD");
        } else if (action === 'reject') {
            updateData = { 
                status: 'AVAILABLE', 
                requesterId: admin.firestore.FieldValue.delete() 
            };
            console.log("Odbijem zahtjev - vraćam status na AVAILABLE");
        } else {
            console.log("GREŠKA: Nepoznata akcija");
            return res.status(400).json({ message: 'Nepoznata akcija. Koristite "accept" ili "reject".' });
        }

        await adRef.update(updateData);
        console.log("--- STATUS USPJEŠNO AŽURIRAN ---");

        res.status(200).json({ 
            message: `Oglas je uspješno ${action === 'accept' ? 'prihvaćen' : 'odbijen'}.`,
            newStatus: updateData.status 
        });

    } catch (error) {
        console.error("--- GREŠKA U RESPOND RUTI ---");
        console.error(error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});

// --- Ruta za slanje zahtjeva za oglas ---
// Kupac šalje zahtjev za oglas, vlasniku se šalje email obavijest
app.patch('/api/ads/:id/request', async (req, res) => {
    console.log("--- PRIMLJEN ZAHTJEV ZA OGLAS ---");
    try {
        const adId = req.params.id;
        const { requesterId } = req.body;
        
        console.log(`ID oglasa: ${adId}`);
        console.log(`ID kupca (requester): ${requesterId}`);

        if (!requesterId) {
            return res.status(400).json({ message: 'ID korisnika koji šalje zahtjev je obavezan.' });
        }

        const adRef = db.collection('ads').doc(adId);
        const adDoc = await adRef.get();

        if (!adDoc.exists) {
            return res.status(404).json({ message: 'Oglas nije pronađen.' });
        }

        const adData = adDoc.data();
        console.log("Podaci oglasa dohvaćeni:", adData);

        if (adData.status !== 'AVAILABLE') {
            return res.status(409).json({ message: 'Ovaj oglas više nije dostupan.' });
        }
        
        console.log("--- DOHVAĆANJE EMAIL ADRESA ---");
        const ownerRecord = await admin.auth().getUser(adData.userId);
        const ownerEmail = ownerRecord.email;
        console.log(`Email vlasnika (owner): ${ownerEmail}`);

        const requesterRecord = await admin.auth().getUser(requesterId);
        const requesterEmail = requesterRecord.email;
        console.log(`Email kupca (requester): ${requesterEmail}`);

        if (!ownerEmail || !requesterEmail) {
            throw new Error('Nije moguće dohvatiti email adrese. Jedan od ID-jeva nije ispravan.');
        }

        console.log("Ažuriranje statusa oglasa u PENDING...");
        await adRef.update({
            status: 'PENDING',
            requesterId: requesterId
        });
        console.log("Status uspješno ažuriran.");

        // Definiraj mailOptions
        const mailOptions = {
            from: '"Web Shop" <noreply@mojwebshop.com>',
            to: ownerEmail,
            subject: `Novi zahtjev za vaš oglas: ${adData.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Imate novi zahtjev!</h2>
                    <p>Poštovani,</p>
                    <p>Korisnik <strong>${requesterEmail}</strong> je upravo zatražio Vaš proizvod:</p>
                    <h3>${adData.title}</h3>
                    <p>Molimo Vas da ga kontaktirate kako biste dogovorili detalje prodaje.</p>
                    <hr>
                    <p>Lijep pozdrav,<br>Vaš Web Shop Tim</p>
                </div>
            `,
        };
        
        console.log(`Slanje emaila na: ${ownerEmail}...`);

        // Dodajemo "const info =" da bismo uhvatili rezultat.
        const info = await transporter.sendMail(mailOptions);

        console.log("--- EMAIL USPJEŠNO POSLAN ---");

        console.log("Pregled emaila (Ethereal): %s", nodemailer.getTestMessageUrl(info));

        res.status(200).json({ message: 'Oglas uspješno zatražen. Prodavatelj je obaviješten.' });

    } catch (error) {
        console.error("--- DOŠLO JE DO GREŠKE U BLOKU ZAHTJEVA ---");
        console.error(error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});

// --- Brisanje oglasa ---
// Samo vlasnik može obrisati svoj oglas
app.delete('/api/ads/:id', async (req, res) => {
    try {
        const adId = req.params.id;
        const { ownerId } = req.body;

        console.log(`Zahtjev za brisanje oglasa ${adId} od korisnika ${ownerId}`);

        if (!ownerId) {
            return res.status(400).json({ message: 'ID vlasnika je obavezan za brisanje oglasa.' });
        }

        const adRef = db.collection('ads').doc(adId);
        const adDoc = await adRef.get();

        if (!adDoc.exists) {
            return res.status(404).json({ message: 'Oglas nije pronađen.' });
        }

        const adData = adDoc.data();

        // Sigurnosna provjera: Samo vlasnik može obrisati svoj oglas
        if (adData.userId !== ownerId) {
            return res.status(403).json({ message: 'Nemate ovlasti za brisanje ovog oglasa.' });
        }

        // Obriši oglas iz baze
        await adRef.delete();
        
        console.log(`Oglas ${adId} uspješno obrisan od strane korisnika ${ownerId}`);
        
        res.status(200).json({ message: 'Oglas je uspješno obrisan.' });

    } catch (error) {
        console.error("Greška pri brisanju oglasa:", error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru pri brisanju oglasa.' });
    }
});

// --- Dohvaćanje pojedinog oglasa po ID-u ---
app.get('/api/ads/:id', async (req, res) => {
    try {
        const adId = req.params.id;
        console.log(`Pokušaj dohvaćanja oglasa s ID-jem: ${adId}`);
        const adRef = db.collection('ads').doc(adId);
        const doc = await adRef.get();

        if (!doc.exists) {
            console.log('Oglas s tim ID-jem nije pronađen.');
            return res.status(404).json({ message: 'Oglas nije pronađen.' });
        }
        
        console.log('Oglas uspješno pronađen.');
        res.status(200).json({ id: doc.id, ...doc.data() });

    } catch (error) {
        console.error("Greška pri dohvaćanju pojedinog oglasa:", error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});
// =====================================================================
app.get('/api/user/:userId/ads', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Pokušaj dohvaćanja oglasa za korisnika: ${userId}`);
        
        const adsRef = db.collection('ads').where('userId', '==', userId);
        const snapshot = await adsRef.get();

        if (snapshot.empty) {
            console.log('Korisnik nema oglasa.');
            return res.status(200).json([]);
        }

        const userAds = [];
        snapshot.forEach(doc => {
            userAds.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Dohvaćeno ${userAds.length} oglasa za korisnika ${userId}.`);
        res.status(200).json(userAds);

    } catch (error) {
        console.error("Greška pri dohvaćanju korisnikovih oglasa:", error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});

// API ruta za dohvaćanje SVIH dostupnih oglasa
app.get('/api/ads', async (req, res) => {
    console.log("Pokušaj dohvaćanja SVIH dostupnih oglasa s Firestore-a...");
    try {
        const adsRef = db.collection('ads').where('status', '==', 'AVAILABLE');
        const snapshot = await adsRef.get();

        if (snapshot.empty) {
            console.log('Nema pronađenih dostupnih oglasa.');
            return res.status(200).json([]);
        }

        const ads = [];
        snapshot.forEach(doc => {
            ads.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Dohvaćeno ${ads.length} dostupnih oglasa.`);
        res.status(200).json(ads);

    } catch (error) {
        console.error("Greška pri dohvaćanju oglasa:", error);
        res.status(500).json({ message: 'Došlo je do pogreške na serveru.' });
    }
});


// Pokretanje servera
app.listen(PORT, () => {
    console.log(`Server je pokrenut na http://localhost:${PORT}`);
});

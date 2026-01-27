// ==========================================
// UDSM Global Impact Tracker - Core Logic
// ==========================================

const DB_KEY = 'udsm_db_v3'; // Bump version

// Initial Data: History of Journalism & Books
const INITIAL_DATA = {
    uploads: 142,
    downloads: 12450, // Reader Count
    citations: 892,
    activeSessions: 1,
    events: [], // Recent activity
    resources: [
        { title: "The Hill Observer: 1970 Edition", type: "Journal", date: "1970-05-12", author: "UDSM Press", abstract: "A collection of student perspectives during the 1970s socialist era." },
        { title: "Evolution of Swahili Press", type: "Book", date: "1998-11-20", author: "Prof. M. H. Y.", abstract: "Tracing the roots of Swahili journalism from colonial times to the present." },
        { title: "Voices of the Struggle", type: "Paper", date: "1985-02-10", author: "Student Union", abstract: "Critical essays on the role of campus media in political liberation." },
        { title: "Tanganyika Standard Vol 1", type: "Book", date: "1964-09-05", author: "National Archives", abstract: "Archived copies of the Tanganyika Standard from the independence era." },
        { title: "Media Law & Ethics", type: "Book", date: "2005-03-01", author: "Dr. J. K.", abstract: "A comprehensive guide to media laws and ethical standards in East Africa." },
        { title: "Radio Tanzania History", type: "Paper", date: "1990-05-15", author: "Dept of Journalism", abstract: "The impact of Radio Tanzania on national unity and education." },
        { title: "The Campus Voice: 2000", type: "Journal", date: "2000-01-01", author: "UDSM Media Corp", abstract: "Millennium issue covering the transition to digital media." },
        { title: "Pan-Africanism and Media", type: "Book", date: "1978-06-12", author: "Dr. Walter R.", abstract: "Analyzing the role of media in the Pan-African movement." },
    ]
};

let currentUserLocation = null;

// --- Database Layer ---
function getDB() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
        localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
    }
    return JSON.parse(data);
}

function updateDB(callback) {
    const db = getDB();
    const newData = callback(db);
    localStorage.setItem(DB_KEY, JSON.stringify(newData));
    window.dispatchEvent(new Event('db-update'));
}

const formatNum = (num) => num.toLocaleString();

// --- Initialization Routing ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Global Geolocation (Every page needs this for tracking)
    initGeolocation();

    // 2. Route based on Page
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        initIndexPage();
    } else if (path.includes('details.html')) {
        initDetailsPage();
    } else if (path.includes('admin.html')) {
        initAdminDashboard();
    }

    // 3. Tab Sync
    window.addEventListener('storage', (e) => {
        if (e.key === DB_KEY) handleDataUpdate();
    });
    window.addEventListener('db-update', handleDataUpdate);
});

function handleDataUpdate() {
    const path = window.location.pathname;
    if (path.includes('index.html')) updateIndexMetrics();
    else if (path.includes('admin.html')) updateAdminUI();
}

// ==========================================
// Page: Index (Homepage)
// ==========================================
function initIndexPage() {
    updateIndexMetrics();
    renderLibraryGrid();

    // Search Functionality
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('journal-search');

    if (searchBtn && searchInput) {
        const performSearch = () => {
            const query = searchInput.value.toLowerCase();
            renderLibraryGrid(query);
        };
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });
    }
}

function updateIndexMetrics() {
    const db = getDB();
    // Maps database fields to the new Index Layout IDs
    if (document.getElementById('journal-count')) document.getElementById('journal-count').innerText = formatNum(db.uploads); // Using uploads as proxy for journals
    if (document.getElementById('reader-count')) document.getElementById('reader-count').innerText = formatNum(db.downloads);

    // Calculate unique countries from events
    const countries = new Set(db.events.map(e => e.location.split(',').pop().trim()).filter(c => c && c !== "Unknown"));
    if (document.getElementById('country-count')) document.getElementById('country-count').innerText = Math.max(countries.size, 12); // Mock min 12
}

function renderLibraryGrid(query = "") {
    const grid = document.getElementById('library-grid');
    if (!grid) return;

    const db = getDB();
    grid.innerHTML = '';

    const filtered = db.resources.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.author.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 2rem;">No documents found.</p>';
        return;
    }

    filtered.forEach((res) => {
        const card = document.createElement('div');
        card.className = 'book-card';
        // Icon logic
        const icon = res.type === 'Book' ? '📖' : (res.type === 'Paper' ? '📄' : '📰');

        // On Click: Go to Details Page
        card.onclick = (e) => {
            // Check if clicked button or card
            if (!e.target.classList.contains('book-btn')) {
                window.location.href = `details.html?title=${encodeURIComponent(res.title)}`;
            }
        };
        card.style.cursor = "pointer";

        card.innerHTML = `
            <div class="book-cover">${icon}</div>
            <div class="book-info">
                <div>
                    <div class="book-type">${res.type}</div>
                    <div class="book-title">${res.title}</div>
                    <div class="book-meta">${res.author} • ${res.date}</div>
                </div>
                <!-- Removed buttons from card to clean UI as per request, handled by clicking card -->
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// Page: Details
// ==========================================
function initDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');

    if (!title) {
        alert('No document specified.');
        window.location.href = 'index.html';
        return;
    }

    const db = getDB();
    const book = db.resources.find(r => r.title === decodeURIComponent(title));

    if (!book) {
        document.getElementById('detail-title').innerText = "Document Not Found";
        return;
    }

    // Fill Info
    document.getElementById('detail-title').innerText = book.title;
    document.getElementById('detail-author').innerText = book.author;
    document.getElementById('detail-year').innerText = book.date;
    document.getElementById('detail-abstract').innerText = book.abstract || "No abstract available for this archive.";
    document.getElementById('detail-cover').innerText = book.type === 'Book' ? '📖' : '📰';

    // Buttons
    // Buttons
    document.querySelector('.read-btn').onclick = () => {
        registerReadEvent(book.title);
        // Open PDF Viewer
        window.open(`viewer.html?title=${encodeURIComponent(book.title)}`, '_blank');
    };

    // Initialize Map
    initDetailsMap(book.title);
}

function initDetailsMap(bookId) {
    const map = L.map('book-map', {
        zoomControl: true,
        attributionControl: false
    }).setView([20, 0], 2); // World View

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Seed Random Heatmap Data (Simulating global readership for THIS book)
    // Deterministic random based on book title length to keep it consistent-ish
    const seed = bookId.length;
    const heatPoints = [];

    // Generate some clusters
    const clusters = [
        [51.5074, -0.1278], // London
        [40.7128, -74.0060], // NYC
        [-6.7924, 39.2083], // Dar
        [35.6762, 139.6503], // Tokyo
        [52.5200, 13.4050] // Berlin
    ];

    clusters.forEach(center => {
        // Add random points around clusters
        for (let i = 0; i < (seed % 5 + 3) * 5; i++) {
            heatPoints.push([
                center[0] + (Math.random() - 0.5) * 10,
                center[1] + (Math.random() - 0.5) * 10,
                Math.random() * 0.8
            ]);
        }
    });

    const heat = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);

    // Update Stats
    drawDetailStats(heatPoints.length);

    // Live Effect: Add a point every few seconds
    setInterval(() => {
        const randomCluster = clusters[Math.floor(Math.random() * clusters.length)];
        const newPoint = [
            randomCluster[0] + (Math.random() - 0.5) * 20,
            randomCluster[1] + (Math.random() - 0.5) * 20,
            1.0
        ];
        heat.addLatLng(newPoint);
        drawDetailStats(null, true); // Increment count
    }, 4000);
}

function drawDetailStats(total = 0, increment = false) {
    const readerEl = document.getElementById('detail-readers');
    const viewEl = document.getElementById('detail-views');

    if (total) {
        if (readerEl) readerEl.innerText = Math.floor(total / 5); // Example logic
        if (viewEl) viewEl.innerText = total * 12;
    }

    if (increment && viewEl) {
        viewEl.innerText = parseInt(viewEl.innerText.replace(/,/g, '')) + 1;
    }
}

function registerReadEvent(title) {
    const loc = currentUserLocation || { lat: -6.79, lng: 39.20, name: "Unknown" };
    updateDB(db => {
        db.downloads++;
        const event = {
            id: Date.now(),
            action: 'READ',
            resource: title,
            location: loc.name,
            timestamp: new Date().toLocaleTimeString()
        };
        db.events.unshift(event);
        if (db.events.length > 50) db.events.pop();
        return db;
    });
}

// ==========================================
// Shared: Geolocation
// ==========================================
function initGeolocation() {
    const cached = localStorage.getItem('user_geo_cache_v3');
    if (cached) {
        currentUserLocation = JSON.parse(cached);
        updateLocStatus("Active", "#4cd964");
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                // Simulating Reverse Geo or using real if needed (skipping fetch for speed in this demo unless requested)
                // For now, let's just store coords + mock name if we don't fetch
                currentUserLocation = {
                    lat: latitude,
                    lng: longitude,
                    name: `Lat: ${latitude.toFixed(1)}, Lng: ${longitude.toFixed(1)}`
                };
                localStorage.setItem('user_geo_cache_v3', JSON.stringify(currentUserLocation));
                updateLocStatus("Active", "#4cd964");
            },
            (err) => {
                console.warn("Geo access denied", err);
                updateLocStatus("Denied", "#ff3b30");
            }
        );
    }
}

function updateLocStatus(text, color) {
    const el = document.getElementById('user-location-status');
    if (el) {
        el.innerText = text;
        el.style.color = color;
    }
}

// ==========================================
// Admin Page
// ==========================================
function initAdminDashboard() {
    updateAdminUI();
}

function updateAdminUI() {
    const db = getDB();

    // 1. Top Stats
    const adminUploads = document.getElementById('admin-uploads');
    const adminReads = document.getElementById('admin-reads');
    const adminSessions = document.getElementById('admin-sessions');

    if (adminUploads) adminUploads.innerText = formatNum(db.uploads);
    if (adminReads) adminReads.innerText = formatNum(db.downloads);
    if (adminSessions) adminSessions.innerText = db.activeSessions;

    // 2. Log Table
    const tbody = document.getElementById('admin-log-body');
    if (tbody) {
        tbody.innerHTML = '';
        if (db.events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No recent activity.</td></tr>';
        } else {
            db.events.forEach(ev => {
                const tr = document.createElement('tr');
                const actionStyle = ev.action === 'UPLOAD' ? 'color: #d90; font-weight:bold;' : 'color: #002147;';
                tr.innerHTML = `
                    <td>${ev.timestamp}</td>
                    <td style="${actionStyle}">${ev.action}</td>
                    <td>${ev.location}</td>
                    <td>${ev.resource}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // 3. Countries/Region Aggregation
    const locationCounts = {};
    db.events.forEach(ev => {
        const loc = ev.location || "Unknown";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    const countryBody = document.getElementById('admin-countries-body');
    if (countryBody) {
        countryBody.innerHTML = '';
        if (Object.keys(locationCounts).length === 0) {
            countryBody.innerHTML = '<tr><td colspan="2">No data yet.</td></tr>';
        } else {
            Object.entries(locationCounts).forEach(([locName, count]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${locName}</td><td class="text-right" style="font-weight:bold;">${count}</td>`;
                countryBody.appendChild(tr);
            });
        }
    }
}

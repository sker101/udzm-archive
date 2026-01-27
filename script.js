// ==========================================
// UDSM Global Impact Tracker - Core Logic
// ==========================================

const DB_KEY = 'udsm_db_v1';

// Initial Data
const INITIAL_DATA = {
    uploads: 142,
    downloads: 12450,
    citations: 892,
    activeSessions: 1,
    events: [],
    resources: [
        { title: "Sustainable Energy in East Africa", type: "Paper", date: "2024-01-15", author: "Dr. A. Mwangi" },
        { title: "Marine Biology of Zanzibar Channel", type: "Book", date: "2023-11-20", author: "Prof. J. K." },
        { title: "Economic Reforms 2025", type: "Paper", date: "2024-02-10", author: "E. T. Urio" },
        { title: "Linguistics in Swahili", type: "Book", date: "2023-09-05", author: "Dr. S. Hamisi" },
        { title: "AI in Tanzanian Agriculture", type: "Journal", date: "2024-03-01", author: "T. M. Tech" },
        { title: "Geology of the Rift Valley", type: "Book", date: "2023-05-15", author: "Geo Dept" },
        { title: "Urban Planning in Dar", type: "Paper", date: "2024-04-12", author: "City Lab" }
    ]
};

let currentUserLocation = null; // { lat, lng, name }

// --- Database Layer (LocalStorage) ---

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

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const isAdmin = document.body.classList.contains('admin-body');

    if (isAdmin) {
        initAdminDashboard();
    } else {
        initUserInterface();
    }

    // Tab Sync
    window.addEventListener('storage', (e) => {
        if (e.key === DB_KEY) {
            if (isAdmin) updateAdminUI();
            else updateUserUI();
        }
    });

    window.addEventListener('db-update', () => {
        if (isAdmin) updateAdminUI();
        else updateUserUI();
    });
});

// ==========================================
// User Interface
// ==========================================

function initUserInterface() {
    // 1. Map Setup
    const map = L.map('map', {
        zoomControl: false,
        minZoom: 2,
        attributionControl: false
    }).setView([10, 20], 2.5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Global Heat Layer
    window.heatLayer = L.heatLayer([
        [-6.7924, 39.2083, 1], // Dar presence
        [51.5074, -0.1278, 0.5], // London
        [40.7128, -74.0060, 0.4] // NYC
    ], {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: { 0.4: 'cyan', 0.65: 'lime', 1: '#FFD900' }
    }).addTo(map);

    // UDSM Marker
    const udsmIcon = L.divIcon({
        className: 'udsm-marker',
        html: '<div class="pulse" style="width:15px;height:15px;background:#FFD900;box-shadow:0 0 10px #FFD900;"></div>',
        iconSize: [20, 20]
    });
    L.marker([-6.7924, 39.2083], { icon: udsmIcon }).addTo(map).bindPopup("University of Dar es Salaam");

    // 2. Geolocation with Persistence
    const locStatus = document.getElementById('user-location-status');
    const CACHED_LOC = localStorage.getItem('user_geo_cache');

    if (CACHED_LOC) {
        currentUserLocation = JSON.parse(CACHED_LOC);
        locStatus.innerText = "Location Granted (Cached)";
        locStatus.style.color = "#4cd964";

        // Add marker immediately
        L.circleMarker([currentUserLocation.lat, currentUserLocation.lng], {
            radius: 6,
            fillColor: "#3388ff",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map).bindPopup("Your Location").openPopup();

        map.setView([currentUserLocation.lat, currentUserLocation.lng], 4);
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Simple Country approximation or just Coords
                currentUserLocation = {
                    lat: latitude,
                    lng: longitude,
                    name: `GPS: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
                };

                // Cache it
                localStorage.setItem('user_geo_cache', JSON.stringify(currentUserLocation));

                // Update Text Success
                locStatus.innerText = "Location Granted";
                locStatus.style.color = "#4cd964";

                // Update map if not already done (or simple refresh)
                // We could clear old layers but adding a fresh marker is fine or just update view
                // For cleanlyness we might want to track the marker variable, but this is okay for MVP
                if (!CACHED_LOC) {
                    L.circleMarker([latitude, longitude], {
                        radius: 6,
                        fillColor: "#3388ff",
                        color: "#fff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(map).bindPopup("Your Location").openPopup();
                    map.flyTo([latitude, longitude], 4);
                }
            },
            (error) => {
                console.error("Geo Error:", error);
                if (!CACHED_LOC) {
                    locStatus.innerText = "Location Access Denied";
                    locStatus.style.color = "#ff3b30";
                    // Fallback
                    currentUserLocation = { lat: -6.79, lng: 39.20, name: "Unknown" };
                }
            }
        );
    } else {
        if (!CACHED_LOC) locStatus.innerText = "Geolocation Not Supported";
    }

    // 3. Upload Modal Logic
    const uploadTrigger = document.getElementById('upload-trigger'); // Main button in Library header
    const uploadModal = document.getElementById('upload-modal');
    const closeUpload = document.getElementById('close-upload');

    if (uploadTrigger) {
        uploadTrigger.addEventListener('click', () => {
            uploadModal.classList.remove('hidden');
        });
    }

    if (closeUpload) {
        closeUpload.addEventListener('click', () => {
            uploadModal.classList.add('hidden');
        });
    }

    // 4. Upload Form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('resource-title').value;
            const type = document.getElementById('resource-type').value;

            const loc = currentUserLocation || { lat: -6.79, lng: 39.20, name: "Unknown" };

            updateDB(db => {
                db.uploads++;
                db.resources.unshift({ title, type, date: new Date().toISOString().split('T')[0], author: "Local Contributor" });
                const event = {
                    id: Date.now(),
                    action: 'UPLOAD',
                    resource: title,
                    location: loc.name,
                    timestamp: new Date().toLocaleTimeString()
                };
                db.events.unshift(event);
                if (db.events.length > 20) db.events.pop();
                return db;
            });

            if (window.heatLayer) window.heatLayer.addLatLng([loc.lat, loc.lng, 1.0]);

            alert('Document uploaded successfully!');
            uploadForm.reset();
            uploadModal.classList.add('hidden');
            renderLibraryGrid(); // Re-render immediately
        });
    }

    // 5. Initial Render
    renderLibraryGrid();
    updateUserUI();
}

function renderLibraryGrid() {
    const grid = document.getElementById('library-grid');
    if (!grid) return; // Guard for Admin page

    const db = getDB();
    grid.innerHTML = '';

    db.resources.forEach((res) => {
        const card = document.createElement('div');
        card.className = 'book-card';

        // Simulating a cover based on type
        const icon = res.type === 'Book' ? '📖' : (res.type === 'Paper' ? '📄' : '📰');

        card.innerHTML = `
            <div class="book-cover">${icon}</div>
            <div class="book-info">
                <div>
                    <div class="book-type">${res.type}</div>
                    <div class="book-title">${res.title}</div>
                    <div class="book-meta">By ${res.author || 'UDSM Researcher'} • ${res.date}</div>
                </div>
                <div class="book-actions">
                    <button class="book-btn btn-read" onclick="readResource('${res.title}')">Read Online</button>
                    <button class="book-btn btn-download" onclick="readResource('${res.title}')">Download PDF</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.readResource = function (title) {
    const loc = currentUserLocation || { lat: -6.79, lng: 39.20, name: "Unknown" };

    updateDB(db => {
        db.downloads++;
        db.citations++;

        const event = {
            id: Date.now(),
            action: 'READ',
            resource: title,
            location: loc.name,
            timestamp: new Date().toLocaleTimeString()
        };
        db.events.unshift(event);
        if (db.events.length > 20) db.events.pop();
        return db;
    });

    if (window.heatLayer && loc.lat) {
        window.heatLayer.addLatLng([loc.lat, loc.lng, 0.8]);
        map.panTo([loc.lat, loc.lng]); // Optional: pan to show effect
    }

    // Simulate "Opening"
    // In a real app this opens the PDF
    console.log(`Open PDF: ${title}`);
};

function updateUserUI() {
    const db = getDB();
    const dlEl = document.getElementById('download-counter');
    const citEl = document.getElementById('citation-counter');

    if (dlEl) dlEl.innerText = formatNum(db.downloads);
    if (citEl) citEl.innerText = formatNum(db.citations);

    const feedEl = document.getElementById('activity-feed');
    if (feedEl) {
        feedEl.innerHTML = '';
        const latest = db.events.slice(0, 5);
        if (latest.length === 0) {
            feedEl.innerHTML = '<li>Waiting for live activity...</li>';
        } else {
            latest.forEach(ev => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="location">${ev.location}</span>
                    <span class="action">${ev.action}: ${ev.resource}</span>
                `;
                feedEl.appendChild(li);
            });
        }
    }
}

// ==========================================
// Admin Dashboard Logic
// ==========================================

function initAdminDashboard() {
    updateAdminUI();
}

function updateAdminUI() {
    const db = getDB();

    document.getElementById('admin-uploads').innerText = formatNum(db.uploads);
    document.getElementById('admin-reads').innerText = formatNum(db.downloads);
    document.getElementById('admin-sessions').innerText = db.activeSessions;

    // 1. Log Table
    const tbody = document.getElementById('admin-log-body');
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

    // 2. Countries Aggregation (New!)
    // We will aggregate based on the 'location' string in events. 
    // Since we don't have real country names, we'll list the raw location strings + Count
    const locationCounts = {};
    db.events.forEach(ev => {
        // Group by Location Name
        locationCounts[ev.location] = (locationCounts[ev.location] || 0) + 1;
    });

    const countryBody = document.getElementById('admin-countries-body');
    // Guard in case admin.html isn't updated yet
    if (countryBody) {
        countryBody.innerHTML = '';
        if (Object.keys(locationCounts).length === 0) {
            countryBody.innerHTML = '<tr><td colspan="2">No data yet.</td></tr>';
        } else {
            Object.entries(locationCounts).forEach(([locName, count]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${locName}</td><td style="font-weight:bold;">${count}</td>`;
                countryBody.appendChild(tr);
            });
        }
    }
}

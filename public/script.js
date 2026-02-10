// ==========================================
// UDSM Global Impact Tracker - Full Stack
// ==========================================

const socket = io(); // Initialize Socket.IO

let currentUserLocation = null;
let currentBookId = null;

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initGeolocation();

    // Global Tracking
    setTimeout(() => {
        const pageName = window.location.pathname.split('/').pop() || 'index.html';
        logAccess('PAGE_VIEW', pageName);
    }, 1000); // Delay slightly to ensure geo is ready or at least started

    // Route Logic
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        initIndexPage();
    } else if (path.includes('contributors.html')) {
        initIndexPage(); // Reuse initIndexPage for contributors.html as it contains the library
    } else if (path.includes('details.html')) {
        initDetailsPage();
    } else if (path.includes('admin.html')) {
        initAdminDashboard();
    } else if (path.includes('dashboard.html')) {
        initDashboard();
    }

    // Global Socket Listeners (for counters)
    socket.on('status', (data) => console.log(data.message));

    socket.on('new_activity', (data) => {
        // Handle global updates
        if (document.getElementById('admin-log-body')) {
            prependAdminLog(data);
        }
    });

    socket.on('connect_error', (err) => {
        console.error("Socket Error:", err);
    });
});


// ==========================================
// Shared: Geolocation
// ==========================================
async function initGeolocation() {
    try {
        // Try multiple geolocation services
        let locationData = null;

        // Try ipapi.co first
        try {
            const response = await fetch('https://ipapi.co/json/', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                locationData = await response.json();
                console.log('Location from ipapi.co:', locationData);
            }
        } catch (e) {
            console.warn('ipapi.co failed:', e);
        }

        // Fallback to ip-api.com if ipapi.co failed
        if (!locationData || locationData.error) {
            try {
                const response = await fetch('http://ip-api.com/json/');
                if (response.ok) {
                    const data = await response.json();
                    locationData = {
                        country_name: data.country,
                        city: data.city,
                        region: data.regionName,
                        latitude: data.lat,
                        longitude: data.lon
                    };
                    console.log('Location from ip-api.com:', locationData);
                }
            } catch (e) {
                console.warn('ip-api.com failed:', e);
            }
        }

        if (locationData && locationData.country_name) {
            currentUserLocation = {
                country: locationData.country_name,
                region: locationData.city || locationData.region || locationData.country_name,
                latitude: locationData.latitude || -6.7924,
                longitude: locationData.longitude || 39.2083
            };

            console.log('✓ User location detected:', currentUserLocation);
            updateLocStatus(`${currentUserLocation.region}, ${currentUserLocation.country}`, "#4cd964");
        } else {
            throw new Error('All geolocation services failed');
        }
    } catch (error) {
        console.error('Geolocation failed, using default:', error);
        // Use a realistic default location (Tanzania/UDSM)
        currentUserLocation = {
            country: 'Tanzania',
            region: 'Dar es Salaam',
            latitude: -6.7924,
            longitude: 39.2083
        };
        updateLocStatus(`${currentUserLocation.region}, ${currentUserLocation.country}`, "#4cd964");
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
// Page: Index (Homepage)
// ==========================================
let currentCategory = 'all';

function initIndexPage() {
    loadLibrary();
    loadAnalytics();

    // Search
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.getElementById('journal-search');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => loadLibrary(searchInput.value, currentCategory));
        searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadLibrary(searchInput.value, currentCategory); });
    }

    // Category Filter
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            loadLibrary(searchInput ? searchInput.value : '', currentCategory);
        });
    });

    // Upload Modal
    const uploadTrigger = document.getElementById('upload-trigger');
    const uploadModal = document.getElementById('upload-modal');
    const closeUpload = document.getElementById('close-upload');
    const uploadForm = document.getElementById('upload-form');

    if (uploadTrigger) {
        uploadTrigger.addEventListener('click', () => {
            uploadModal.classList.remove('hidden');
        });
    }

    if (closeUpload) {
        closeUpload.addEventListener('click', () => {
            uploadModal.classList.add('hidden');
            uploadForm.reset();
        });
    }

    // Upload Form
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = uploadForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Uploading...";
            btn.disabled = true;

            const formData = new FormData();
            formData.append('title', document.getElementById('resource-title').value);
            formData.append('author', document.getElementById('resource-author').value);
            formData.append('publication_year', document.getElementById('resource-year').value);
            formData.append('type', document.getElementById('resource-type').value);
            formData.append('category', document.getElementById('resource-category').value);
            formData.append('abstract', document.getElementById('resource-abstract').value);

            const fileInput = document.getElementById('resource-file');
            if (fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]);
            }

            try {
                const res = await fetch('/api/books', {
                    method: 'POST',
                    body: formData // No Content-Type header (browser sets multipart/form-data)
                });

                if (res.ok) {
                    alert('Document uploaded successfully!');
                    uploadForm.reset();
                    document.getElementById('upload-modal').classList.add('hidden');
                    loadLibrary(); // Refresh list
                } else {
                    alert('Upload failed. Please try again.');
                }
            } catch (err) {
                console.error(err);
                alert('Server error.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
}

async function loadLibrary(query = "", category = 'all') {
    const grid = document.getElementById('library-grid');
    if (!grid) return;
    grid.innerHTML = '<p class="loading">Loading Archive...</p>';

    try {
        let url = `/api/books?q=${encodeURIComponent(query)}`;
        if (category && category !== 'all') {
            url += `&category=${encodeURIComponent(category)}`;
        }

        const res = await fetch(url);
        const books = await res.json();

        grid.innerHTML = '';
        if (books.length === 0) {
            grid.innerHTML = '<p>No documents found.</p>';
            return;
        }

        books.forEach((book) => {
            const card = document.createElement('div');
            card.className = 'book-card';
            const icon = book.type === 'Book' ? '📖' : (book.type === 'Paper' ? '📄' : '📰');

            card.onclick = () => {
                logAccess('CLICK', book.title);
                window.location.href = `details.html?id=${book.id}`;
            };
            card.style.cursor = "pointer";

            // Add category badge
            const categoryBadge = book.category ? `<span class="category-badge">${book.category}</span>` : '';

            card.innerHTML = `
                <div class="book-cover">${icon}</div>
                <div class="book-info">
                    <div>
                        ${categoryBadge}
                        <div class="book-type">${book.type}</div>
                        <div class="book-title">${book.title}</div>
                        <div class="book-meta">${book.author} • ${book.publication_year} • 📈 ${book.citations || 0} Citations</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p>Error loading library.</p>';
    }
}



let libraryChart = null;
let distributionChart = null;

async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics');
        const data = await res.json();

        // Homepage IDs
        if (document.getElementById('journal-count')) document.getElementById('journal-count').innerText = "1,240";
        if (document.getElementById('reader-count')) document.getElementById('reader-count').innerText = data.totalReads.toLocaleString();
        if (document.getElementById('country-count')) document.getElementById('country-count').innerText = data.activeCountries;

        // Admin Dashboard IDs
        if (document.getElementById('admin-uploads')) document.getElementById('admin-uploads').innerText = "1,240"; // Should potentially use data.uploadsByCategory total
        if (document.getElementById('admin-reads')) document.getElementById('admin-reads').innerText = data.totalReads.toLocaleString();

        // Populate Admin Logs if on Admin page
        if (document.body.classList.contains('admin-body')) {
            if (data.recent) {
                const tbody = document.getElementById('admin-log-body');
                if (tbody) {
                    tbody.innerHTML = '';
                    data.recent.forEach(log => prependAdminLog(log));
                }
            }

            // Populate Regional Statistics
            if (data.accessByRegion) {
                const regionsBody = document.getElementById('admin-regions-body');
                if (regionsBody) {
                    regionsBody.innerHTML = '';
                    data.accessByRegion.forEach(region => {
                        const locationDisplay = region.region && region.region !== region.country
                            ? `${region.region}, ${region.country}`
                            : region.country;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>🌍 ${locationDisplay}</td>
                            <td class="text-right u-row-hits">${region.reads || 0}</td>
                            <td class="text-right u-row-hits">${region.views || 0}</td>
                            <td class="text-right u-row-hits" style="font-weight: 600; color: #66fcf1;">${region.total_access}</td>
                        `;
                        regionsBody.appendChild(row);
                    });
                }
            }

            // Render Charts
            renderAdminCharts(data);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderAdminCharts(data) {
    if (typeof Chart === 'undefined') return;

    // 1. Reads by Category (Bar Chart)
    const ctx1 = document.getElementById('categoryChart');
    if (ctx1) {
        const categories = data.readsByCategory.map(item => item.category || 'Uncategorized');
        const readCounts = data.readsByCategory.map(item => item.count);
        const viewCounts = data.viewsByCategory.map(item => { // Match categories
            const match = data.viewsByCategory.find(v => (v.category || 'Uncategorized') === (item.category || 'Uncategorized'));
            return match ? match.count : 0;
        });

        if (libraryChart) libraryChart.destroy();
        libraryChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Reads (Downloads)',
                        data: readCounts,
                        backgroundColor: '#66fcf1',
                        borderWidth: 0
                    },
                    {
                        label: 'Views (Page Loads)',
                        data: viewCounts,
                        backgroundColor: '#45a29e',
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#c5c6c7' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#1f2833' },
                        ticks: { color: '#c5c6c7' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#c5c6c7' }
                    }
                }
            }
        });
    }

    // 2. Content Distribution (Doughnut Chart)
    const ctx2 = document.getElementById('distributionChart');
    if (ctx2) {
        // Aggregate uploads by category
        const categories = data.uploadsByCategory.map(item => item.category || 'Uncategorized');
        const counts = data.uploadsByCategory.map(item => item.count);

        if (distributionChart) distributionChart.destroy();
        distributionChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#66fcf1', '#45a29e', '#1f2833', '#c5c6c7', '#E0E722'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#c5c6c7' } }
                }
            }
        });
    }
}

// ==========================================
// Page: Details
// ==========================================
async function initDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('No document specified.');
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) throw new Error('Book not found');
        const book = await res.json();
        currentBookId = book.id;

        // TJET Breadcrumb and Banner Title
        const bcTitle = document.getElementById('breadcrumb-title');
        if (bcTitle) bcTitle.innerText = book.title;

        const bannerTitle = document.getElementById('detail-title-banner');
        if (bannerTitle) bannerTitle.innerText = book.title;

        // Render Info
        document.getElementById('detail-title').innerText = book.title;
        document.getElementById('detail-author').innerText = book.author;
        document.getElementById('detail-year').innerText = book.publication_year;
        document.getElementById('detail-abstract').innerText = book.abstract || "No abstract available.";
        document.getElementById('detail-cover').innerText = book.type === 'Book' ? '📖' : '📰';

        // Log Page View
        logAccess('VIEW', book.title);

        // Display citations count
        const citationsEl = document.getElementById('detail-citations');
        if (citationsEl) citationsEl.innerText = book.citations || 0;

        // Buttons
        const downloadBtn = document.querySelector('.read-btn');
        const readOnlineBtn = document.querySelector('.view-btn'); // New button
        const citeBtn = document.querySelector('.cite-btn');
        const pdfUrl = book.file_url || `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;

        downloadBtn.innerText = "Download PDF";
        downloadBtn.onclick = () => {
            logAccess('DOWNLOAD', book.title);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${book.title}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        if (readOnlineBtn) {
            readOnlineBtn.onclick = () => {
                logAccess('READ', book.title);
                window.open(pdfUrl, '_blank');
            };
        }

        // Cite button functionality
        if (citeBtn) {
            citeBtn.onclick = async () => {
                try {
                    const res = await fetch(`/api/books/${book.id}/cite`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            country: currentUserLocation?.country || 'Unknown',
                            region: currentUserLocation?.region || 'Unknown'
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (citationsEl) citationsEl.innerText = data.citations;
                        alert('Citation recorded! Thank you for citing this work.');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Error recording citation.');
                }
            };
        }

        // Initialize Map
        initLeafletMap(book.title, book.id);
        loadBookActivity(book.id);

    } catch (err) {
        console.error(err);
        const detailTitle = document.getElementById('detail-title');
        if (detailTitle) detailTitle.innerText = "Document Not Found";
    }
}

async function loadBookActivity(bookId) {
    const feed = document.getElementById('details-activity-feed');
    if (!feed) return;

    try {
        const res = await fetch(`/api/books/${bookId}/activity`);
        const activity = await res.json();

        if (activity.length > 0) {
            feed.innerHTML = '';
            activity.forEach(log => appendActivityToFeed(log, feed));
        }
    } catch (err) {
        console.error("Failed to load activity:", err);
    }
}

function appendActivityToFeed(data, feed, isLive = false) {
    const li = document.createElement('li');
    const timestamp = new Date(data.createdAt || data.timestamp);

    // Format: "Jan 27, 2026 - 13:45"
    const dateStr = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const location = data.region && data.country ? `${data.region}, ${data.country}` : (data.location || data.country || "Unknown");

    li.innerHTML = `
        <div>
            <span class="reader-location">${location}</span>
            <div class="reader-time">${dateStr} at ${timeStr}</div>
        </div>
        <span class="reader-action">${data.action}</span>
    `;

    if (isLive) {
        feed.insertBefore(li, feed.firstChild);
        if (feed.children.length > 10) feed.removeChild(feed.lastChild);

        // Remove empty message if exists
        const empty = feed.querySelector('.empty-msg');
        if (empty) empty.remove();
    } else {
        feed.appendChild(li);
    }
}

function logAccess(action, title) {
    if (!currentUserLocation) return;

    fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            book_id: currentBookId, // Might be null if generic page view
            book_title: title,
            action: action,
            country: currentUserLocation ? currentUserLocation.country : 'Unknown',
            region: currentUserLocation ? currentUserLocation.region : 'Unknown',
            ip_hash: "anon-" + Date.now() // Mock hash
        })
    }).catch(console.error);
}

function initLeafletMap(title, bookId) {
    if (typeof L === 'undefined') {
        console.warn("Leaflet not loaded.");
        return;
    }

    const map = L.map('book-map', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    }).setView([20, 15], 2.5); // Optimized world view

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Initial Heatmap layer
    const heat = L.heatLayer([], {
        radius: 25,
        blur: 15,
        gradient: { 0.4: 'cyan', 0.65: 'lime', 1: '#FFD900' }
    }).addTo(map);

    // Store markers for location tracking
    const locationMarkers = [];

    // Add UDSM Marker
    const udsmIcon = L.divIcon({
        className: 'udsm-marker',
        html: '<div class="pulse" style="width:15px;height:15px;background:#FFD900;box-shadow:0 0 10px #FFD900;"></div>',
        iconSize: [20, 20]
    });
    L.marker([-6.7924, 39.2083], { icon: udsmIcon }).addTo(map).bindPopup("<b>UDSM Archive</b><br>Dar es Salaam, Tanzania");

    // Function to add reader marker
    function addReaderMarker(lat, lng, location) {
        const readerIcon = L.divIcon({
            className: 'reader-marker',
            html: '<div style="width:10px;height:10px;background:#00d4ff;border-radius:50%;border:2px solid white;box-shadow:0 0 8px #00d4ff;"></div>',
            iconSize: [14, 14]
        });

        const marker = L.marker([lat, lng], { icon: readerIcon })
            .addTo(map)
            .bindPopup(`<b>Reader from</b><br>${location}`);

        locationMarkers.push(marker);
        return marker;
    }

    // Socket Listener for *this* book only
    socket.off('new_activity'); // Clean previous listeners
    socket.on('new_activity', (data) => {
        if (data.book_id === bookId || data.book === title) {
            console.log("New reader for this book!", data.location);

            // 1. Increment appropriate count based on action
            if (data.action === 'READ' || data.action === 'DOWNLOAD') {
                const readersEl = document.getElementById('detail-readers');
                if (readersEl) readersEl.innerText = parseInt(readersEl.innerText || 0) + 1;
            }
            const viewsEl = document.getElementById('detail-views');
            if (viewsEl) viewsEl.innerText = parseInt(viewsEl.innerText || 0) + 1;

            // 2. Add to Activity Log
            const feed = document.getElementById('details-activity-feed');
            if (feed) appendActivityToFeed(data, feed, true);

            // 3. Add point to heatmap and marker with location
            // Use approximate coordinates based on region/country
            const coords = getApproximateCoordinates(data.region, data.country);
            heat.addLatLng([coords.lat, coords.lng, 1]);

            // Add visible marker with location label
            const locationLabel = data.region && data.country ? `${data.region}, ${data.country}` : (data.country || 'Unknown Location');
            const newMarker = addReaderMarker(coords.lat, coords.lng, locationLabel);

            // 4. Animate map to pan to new reader location
            map.flyTo([coords.lat, coords.lng], 4, {
                duration: 2.5,
                easeLinearity: 0.25
            });

            // Pulse the new marker
            if (newMarker) {
                newMarker.openPopup();
                setTimeout(() => {
                    map.flyTo([20, 15], 2.5, { duration: 2 }); // Return to world view
                }, 3000);
            }
        }
    });
}

// Helper function to get approximate coordinates for regions/countries
function getApproximateCoordinates(region, country) {
    // Common locations database - expand as needed
    const locations = {
        'Tanzania': { lat: -6.369028, lng: 34.888822 },
        'Dar es Salaam': { lat: -6.7924, lng: 39.2083 },
        'Kenya': { lat: -0.023559, lng: 37.906193 },
        'Uganda': { lat: 1.373333, lng: 32.290275 },
        'Rwanda': { lat: -1.940278, lng: 29.873888 },
        'South Africa': { lat: -30.559482, lng: 22.937506 },
        'Nigeria': { lat: 9.081999, lng: 8.675277 },
        'United States': { lat: 37.09024, lng: -95.712891 },
        'United Kingdom': { lat: 55.378051, lng: -3.435973 },
        'Germany': { lat: 51.165691, lng: 10.451526 },
        'France': { lat: 46.227638, lng: 2.213749 },
        'China': { lat: 35.86166, lng: 104.195397 },
        'India': { lat: 20.593684, lng: 78.96288 },
        'Brazil': { lat: -14.235004, lng: -51.92528 },
        'Australia': { lat: -25.274398, lng: 133.775136 },
        'Canada': { lat: 56.130366, lng: -106.346771 }
    };

    // Try to match region first, then country
    if (region && locations[region]) {
        return locations[region];
    } else if (country && locations[country]) {
        return locations[country];
    }

    // Default to random location if not found
    return {
        lat: (Math.random() * 100) - 50,
        lng: (Math.random() * 360) - 180
    };
}

// ==========================================
// Page: Admin
// ==========================================
function initAdminDashboard() {
    loadAnalytics(); // Reuse logic to get totals

    // Listen for live updates
    socket.on('new_activity', (data) => {
        // Update stats counters
        if (data.action === 'DOWNLOAD') {
            const el = document.getElementById('admin-reads');
            if (el) el.innerText = (parseInt(el.innerText.replace(/,/g, '')) + 1).toLocaleString();
        }
        // Update Log
        prependAdminLog(data);
    });
}

function prependAdminLog(data) {
    const tbody = document.getElementById('admin-log-body');
    if (!tbody) return;

    if (tbody.innerHTML.includes('No recent activity')) tbody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.style.animation = "slideIn 0.5s ease-out";
    const actionStyle = data.action === 'UPLOAD' ? 'color: #d90; font-weight:bold;' : 'color: #002147;';

    // Fix timestamp handling
    const timestamp = data.createdAt || data.timestamp || new Date();
    const timeStr = new Date(timestamp).toLocaleTimeString();

    // Fix location extraction
    const location = data.location ||
        (data.region && data.country ? `${data.region}, ${data.country}` :
            data.country || 'Unknown');

    // Fix book title extraction
    const bookTitle = data.book || data.book_title || 'Page View';

    tr.innerHTML = `
        <td>${timeStr}</td>
        <td style="${actionStyle}">${data.action}</td>
        <td>${location}</td>
        <td>${bookTitle}</td>
    `;

    tbody.insertBefore(tr, tbody.firstChild);

    // Limit rows
    if (tbody.children.length > 20) tbody.removeChild(tbody.lastChild);
}

// ==========================================
// Page: Digital Dashboard (New)
// ==========================================
function initDashboard() {
    // 1. Initialize Map
    const map = L.map('global-map', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false
    }).setView([25, 0], 2.2); // Static World View centered

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add pulsing markers for live activity
    const markersLayer = L.layerGroup().addTo(map);

    // 2. Fetch Initial Analytics
    fetch('/api/analytics')
        .then(res => res.json())
        .then(data => {
            updateDashboardStats(data);

            // Populate heatmap/markers from historical data
            if (data.heatmap) {
                data.heatmap.forEach(log => {
                    if (log.country !== 'Unknown') {
                        const coords = getApproximateCoordinates(log.region, log.country);
                        // Add static dim markers for past activity
                        L.circleMarker([coords.lat, coords.lng], {
                            radius: 3,
                            fillColor: "#45a29e",
                            color: "#000",
                            weight: 0,
                            opacity: 0.5,
                            fillOpacity: 0.3
                        }).addTo(map);
                    }
                });
            }
        })
        .catch(console.error);

    // 3. Listen for Live Events
    socket.on('new_activity', (data) => {
        // Update Stats Counters (Simple increment for visual effect)
        incrementDashboardCounter(data.action);

        // Add to Feed
        addDashboardFeedItem(data);

        // Update Map
        if (data.location && data.location !== 'Unknown') {
            const coords = getApproximateCoordinates(data.region, data.country);

            // Create pulsing marker
            const pulseIcon = L.divIcon({
                className: 'pulse-marker',
                iconSize: [20, 20],
                html: ''
            });

            const marker = L.marker([coords.lat, coords.lng], { icon: pulseIcon }).addTo(markersLayer);

            // Remove pulse after 3 seconds but leave a dot
            setTimeout(() => {
                map.removeLayer(marker);
                L.circleMarker([coords.lat, coords.lng], {
                    radius: 4,
                    fillColor: "#66fcf1",
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(map);
            }, 3000);
        }
    });
}

function updateDashboardStats(data) {
    if (document.getElementById('dash-total-reads')) document.getElementById('dash-total-reads').innerText = data.totalReads.toLocaleString();
    if (document.getElementById('dash-total-views')) document.getElementById('dash-total-views').innerText = data.totalViews.toLocaleString();
    if (document.getElementById('dash-countries')) document.getElementById('dash-countries').innerText = data.activeCountries;
    // Estimated clicks/citations if not strictly tracked yet, or use real data if available in future
    // For now we map totalViews to views, and read to download.
}

function incrementDashboardCounter(action) {
    let id = '';
    if (action === 'DOWNLOAD') id = 'dash-total-reads';
    else if (action === 'VIEW' || action === 'PAGE_VIEW') id = 'dash-total-views';
    else if (action === 'CLICK') id = 'dash-total-clicks';
    else if (action === 'CITATION') id = 'dash-citations';

    if (id) {
        const el = document.getElementById(id);
        if (el) {
            const current = parseInt(el.innerText.replace(/,/g, ''));
            el.innerText = (current + 1).toLocaleString();
        }
    }
}

function addDashboardFeedItem(data) {
    const feed = document.getElementById('dashboard-feed');
    if (!feed) return;

    // Remove placeholders
    if (feed.querySelector('.feed-action')?.innerText.includes('Waiting')) {
        feed.innerHTML = '';
    }

    const li = document.createElement('li');
    li.className = 'feed-item';

    let icon = '⚡';
    let color = '#fff';

    if (data.action === 'DOWNLOAD') { icon = '💾'; color = '#66fcf1'; }
    if (data.action === 'CLICK') { icon = '🖱️'; color = '#45a29e'; }
    if (data.action === 'CITATION') { icon = '🎓'; color = '#f1c40f'; }
    if (data.action === 'PAGE_VIEW') { icon = '👁️'; color = '#95a5a6'; }

    li.innerHTML = `
        <div class="feed-content">
            <span class="feed-icon">${icon}</span>
            <div class="feed-info">
                <span class="feed-action" style="color:${color}">${data.action}</span>
                <span class="feed-detail">${data.book || 'Page Visit'}</span>
                <span class="feed-meta">${data.location || 'Unknown Location'} • Just now</span>
            </div>
        </div>
    `;

    feed.insertBefore(li, feed.firstChild);
    if (feed.children.length > 20) feed.removeChild(feed.lastChild);
}
initDashboard();

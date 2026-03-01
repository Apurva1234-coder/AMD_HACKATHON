// ========================================
// OFFLINE COMMUNICATION HUB - ALL FEATURES
// ========================================

let db;
let map;
let currentLocation = { lat: null, lng: null };
let userMarker = null;
let spotMarkers = [];
let currentUsername = localStorage.getItem('username') || 'User_' + Math.random().toString(36).substr(2, 5);
let watchId = null;
let locationMode = 'auto'; // 'auto' or 'manual'
let accuracyCircle = null;
let bestAccuracy = Infinity;

// Save username
localStorage.setItem('username', currentUsername);

// Category icons and colors
const categoryConfig = {
    'safe-zone': { icon: '🛡️', color: '#51cf66' },
    'medical': { icon: '🏥', color: '#ff6b6b' },
    'food': { icon: '🍽️', color: '#ffa94d' },
    'shelter': { icon: '🏠', color: '#4c6ef5' },
    'communication': { icon: '📡', color: '#9775fa' },
    'meeting': { icon: '🤝', color: '#20c997' }
};

// ========================================
// TAB SWITCHING
// ========================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Load data when switching tabs
    if (tabName === 'chat') {
        loadMessages();
    } else if (tabName === 'sos') {
        loadSOSAlerts();
    }
}

// ========================================
// INITIALIZE DATABASE
// ========================================

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('OfflineCommHubDB', 3);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Green Spots
            if (!db.objectStoreNames.contains('greenspots')) {
                const store = db.createObjectStore('greenspots', { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('category', 'category', { unique: false });
                store.createIndex('username', 'username', { unique: false });
            }

            // Messages
            if (!db.objectStoreNames.contains('messages')) {
                const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                messagesStore.createIndex('username', 'username', { unique: false });
            }

            // SOS Alerts
            if (!db.objectStoreNames.contains('sos')) {
                const sosStore = db.createObjectStore('sos', { keyPath: 'id', autoIncrement: true });
                sosStore.createIndex('timestamp', 'timestamp', { unique: false });
                sosStore.createIndex('username', 'username', { unique: false });
            }
        };
    });
}

// ========================================
// GEOLOCATION
// ========================================

function initGeolocation() {
    if (!navigator.geolocation) {
        alert('❌ Geolocation is not supported by your browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation.lat = position.coords.latitude;
            currentLocation.lng = position.coords.longitude;
            
            console.log('✅ Location obtained:', currentLocation);
            
            updateLocationDisplay();
            updateMap();
            
            // Start watching position
            startWatchingPosition();
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            handleLocationError(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function startWatchingPosition() {
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            currentLocation.lat = position.coords.latitude;
            currentLocation.lng = position.coords.longitude;
            updateUserMarker();
        },
        (error) => console.error('Watch position error:', error),
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

function handleLocationError(error) {
    let message = '';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = '❌ Location access denied. Please allow location access.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = '⚠️ Location unavailable. Using default location.';
            break;
        case error.TIMEOUT:
            message = '⚠️ Location request timeout.';
            break;
        default:
            message = '❌ Unknown location error.';
    }
    console.log(message);
}

function updateLocationDisplay() {
    if (currentLocation.lat && currentLocation.lng) {
        const modeText = locationMode === 'manual' ? 'Manual' : 'GPS';
        document.getElementById('spot-location-preview').innerHTML = 
            `📍 ${modeText} Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
        
        // Update SOS preview if exists
        const sosPreview = document.getElementById('sos-location-preview');
        if (sosPreview) {
            sosPreview.innerHTML = `📍 Location: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
        }
    }
}

// ========================================
// MANUAL LOCATION ENTRY
// ========================================

function setLocationMode(mode) {
    locationMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show/hide manual section
    const manualSection = document.getElementById('manual-location-section');
    if (manualSection) {
        if (mode === 'manual') {
            manualSection.classList.add('active');
        } else {
            manualSection.classList.remove('active');
        }
    }
    
    updateLocationDisplay();
}

async function searchPlace(placeName) {
    if (!placeName || !placeName.trim()) {
        alert('Please enter a place name');
        return;
    }

    const preview = document.getElementById('spot-location-preview');
    if (preview) {
        preview.innerHTML = '🔍 Searching for location...';
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName.trim())}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            currentLocation.lat = parseFloat(result.lat);
            currentLocation.lng = parseFloat(result.lon);

            // Update input fields
            const latInput = document.getElementById('manual-lat');
            const lngInput = document.getElementById('manual-lng');
            if (latInput && lngInput) {
                latInput.value = currentLocation.lat;
                lngInput.value = currentLocation.lng;
            }

            // Update map
            if (map) {
                map.flyTo([currentLocation.lat, currentLocation.lng], 15);
                updateUserMarker();
            }

            updateLocationDisplay();
            
            alert(`✅ Location found: ${result.display_name}`);
        } else {
            alert(`❌ Place "${placeName}" not found. Try a different name or use coordinates.`);
            if (preview) {
                preview.textContent = '❌ Place not found. Try coordinates instead.';
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('❌ Error searching for place. Please try using coordinates instead.');
        if (preview) {
            preview.textContent = '❌ Search failed. Use coordinates.';
        }
    }
}

function setManualCoordinates() {
    const latInput = document.getElementById('manual-lat');
    const lngInput = document.getElementById('manual-lng');
    
    if (!latInput || !lngInput) {
        alert('❌ Input fields not found');
        return;
    }
    
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);

    if (isNaN(lat) || isNaN(lng)) {
        alert('❌ Please enter valid latitude and longitude values');
        return;
    }

    if (lat < -90 || lat > 90) {
        alert('❌ Latitude must be between -90 and 90');
        return;
    }

    if (lng < -180 || lng > 180) {
        alert('❌ Longitude must be between -180 and 180');
        return;
    }

    currentLocation.lat = lat;
    currentLocation.lng = lng;

    // Update map
    if (map) {
        map.flyTo([lat, lng], 15);
        updateUserMarker();
    }

    updateLocationDisplay();
    
    alert('✅ Location set successfully!');
}

// ========================================
// MAP INITIALIZATION
// ========================================

function initMap() {
    const defaultLat = currentLocation.lat || 20.5937;
    const defaultLng = currentLocation.lng || 78.9629;
    
    map = L.map('map').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    console.log('✅ Map initialized');
}

function updateMap() {
    if (map && currentLocation.lat && currentLocation.lng) {
        map.setView([currentLocation.lat, currentLocation.lng], 15);
        updateUserMarker();
    }
}

function updateUserMarker() {
    if (!currentLocation.lat || !currentLocation.lng) return;

    if (userMarker) {
        userMarker.setLatLng([currentLocation.lat, currentLocation.lng]);
    } else {
        userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div style="width: 20px; height: 20px; background: #4285f4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(66, 133, 244, 0.8);"></div>',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            }),
            zIndexOffset: 1000
        }).addTo(map);
        
        userMarker.bindPopup(`
            <div class="popup-content">
                <h4>📍 Your Location</h4>
                <p><strong>Coordinates:</strong><br>${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}</p>
            </div>
        `);
    }
}

// ========================================
// GREEN SPOT MANAGEMENT
// ========================================

function addGreenSpot(description, category, notes) {
    if (!currentLocation.lat || !currentLocation.lng) {
        alert('❌ Please wait for GPS location');
        return;
    }

    const spot = {
        description,
        category,
        notes,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        username: currentUsername,
        timestamp: new Date().toISOString()
    };

    const transaction = db.transaction(['greenspots'], 'readwrite');
    const store = transaction.objectStore('greenspots');
    const request = store.add(spot);

    request.onsuccess = () => {
        console.log('✅ Green spot added');
        loadGreenSpots();
        document.getElementById('spot-form').reset();
    };

    request.onerror = () => {
        console.error('❌ Error adding green spot:', request.error);
        alert('Failed to add green spot');
    };
}

function loadGreenSpots() {
    const transaction = db.transaction(['greenspots'], 'readonly');
    const store = transaction.objectStore('greenspots');
    const request = store.getAll();

    request.onsuccess = () => {
        const spots = request.result;
        displaySpotsOnMap(spots);
    };
}

function displaySpotsOnMap(spots) {
    // Clear existing markers
    spotMarkers.forEach(marker => map.removeLayer(marker));
    spotMarkers = [];

    spots.forEach(spot => {
        const config = categoryConfig[spot.category];
        
        const marker = L.marker([spot.lat, spot.lng], {
            icon: L.divIcon({
                className: 'green-spot-marker',
                html: `<div style="font-size: 30px; text-align: center;">${config.icon}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        }).addTo(map);

        marker.bindPopup(`
            <div class="popup-content">
                <h4>${config.icon} ${spot.description}</h4>
                <p><strong>Category:</strong> ${spot.category}</p>
                <p><strong>Added by:</strong> ${spot.username}</p>
                <p><strong>Notes:</strong> ${spot.notes || 'None'}</p>
                <p><strong>Location:</strong> ${spot.lat.toFixed(6)}, ${spot.lng.toFixed(6)}</p>
                <p style="font-size: 11px; color: #666;">${new Date(spot.timestamp).toLocaleString()}</p>
            </div>
        `);

        spotMarkers.push(marker);
    });
}

// ========================================
// MESSAGING
// ========================================

function sendMessage(text) {
    if (!text || !text.trim()) return;

    // Note: Priority detection function would need to be imported from app.js
    // For now, default to general priority for map-app.js
    const priorityInfo = { 
        priority: 'general', 
        confidence: 0.5, 
        matchedKeyword: null, 
        autoAssigned: true 
    };

    const message = {
        text: text.trim(),
        username: currentUsername,
        timestamp: new Date().toISOString(),
        priorityInfo: priorityInfo
    };

    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const request = store.add(message);

    request.onsuccess = () => {
        console.log('✅ Message sent with priority:', priorityInfo.priority);
        loadMessages();
    };

    request.onerror = () => {
        console.error('❌ Error sending message:', request.error);
        alert('Failed to send message');
    };
}

function loadMessages() {
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.getAll();

    request.onsuccess = () => {
        const messages = request.result;
        displayMessages(messages);
    };
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No messages yet. Start a conversation!</p>';
        return;
    }

    container.innerHTML = '';
    
    messages.forEach(msg => {
        const isMine = msg.username === currentUsername;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isMine ? 'mine' : ''}`;
        
        const date = new Date(msg.timestamp);
        msgDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${msg.username}</span>
                <span class="message-time">${date.toLocaleTimeString()}</span>
            </div>
            <div class="message-text">${msg.text}</div>
        `;
        
        container.appendChild(msgDiv);
    });

    container.scrollTop = container.scrollHeight;
}

// ========================================
// SOS ALERTS
// ========================================

function sendSOSAlert(type, details) {
    if (!currentLocation.lat || !currentLocation.lng) {
        alert('❌ Location required for SOS alert. Please enable GPS or set manual location.');
        return;
    }

    if (!confirm('🚨 Are you sure you want to send an SOS alert? This is for emergencies only.')) {
        return;
    }

    const sos = {
        type,
        details,
        username: currentUsername,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: new Date().toISOString(),
        status: 'active'
    };

    const transaction = db.transaction(['sos'], 'readwrite');
    const store = transaction.objectStore('sos');
    const request = store.add(sos);

    request.onsuccess = () => {
        console.log('✅ SOS alert sent');
        alert('🆘 SOS Alert Sent!\nYour location has been broadcast to all users.');
        loadSOSAlerts();
        // Reset form
        const form = document.getElementById('sos-form');
        if (form) form.reset();
    };

    request.onerror = () => {
        console.error('❌ Error sending SOS:', request.error);
        alert('Failed to send SOS alert');
    };
}

function loadSOSAlerts() {
    const transaction = db.transaction(['sos'], 'readonly');
    const store = transaction.objectStore('sos');
    const request = store.getAll();

    request.onsuccess = () => {
        const alerts = request.result;
        displaySOSAlerts(alerts);
    };
}

function displaySOSAlerts(alerts) {
    const container = document.getElementById('sos-list');
    if (!container) return;
    
    if (alerts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No SOS alerts. Stay safe!</p>';
        return;
    }

    container.innerHTML = '';

    alerts.reverse().forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `sos-item ${alert.status === 'active' ? 'active' : ''}`;
        
        const date = new Date(alert.timestamp);
        alertDiv.innerHTML = `
            <h4 style="color: #ff6b6b; margin-bottom: 8px;">
                🆘 ${alert.type.toUpperCase()} EMERGENCY
            </h4>
            <p><strong>From:</strong> ${alert.username}</p>
            <p><strong>Details:</strong> ${alert.details}</p>
            <p><strong>Location:</strong> ${alert.lat.toFixed(6)}, ${alert.lng.toFixed(6)}</p>
            <p style="font-size: 12px; color: #666; margin-top: 8px;">
                ${date.toLocaleString()}
            </p>
        `;
        
        alertDiv.onclick = () => {
            switchTab('map');
            setTimeout(() => {
                if (map) {
                    map.flyTo([alert.lat, alert.lng], 17);
                }
            }, 300);
        };
        
        container.appendChild(alertDiv);
    });
}

// ========================================
// FORM HANDLERS
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize database
    await initDB();
    
    // Initialize geolocation
    initGeolocation();
    
    // Initialize map
    initMap();
    
    // Load initial data
    loadGreenSpots();
    
    // Green spot form submission
    document.getElementById('spot-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const description = document.getElementById('spot-description').value;
        const category = document.getElementById('spot-category').value;
        const notes = document.getElementById('spot-notes').value;
        addGreenSpot(description, category, notes);
    });

    // Place search field - press Enter to search
    const placeSearch = document.getElementById('place-search');
    if (placeSearch) {
        placeSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchPlace(placeSearch.value);
            }
        });
    }

    // Message form if exists
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('message-text').value;
            if (text.trim()) {
                sendMessage(text);
                document.getElementById('message-text').value = '';
            }
        });
    }

    // SOS form if exists
    const sosForm = document.getElementById('sos-form');
    if (sosForm) {
        sosForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('sos-type').value;
            const details = document.getElementById('sos-details').value;
            sendSOSAlert(type, details);
        });
    }

    console.log('✅ App initialized');
});

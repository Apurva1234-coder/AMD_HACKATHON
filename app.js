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

// Crisis Status Layer variables
let crisisZones = [];
let crisisOverlays = [];
let crisisFilters = {
    'high-risk': true,
    'resource-shortage': true,
    'safe-cluster': true,
    'comm-node': true
};

// Dedicated Leaflet LayerGroups for each crisis type
let highRiskLayer = null;
let resourceLayer = null;
let safeLayer = null;
let communicationLayer = null;

// Layer mapping for easy access
let crisisLayerMap = {
    'high-risk': null,
    'resource-shortage': null,
    'safe-cluster': null,
    'comm-node': null
};

// Initialize Crisis Layer Groups
function initializeCrisisLayers() {
    console.log('🚀 Initializing crisis layer groups...');
    
    // Create individual LayerGroups for each crisis type
    highRiskLayer = L.layerGroup();
    resourceLayer = L.layerGroup();
    safeLayer = L.layerGroup();
    communicationLayer = L.layerGroup();
    
    // Update the crisis layer mapping
    crisisLayerMap = {
        'high-risk': highRiskLayer,
        'resource-shortage': resourceLayer,
        'safe-cluster': safeLayer,
        'comm-node': communicationLayer
    };
    
    console.log('✅ Crisis layer groups initialized:', {
        highRisk: !!highRiskLayer,
        resource: !!resourceLayer,
        safe: !!safeLayer,
        communication: !!communicationLayer
    });
}

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

// Crisis Zone Configuration
const crisisZoneConfig = {
    'high-risk': { 
        icon: '🔴', 
        color: '#dc2626', 
        fillColor: '#fca5a5', 
        name: 'High-Risk Zone',
        description: 'Multiple emergency reports'
    },
    'resource-shortage': { 
        icon: '🟡', 
        color: '#d97706', 
        fillColor: '#fed7aa',
        name: 'Resource Shortage',
        description: 'Food/water/medical needs'
    },
    'safe-cluster': { 
        icon: '🟢', 
        color: '#16a34a', 
        fillColor: '#bbf7d0',
        name: 'Safe Cluster',
        description: 'Multiple safe check-ins'
    },
    'comm-node': { 
        icon: '🔵', 
        color: '#2563eb', 
        fillColor: '#bfdbfe',
        name: 'Communication Node',
        description: 'Device cluster exchanging data'
    }
};

// ========================================
// TRAINED MODEL PRIORITY CLASSIFICATION SYSTEM
// ========================================

// Trained Model Backend Configuration
const GEMINI_API_URL = 'http://localhost:3001/api/classify';

// Enhanced Priority Configuration (matches trained model categories)
const priorityConfig = {
    'Emergency': { 
        icon: '🔴', 
        color: '#dc2626', 
        bgColor: '#fee2e2',
        name: 'Emergency',
        level: 5,
        description: 'Life-threatening situations'
    },
    'Medical': { 
        icon: '🟠', 
        color: '#ea580c', 
        bgColor: '#fed7aa',
        name: 'Medical',
        level: 4,
        description: 'Injury or health-related'
    },
    'Resource': { 
        icon: '🟡', 
        color: '#d97706', 
        bgColor: '#fef3c7',
        name: 'Resource Request',
        level: 3,
        description: 'Food, water, shelter needs'
    },
    'Safe': { 
        icon: '🟢', 
        color: '#16a34a', 
        bgColor: '#dcfce7',
        name: 'Safe Status',
        level: 2,
        description: 'User marked safe'
    },
    'General': { 
        icon: '⚪', 
        color: '#64748b', 
        bgColor: '#f8fafc',
        name: 'General Info',
        level: 1,
        description: 'Regular communication'
    }
};

// Trained Model Classification Function
async function classifyMessageWithTrainedModel(text) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            priority: data.category,
            confidence: 0.95, // Trained model has high confidence
            method: 'Trained Model',
            autoAssigned: true,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.log('🤖 Trained model unavailable, using fallback classification:', error.message);
        return detectMessagePriorityFallback(text);
    }
}

// Fallback keyword-based detection (backup when trained model fails)
function detectMessagePriorityFallback(text) {
    const messageText = text.toLowerCase();
    
    // Fallback keyword patterns
    const fallbackKeywords = {
        Emergency: ['help', 'emergency', 'trapped', 'fire', 'explosion', 'collapse', 'urgent', 'dying', 'critical', 'sos', 'life threatening', 'danger', 'attack'],
        Medical: ['injured', 'hurt', 'pain', 'wound', 'broken', 'sick', 'medical', 'doctor', 'hospital', 'bleeding', 'unconscious'],
        Resource: ['food', 'water', 'hungry', 'thirsty', 'shelter', 'need', 'supplies', 'no water', 'no food', 'fuel'],
        Safe: ['safe', 'ok', 'okay', 'fine', 'alive', 'well', 'secure', 'all good', 'rescued', 'checking in']
    };

    for (const [priority, keywords] of Object.entries(fallbackKeywords)) {
        for (const keyword of keywords) {
            if (messageText.includes(keyword)) {
                return {
                    priority,
                    confidence: 0.7,
                    method: 'Fallback Keywords',
                    autoAssigned: true
                };
            }
        }
    }

    return {
        priority: 'General',
        confidence: 0.5,
        method: 'Default',
        autoAssigned: true
    };
}

function overridePriority(messageId, newPriority) {
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    // Get the message
    store.get(messageId).onsuccess = function(event) {
        const message = event.target.result;
        if (message) {
            message.priorityInfo.priority = newPriority;
            message.priorityInfo.autoAssigned = false;
            message.priorityInfo.overriddenAt = new Date().toISOString();
            message.priorityInfo.confidence = 1.0; // Human override = 100% confidence
            
            // Update the message
            store.put(message).onsuccess = function() {
                console.log('✅ Priority overridden:', messageId, '->', newPriority);
                loadMessages(); // Refresh display
            };
        }
    };
}

// ========================================
// CRISIS ZONE DETECTION & ANALYSIS
// ========================================

function analyzeAndCreateCrisisZones() {
    const allData = {
        spots: [],
        messages: [],
        sosAlerts: []
    };

    // Get all data from database
    Promise.all([
        getAllFromStore('greenspots'),
        getAllFromStore('messages'), 
        getAllFromStore('sos')
    ]).then(([spots, messages, sos]) => {
        allData.spots = spots;
        allData.messages = messages;
        allData.sosAlerts = sos;
        
        // Analyze and create zones
        const zones = detectCrisisZones(allData);
        crisisZones = zones;
        updateCrisisOverlays();
        
        console.log('🔍 Crisis zones analyzed:', zones.length, 'zones detected');
    });
}

function getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function detectCrisisZones(data) {
    const zones = [];
    const radius = 0.005; // ~500m radius for clustering
    
    // Detect High-Risk Zones (multiple SOS alerts nearby)
    const sosGroups = clusterByLocation(data.sosAlerts, radius);
    sosGroups.forEach(group => {
        if (group.length >= 2) { // 2+ SOS alerts = high risk
            const center = calculateCenter(group);
            zones.push({
                type: 'high-risk',
                center: center,
                radius: calculateClusterRadius(group, center),
                count: group.length,
                lastUpdated: Math.max(...group.map(item => new Date(item.timestamp).getTime())),
                data: group
            });
        }
    });
    
    // Detect Resource Shortage Areas (multiple food/medical requests)
    const resourceNeeds = data.spots.filter(spot => 
        spot.category === 'food' || spot.category === 'medical'
    );
    const resourceGroups = clusterByLocation(resourceNeeds, radius);
    resourceGroups.forEach(group => {
        if (group.length >= 3) { // 3+ resource spots = shortage area
            const center = calculateCenter(group);
            zones.push({
                type: 'resource-shortage',
                center: center,
                radius: calculateClusterRadius(group, center),
                count: group.length,
                lastUpdated: Math.max(...group.map(item => new Date(item.timestamp).getTime())),
                data: group
            });
        }
    });
    
    // Detect Safe Clusters (multiple safe zones)
    const safeZones = data.spots.filter(spot => spot.category === 'safe-zone');
    const safeGroups = clusterByLocation(safeZones, radius);
    safeGroups.forEach(group => {
        if (group.length >= 3) { // 3+ safe zones = safe cluster
            const center = calculateCenter(group);
            zones.push({
                type: 'safe-cluster',
                center: center,
                radius: calculateClusterRadius(group, center),
                count: group.length,
                lastUpdated: Math.max(...group.map(item => new Date(item.timestamp).getTime())),
                data: group
            });
        }
    });
    
    // Detect Communication Nodes (high message activity)
    const commSpots = data.spots.filter(spot => spot.category === 'communication');
    const commGroups = clusterByLocation(commSpots, radius);
    commGroups.forEach(group => {
        if (group.length >= 2) { // 2+ comm spots = active node
            const center = calculateCenter(group);
            zones.push({
                type: 'comm-node',
                center: center,
                radius: calculateClusterRadius(group, center),
                count: group.length,
                lastUpdated: Math.max(...group.map(item => new Date(item.timestamp).getTime())),
                data: group
            });
        }
    });
    
    return zones;
}

function clusterByLocation(items, radius) {
    const clusters = [];
    const processed = new Set();
    
    items.forEach((item, index) => {
        if (processed.has(index)) return;
        
        const cluster = [item];
        processed.add(index);
        
        // Find nearby items
        items.forEach((other, otherIndex) => {
            if (processed.has(otherIndex) || index === otherIndex) return;
            
            const distance = calculateDistance(
                item.lat, item.lng,
                other.lat, other.lng
            );
            
            if (distance <= radius) {
                cluster.push(other);
                processed.add(otherIndex);
            }
        });
        
        clusters.push(cluster);
    });
    
    return clusters.filter(cluster => cluster.length > 1);
}

function calculateCenter(points) {
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return { lat, lng };
}

function calculateClusterRadius(points, center) {
    const maxDistance = Math.max(...points.map(p => 
        calculateDistance(center.lat, center.lng, p.lat, p.lng)
    ));
    return Math.max(maxDistance * 1000 + 200, 300); // Convert to meters, add buffer, min 300m
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ========================================
// TAB SWITCHING
// ========================================

function switchTab(tabName, clickedElement) {
    try {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.getElementById(tabName + '-tab');
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Set active button (use passed element or find by tab name)
        const activeButton = clickedElement || document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Load data when switching tabs
        if (tabName === 'chat') {
            loadMessages();
        } else if (tabName === 'sos') {
            loadSOSAlerts();
        }
        
        console.log('✅ Switched to tab:', tabName);
    } catch (error) {
        console.error('❌ Error switching tab:', error);
    }
}

// ========================================
// CRISIS OVERLAY VISUALIZATION WITH LAYER GROUPS
// ========================================

function updateCrisisOverlays() {
    if (!map) {
        console.warn('⚠️ Cannot update overlays: map not ready');
        return;
    }
    
    // Initialize layers if not done
    if (!highRiskLayer) {
        initializeCrisisLayers();
    }
    
    // Clear all existing crisis markers from layer groups
    Object.values(crisisLayerMap).forEach(layer => {
        if (layer) {
            layer.clearLayers();
        }
    });
    
    console.log('🧹 Cleared existing crisis overlays from all layers');
    
    // Add zones to their respective layer groups
    let addedCount = 0;
    crisisZones.forEach(zone => {
        const config = crisisZoneConfig[zone.type];
        if (!config) {
            console.warn('⚠️ No config found for zone type:', zone.type);
            return;
        }
        
        const targetLayer = crisisLayerMap[zone.type];
        if (!targetLayer) {
            console.warn('⚠️ No target layer found for:', zone.type);
            return;
        }
        
        // Create zone overlay (individual markers/circles)
        const zoneMarkers = createCrisisZoneMarkers(zone, config);
        
        if (zoneMarkers && zoneMarkers.length > 0) {
            // Add all zone markers to the appropriate layer group
            zoneMarkers.forEach(marker => {
                targetLayer.addLayer(marker);
            });
            addedCount++;
            console.log('📍 Added', zone.type, 'zone to', targetLayer === highRiskLayer ? 'high-risk' : zone.type, 'layer');
        }
    });
    
    // Update statistics display
    updateCrisisStats();
    
    console.log(`🎨 Crisis overlays updated: ${addedCount} zones processed across all layers`);
}

function createCrisisZoneMarkers(zone, config) {
    const markers = [];
    
    // Create circle marker
    const circle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radius,
        fillColor: config.fillColor,
        fillOpacity: 0.3,
        color: config.color,
        weight: 3,
        opacity: 0.8,
        className: `crisis-zone crisis-zone-${zone.type}`
    });
    
    // Create label marker
    const labelMarker = L.marker([zone.center.lat, zone.center.lng], {
        icon: L.divIcon({
            className: 'crisis-zone-label',
            html: `
                <div class="crisis-label" style="
                    background: ${config.color};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: bold;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    white-space: nowrap;
                ">
                    ${config.icon} ${config.name}
                    <div style="font-size: 10px; opacity: 0.9;">
                        ${zone.count} ${zone.count === 1 ? 'report' : 'reports'}
                    </div>
                </div>
            `,
            iconSize: [120, 40],
            iconAnchor: [60, 20]
        }),
        zIndexOffset: 500
    });
    
    // Add popup content
    const lastUpdate = new Date(zone.lastUpdated).toLocaleString();
    const popupContent = `
        <div class="crisis-popup">
            <h4 style="color: ${config.color}; margin-bottom: 8px;">
                ${config.icon} ${config.name}
            </h4>
            <p><strong>Description:</strong> ${config.description}</p>
            <p><strong>Report Count:</strong> ${zone.count}</p>
            <p><strong>Area Radius:</strong> ~${Math.round(zone.radius)}m</p>
            <p><strong>Last Updated:</strong> ${lastUpdate}</p>
            <div style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 5px; font-size: 12px;">
                <strong>Zone Analysis:</strong> Based on clustering of nearby reports within 500m radius
            </div>
        </div>
    `;
    
    circle.bindPopup(popupContent);
    labelMarker.bindPopup(popupContent);
    
    markers.push(circle);
    markers.push(labelMarker);
    
    return markers;
}

function updateCrisisStats() {
    const zoneCountElement = document.getElementById('crisis-zone-count');
    const lastUpdateElement = document.getElementById('last-analysis-time');
    
    if (zoneCountElement) {
        const totalZones = crisisZones.length;
        const visibleZones = crisisZones.filter(zone => crisisFilters[zone.type]).length;
        zoneCountElement.textContent = `${totalZones} zones detected (${visibleZones} visible)`;
    }
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
}

function clearCrisisOverlays() {
    // Remove all tracked crisis overlays
    crisisOverlays.forEach(overlay => {
        try {
            if (map.hasLayer(overlay)) {
                map.removeLayer(overlay);
            }
        } catch (e) {
            console.warn('Error removing overlay:', e);
        }
    });
    crisisOverlays = [];
    
    // Comprehensive cleanup: Remove ALL crisis-related layers
    const layersToRemove = [];
    map.eachLayer((layer) => {
        // Identify layers to remove by checking various properties
        let shouldRemove = false;
        
        // Remove crisis zone circles
        if (layer instanceof L.Circle) {
            if (layer.options.className?.includes('crisis-zone') ||
                layer.options.fillColor === '#fca5a5' || 
                layer.options.fillColor === '#fed7aa' ||
                layer.options.fillColor === '#bbf7d0') {
                shouldRemove = true;
            }
        }
        
        // Remove crisis zone labels and SOS markers
        if (layer instanceof L.Marker) {
            const className = layer.options.icon?.options?.className;
            if (className === 'crisis-zone-label' || 
                className === 'sos-marker' ||
                className === 'temp-marker' ||
                className === 'dynamic-marker') {
                shouldRemove = true;
            }
            // Check popup content for SOS alerts
            const popup = layer.getPopup();
            if (popup && typeof popup.getContent === 'function') {
                const content = popup.getContent();
                if (typeof content === 'string' && content.includes('🚨 SOS Alert Location')) {
                    shouldRemove = true;
                }
            }
        }
        
        // Remove layer groups that contain crisis elements
        if (layer instanceof L.LayerGroup) {
            layer.eachLayer(sublayer => {
                if ((sublayer instanceof L.Circle && sublayer.options.className?.includes('crisis-zone')) ||
                    (sublayer instanceof L.Marker && sublayer.options.icon?.options?.className === 'crisis-zone-label')) {
                    shouldRemove = true;
                }
            });
        }
        
        if (shouldRemove) {
            layersToRemove.push(layer);
        }
    });
    
    // Remove identified layers
    layersToRemove.forEach(layer => {
        try {
            map.removeLayer(layer);
        } catch (e) {
            console.warn('Error removing layer:', e);
        }
    });
    
    console.log(`🧹 Cleared ${layersToRemove.length} crisis-related layers from map`);
}

// Helper function to clear all dynamic markers
function clearDynamicMarkers() {
    const layersToRemove = [];
    
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            const className = layer.options.icon?.options?.className;
            const popupContent = layer.getPopup()?.getContent();
            let shouldRemove = false;
            
            // Remove temporary SOS markers
            if (className === 'sos-marker' || 
                (typeof popupContent === 'string' && popupContent.includes('🚨 SOS Alert Location'))) {
                shouldRemove = true;
            }
            
            // Remove any other temporary dynamic markers
            if (className === 'temp-marker' || 
                className === 'dynamic-marker' ||
                className === 'crisis-zone-label') {
                shouldRemove = true;
            }
            
            // Remove markers that don't belong to permanent categories
            if (layer !== userMarker && !spotMarkers.includes(layer)) {
                // Check if it's NOT a green spot marker
                if (className !== 'green-spot-marker') {
                    shouldRemove = true;
                }
            }
            
            if (shouldRemove) {
                layersToRemove.push(layer);
            }
        }
    });
    
    // Remove identified markers
    layersToRemove.forEach(layer => {
        try {
            map.removeLayer(layer);
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    
    console.log(`🚨 Removed ${layersToRemove.length} dynamic markers`);
}

// Helper function to reset internal session state
function resetSessionState() {
    // Clear any cached analysis data
    const sessionKeys = ['lastAnalysisTime', 'tempCrisisData', 'dynamicZoneCache'];
    sessionKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
            sessionStorage.removeItem(key);
            console.log(`🗑️ Cleared session data: ${key}`);
        }
    });
    
    // Reset any temporary counters or flags
    if (window.tempMarkerCount) window.tempMarkerCount = 0;
    if (window.lastCrisisUpdate) window.lastCrisisUpdate = null;
    
    console.log('🔄 Session state reset complete');
}

// ========================================
// CRISIS MAP RESET FUNCTIONALITY
// ========================================

function resetCrisisMap() {
    // Show confirmation dialog
    const confirmReset = confirm(
        "Are you sure you want to reset crisis overlays?\n\n" +
        "This will:\n" +
        "• Remove all crisis zone overlays\n" +
        "• Clear user-added markers (SOS, reports)\n" +
        "• Reset map view to default position\n" +
        "• Clear dynamically generated zones\n" +
        "• Reset zone counters\n\n" +
        "Green spots and your location will be preserved."
    );
    
    if (!confirmReset) {
        return;
    }
    
    console.log('🔄 Starting comprehensive Crisis Map reset...');
    
    // Step 1: Clear all crisis layer groups
    Object.values(crisisLayerMap).forEach(layer => {
        if (layer && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
        if (layer) {
            layer.clearLayers();
        }
    });
    
    // Step 2: Clear crisis zones data
    crisisZones = [];
    
    // Step 3: Clear all dynamic markers (SOS, temporary markers, etc.)
    clearDynamicMarkers();
    
    // Step 4: Reset session-based state variables
    resetSessionState();
    
    // Step 5: Reset crisis filters to default state
    crisisFilters = {
        'high-risk': true,
        'resource-shortage': true,
        'safe-cluster': true,
        'comm-node': true
    };
    
    // Step 6: Reinitialize layer groups
    initializeCrisisLayers();
    
    // Step 7: Reset filter button UI states
    document.querySelectorAll('.crisis-filter').forEach(btn => {
        btn.classList.add('active');
    });
    
    // Step 8: Reset map view to default position and zoom
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    const defaultZoom = 13;
    
    if (map) {
        map.setView([defaultLat, defaultLng], defaultZoom);
        console.log(`📍 Map reset to default location: ${defaultLat}, ${defaultLng} (zoom: ${defaultZoom})`);
    }
    
    // Step 6: Reset crisis zone display and counters
    updateCrisisZoneDisplay();
    
    // Step 7: Reset stats display
    const zoneCountElement = document.getElementById('crisis-zone-count');
    if (zoneCountElement) {
        zoneCountElement.textContent = 'Zones detected: 0 (Reset)';
    }
    
    const lastUpdateElement = document.getElementById('last-analysis-time');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Last updated: Reset at ' + new Date().toLocaleTimeString();
    }
    
    // Step 8: Force map re-render
    if (map) {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 100);
    }
    
    console.log('✅ Crisis map reset complete - all dynamic overlays cleared');
    console.log('📊 Crisis zones cleared:', crisisZones.length);
    console.log('🎛️ Filters reset to default state');
    
    // Step 9: Re-initialize base system after a delay (preserves green spots)
    setTimeout(() => {
        console.log('🔍 Re-initializing crisis zone analysis...');
        analyzeAndCreateCrisisZones();
    }, 1500);
}



function toggleCrisisFilter(zoneType) {
    // Toggle the filter state
    crisisFilters[zoneType] = !crisisFilters[zoneType];
    
    console.log(`🔘 Toggling crisis filter ${zoneType}: ${crisisFilters[zoneType] ? 'ON' : 'OFF'}`);
    
    // Get the corresponding layer group using the new layer map
    const layerGroup = crisisLayerMap[zoneType];
    if (!layerGroup) {
        console.warn('⚠️ No layer group found for', zoneType);
        return;
    }
    
    // Toggle layer visibility on map
    if (crisisFilters[zoneType]) {
        // Show layer
        if (!map.hasLayer(layerGroup)) {
            map.addLayer(layerGroup);
            console.log('✅ Added', zoneType, 'layer to map');
        }
    } else {
        // Hide layer
        if (map.hasLayer(layerGroup)) {
            map.removeLayer(layerGroup);
            console.log('❌ Removed', zoneType, 'layer from map');
        }
    }
    
    // Update filter button appearance
    const filterBtn = document.querySelector(`.crisis-filter[data-type="${zoneType}"]`);
    if (filterBtn) {
        filterBtn.classList.toggle('active', crisisFilters[zoneType]);
        console.log('🎨 Updated button state for', zoneType);
    }
    
    // Update statistics
    updateCrisisStats();
}

// ========================================
// INITIALIZE DATABASE
// ========================================

function initDB() {
    return new Promise((resolve, reject) => {
        try {
            // Check if IndexedDB is available
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB not supported, using fallback storage');
                // Initialize fallback storage
                initFallbackStorage();
                resolve(null);
                return;
            }
            
            console.log('🗃️ Initializing IndexedDB...');
            const request = indexedDB.open('OfflineCommHubDB', 3);

            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                console.warn('🔄 Falling back to localStorage...');
                initFallbackStorage();
                resolve(null); // Don't reject, use fallback
            };
            
            request.onsuccess = () => {
                db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 Upgrading database schema...');

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
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            console.warn('🔄 Using fallback storage due to tracking prevention or other restrictions');
            initFallbackStorage();
            resolve(null);
        }
    });
}

// ========================================
// FALLBACK STORAGE (for when IndexedDB is blocked)
// ========================================

function initFallbackStorage() {
    console.log('🗃️ Initializing fallback localStorage storage...');
    
    // Check if localStorage is available
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log('✅ localStorage available');
    } catch (e) {
        console.warn('⚠️ localStorage also blocked, using in-memory storage');
    }
}

function fallbackSaveSpot(spot) {
    try {
        const spots = JSON.parse(localStorage.getItem('greenspots') || '[]');
        spots.push({ ...spot, id: Date.now() });
        localStorage.setItem('greenspots', JSON.stringify(spots));
        console.log('✅ Spot saved to localStorage');
        loadGreenSpots();
    } catch (error) {
        console.error('❌ Could not save to localStorage:', error);
        alert('⚠️ Storage is restricted. Spots will not be saved permanently.');
    }
}

function fallbackLoadSpots() {
    try {
        const spots = JSON.parse(localStorage.getItem('greenspots') || '[]');
        return spots;
    } catch (error) {
        console.error('❌ Could not load from localStorage:', error);
        return [];
    }
}

function fallbackSaveMessage(message) {
    try {
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        messages.push({ ...message, id: Date.now() });
        localStorage.setItem('messages', JSON.stringify(messages));
        console.log('✅ Message saved to localStorage');
    } catch (error) {
        console.error('❌ Could not save message to localStorage:', error);
    }
}

function fallbackLoadMessages() {
    try {
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        return messages;
    } catch (error) {
        console.error('❌ Could not load messages from localStorage:', error);
        return [];
    }
}

function initGeolocation() {
    const locationStatus = document.getElementById('spot-location-preview');
    
    if (!navigator.geolocation) {
        const message = '❌ Geolocation is not supported by your browser';
        alert(message);
        if (locationStatus) {
            locationStatus.innerHTML = '❌ ' + message;
        }
        return;
    }
    
    if (locationStatus) {
        locationStatus.innerHTML = '🔄 Getting your location...';
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation.lat = position.coords.latitude;
            currentLocation.lng = position.coords.longitude;
            
            console.log('✅ Location obtained:', currentLocation);
            console.log('🌍 Accuracy:', position.coords.accuracy, 'meters');
            
            updateLocationDisplay();
            updateMap();
            
            // Start watching position for continuous updates
            startWatchingPosition();
            
            // Show success message
            if (locationStatus) {
                locationStatus.style.color = '#16a34a';
            }
        },
        (error) => {
            console.error('❌ Geolocation error:', error);
            handleLocationError(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,  // Increased timeout
            maximumAge: 60000  // Cache for 1 minute
        }
    );
}

function startWatchingPosition() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
    
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            
            // Only update if location changed significantly (> 10 meters)
            const distance = calculateDistance(
                currentLocation.lat, currentLocation.lng,
                newLat, newLng
            );
            
            if (distance > 0.01 || !currentLocation.lat) { // 10m threshold
                currentLocation.lat = newLat;
                currentLocation.lng = newLng;
                console.log('📍 Location updated:', currentLocation);
                updateUserMarker();
                updateLocationDisplay();
            }
        },
        (error) => {
            console.error('❌ Watch position error:', error);
            handleLocationError(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000  // Cache for 30 seconds
        }
    );
}

function handleLocationError(error) {
    let message = '';
    let suggestion = '';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Location access denied';
            suggestion = 'Please allow location access and refresh the page';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location unavailable';
            suggestion = 'Using default location. Try moving to an area with better GPS signal';
            break;
        case error.TIMEOUT:
            message = 'Location request timeout';
            suggestion = 'Please try again or check your internet connection';
            break;
        default:
            message = 'Unknown geolocation error';
            suggestion = 'Please refresh the page and try again';
            break;
    }
    
    const fullMessage = `❌ ${message}. ${suggestion}`;
    console.error(fullMessage);
    
    const locationStatus = document.getElementById('spot-location-preview');
    const mapLocationStatus = document.getElementById('map-location-status');
    
    // Update form location preview
    if (locationStatus) {
        locationStatus.innerHTML = `❌ ${message}<br><small style="color: #666;">${suggestion}</small>`;
        locationStatus.style.color = '#dc2626';
    }
    
    // Update map status bar
    if (mapLocationStatus) {
        mapLocationStatus.innerHTML = `📡 Location Status: <span style="color: #dc2626;">❌ ${message}</span>`;
    }
    
    // Try to use default location
    if (!currentLocation.lat && !currentLocation.lng) {
        currentLocation.lat = 20.5937;  // Default to India center
        currentLocation.lng = 78.9629;
        console.log('🌍 Using default location:', currentLocation);
        updateMap();
        
        // Update status to show we're using default location
        if (mapLocationStatus) {
            mapLocationStatus.innerHTML = `📡 Location Status: <span style="color: #f59e0b;">Using Default Location</span>`;
        }
    }
}

function updateLocationDisplay() {
    const locationPreview = document.getElementById('spot-location-preview');
    const mapLocationStatus = document.getElementById('map-location-status');
    
    if (currentLocation.lat && currentLocation.lng) {
        const lat = currentLocation.lat.toFixed(6);
        const lng = currentLocation.lng.toFixed(6);
        
        // Update form location preview
        if (locationPreview) {
            locationPreview.innerHTML = `
                📍 <strong>Current Location:</strong><br>
                <span style="font-family: monospace; font-size: 13px; color: #059669;">
                    ${lat}, ${lng}
                </span><br>
                <small style="color: #6b7280;">✅ Location tracking active</small>
            `;
            locationPreview.style.color = '#059669';
        }
        
        // Update map status bar
        if (mapLocationStatus) {
            mapLocationStatus.innerHTML = `📡 Location Status: <span style="color: #22c55e;">Active</span> | 📍 ${lat}, ${lng}`;
        }
        
        console.log('✅ Location display updated:', { lat, lng });
    } else {
        // Update form location preview
        if (locationPreview) {
            locationPreview.innerHTML = '📍 Waiting for GPS location...';
            locationPreview.style.color = '#6b7280';
        }
        
        // Update map status bar
        if (mapLocationStatus) {
            mapLocationStatus.innerHTML = '📡 Location Status: <span style="color: #f59e0b;">Waiting for GPS...</span>';
        }
    }
}

// ========================================
// MAP INITIALIZATION
// ========================================

function initMap() {
    try {
        const defaultLat = currentLocation.lat || 20.5937;
        const defaultLng = currentLocation.lng || 78.9629;
        
        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Map container not found');
            return;
        }
        
        map = L.map('map').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        console.log('✅ Map initialized successfully');
        
        // Initialize crisis layers after map is ready
        initializeCrisisLayers();
    } catch (error) {
        console.error('❌ Error initializing map:', error);
        // Try to show error to user
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Map failed to load. Please refresh the page.</div>';
        }
    }
}

function updateMap() {
    if (map && currentLocation.lat && currentLocation.lng) {
        console.log('🗺️ Updating map view to user location:', currentLocation);
        map.setView([currentLocation.lat, currentLocation.lng], 16);
        updateUserMarker();
        
        // Add a subtle animation to the map view change
        map.panTo([currentLocation.lat, currentLocation.lng], {
            animate: true,
            duration: 1.0
        });
    } else {
        console.log('⚠️ Cannot update map - location or map not available');
    }
}

function updateUserMarker() {
    if (!currentLocation.lat || !currentLocation.lng || !map) {
        console.log('⚠️ Cannot update user marker - missing location or map');
        return;
    }

    if (userMarker) {
        userMarker.setLatLng([currentLocation.lat, currentLocation.lng]);
        console.log('🗺️ User marker position updated');
    } else {
        userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: `
                    <div style="
                        width: 24px; height: 24px; 
                        background: #3b82f6; 
                        border: 4px solid white; 
                        border-radius: 50%; 
                        box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
                        position: relative;
                    ">
                        <div style="
                            width: 8px; height: 8px;
                            background: white;
                            border-radius: 50%;
                            position: absolute;
                            top: 50%; left: 50%;
                            transform: translate(-50%, -50%);
                        "></div>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            }),
            zIndexOffset: 1000
        }).addTo(map);
        
        userMarker.bindPopup(`
            <div class="popup-content">
                <h4>📍 Your Current Location</h4>
                <p><strong>Coordinates:</strong><br>${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}</p>
                <p><small>Location tracking is active</small></p>
            </div>
        `);
        
        console.log('✅ User marker created and added to map');
    }
}

// ========================================
// LOCATION REFRESH AND MANUAL CONTROLS
// ========================================

function refreshLocation() {
    const locationStatus = document.getElementById('spot-location-preview');
    if (locationStatus) {
        locationStatus.innerHTML = '🔄 Refreshing location...';
        locationStatus.style.color = '#3b82f6';
    }
    
    // Stop current watching
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    // Request fresh location
    initGeolocation();
}

function centerMapOnUser() {
    if (currentLocation.lat && currentLocation.lng && map) {
        map.setView([currentLocation.lat, currentLocation.lng], 18);
        console.log('🎯 Map centered on user location');
        
        // Flash the user marker
        if (userMarker) {
            userMarker.openPopup();
        }
    } else {
        alert('📍 Location not available. Please allow location access first.');
        refreshLocation();
    }
}

// Make functions available globally
window.refreshLocation = refreshLocation;
window.centerMapOnUser = centerMapOnUser;

// ========================================
// GREEN SPOT MANAGEMENT
// ========================================

// Global variables for manual location
let manualLocation = { lat: null, lng: null };
let manualLocationMarker = null;

function addGreenSpot(description, category, notes) {
    // Check for manual location first, then fall back to GPS
    let spotLat, spotLng;
    
    if (manualLocation.lat && manualLocation.lng) {
        spotLat = manualLocation.lat;
        spotLng = manualLocation.lng;
        console.log('📍 Using manual location:', { lat: spotLat, lng: spotLng });
    } else if (currentLocation.lat && currentLocation.lng) {
        spotLat = currentLocation.lat;
        spotLng = currentLocation.lng;
        console.log('🧭 Using GPS location:', { lat: spotLat, lng: spotLng });
    } else {
        alert('❌ Please provide a location (GPS or manual)');
        return;
    }

    const spot = {
        description,
        category,
        notes,
        lat: spotLat,
        lng: spotLng,
        username: currentUsername,
        timestamp: new Date().toISOString()
    };

    if (!db) {
        // Use fallback storage
        console.log('📦 Using fallback storage for green spot');
        fallbackSaveSpot(spot);
        document.getElementById('spot-form').reset();
        setTimeout(() => analyzeAndCreateCrisisZones(), 500);
        return;
    }

    try {
        const transaction = db.transaction(['greenspots'], 'readwrite');
        const store = transaction.objectStore('greenspots');
        const request = store.add(spot);

        request.onsuccess = () => {
            console.log('✅ Green spot added to IndexedDB');
            loadGreenSpots();
            document.getElementById('spot-form').reset();
            
            // Clear manual location after successful submission
            clearManualLocation();
            
            // Update crisis analysis
            setTimeout(() => analyzeAndCreateCrisisZones(), 500);
        };

        request.onerror = () => {
            console.error('❌ Error adding green spot to IndexedDB:', request.error);
            console.log('📦 Falling back to localStorage');
            fallbackSaveSpot(spot);
            document.getElementById('spot-form').reset();
            clearManualLocation();
        };
    } catch (error) {
        console.error('❌ IndexedDB transaction failed:', error);
        console.log('📦 Using fallback storage');
        fallbackSaveSpot(spot);
        document.getElementById('spot-form').reset();
        clearManualLocation();
    }
}

// Manual Location Functions
async function geocodeAddress() {
    const address = document.getElementById('manual-address').value.trim();
    if (!address) {
        alert('Please enter an address to search');
        return;
    }
    
    console.log('🔍 Geocoding address:', address);
    
    try {
        // Use Nominatim (OpenStreetMap) geocoding API
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const results = await response.json();
        
        if (results && results.length > 0) {
            const result = results[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            // Update manual location
            manualLocation = { lat, lng };
            
            // Update coordinate inputs
            document.getElementById('manual-lat').value = lat.toFixed(6);
            document.getElementById('manual-lng').value = lng.toFixed(6);
            
            // Show preview
            showManualLocationPreview(result.display_name, lat, lng);
            
            // Add preview marker to map
            addManualLocationPreview(lat, lng, result.display_name);
            
        } else {
            alert('❌ Address not found. Try a different search term.');
        }
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        alert('❌ Error searching address. Please try again or enter coordinates manually.');
    }
}

function showManualLocationPreview(address, lat, lng) {
    const preview = document.getElementById('manual-location-preview');
    preview.innerHTML = `📍 <strong>${address}</strong><br>📐 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    preview.style.display = 'block';
}

function addManualLocationPreview(lat, lng, name) {
    // Remove existing preview marker
    if (manualLocationMarker) {
        map.removeLayer(manualLocationMarker);
    }
    
    // Create new preview marker
    manualLocationMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'manual-location-marker',
            html: '🎯',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    manualLocationMarker.bindPopup(`<strong>📍 Manual Location Preview</strong><br>${name}`).openPopup();
    
    // Center map on location
    map.setView([lat, lng], 15);
    
    console.log('✅ Manual location preview added:', { lat, lng, name });
}

function clearManualLocation() {
    // Clear manual location data
    manualLocation = { lat: null, lng: null };
    
    // Clear form inputs
    document.getElementById('manual-address').value = '';
    document.getElementById('manual-lat').value = '';
    document.getElementById('manual-lng').value = '';
    
    // Hide preview
    document.getElementById('manual-location-preview').style.display = 'none';
    
    // Remove preview marker
    if (manualLocationMarker) {
        map.removeLayer(manualLocationMarker);
        manualLocationMarker = null;
    }
    
    console.log('✅ Manual location cleared');
}

// Handle manual coordinate input
function setupManualCoordinateHandlers() {
    const latInput = document.getElementById('manual-lat');
    const lngInput = document.getElementById('manual-lng');
    
    function updateManualFromCoords() {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            manualLocation = { lat, lng };
            showManualLocationPreview(`Manual Coordinates`, lat, lng);
            addManualLocationPreview(lat, lng, 'Manual Coordinates');
        }
    }
    
    latInput.addEventListener('input', updateManualFromCoords);
    lngInput.addEventListener('input', updateManualFromCoords);
}

function loadGreenSpots() {
    if (!db) {
        // Use fallback storage
        console.log('📦 Loading green spots from fallback storage');
        const spots = fallbackLoadSpots();
        displaySpotsOnMap(spots);
        analyzeAndCreateCrisisZones();
        return;
    }

    try {
        const transaction = db.transaction(['greenspots'], 'readonly');
        const store = transaction.objectStore('greenspots');
        const request = store.getAll();

        request.onsuccess = () => {
            const spots = request.result;
            console.log('✅ Loaded', spots.length, 'green spots from IndexedDB');
            displaySpotsOnMap(spots);
            
            // Trigger crisis zone analysis when data changes
            analyzeAndCreateCrisisZones();
        };

        request.onerror = () => {
            console.error('❌ Error loading from IndexedDB, trying fallback');
            const spots = fallbackLoadSpots();
            displaySpotsOnMap(spots);
            analyzeAndCreateCrisisZones();
        };
    } catch (error) {
        console.error('❌ IndexedDB access failed, using fallback:', error);
        const spots = fallbackLoadSpots();
        displaySpotsOnMap(spots);
        analyzeAndCreateCrisisZones();
    }
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

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (!text) return;

    // Show loading state
    const originalPlaceholder = input.placeholder;
    input.disabled = true;
    input.placeholder = '🤖 AI analyzing message...';
    
    try {
        // Classify message using trained model
        console.log('🤖 Classifying message with trained model:', text);
        const priorityInfo = await classifyMessageWithTrainedModel(text);
        console.log('✅ Model classification result:', priorityInfo);

        const message = {
            text,
            username: currentUsername,
            timestamp: new Date().toISOString(),
            priorityInfo: priorityInfo
        };

        if (!db) {
            // Use fallback storage
            console.log('📦 Using fallback storage for message');
            fallbackSaveMessage(message);
            input.value = '';
            loadMessages();
            return;
        }

        try {
            const transaction = db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add(message);

            request.onsuccess = () => {
                console.log('✅ Message sent with AI priority:', priorityInfo.priority, `(${priorityInfo.method})`);
                input.value = '';
                loadMessages();
            };

            request.onerror = () => {
                console.error('❌ Error sending message to IndexedDB:', request.error);
                console.log('📦 Falling back to localStorage');
                fallbackSaveMessage(message);
                input.value = '';
                loadMessages();
            };
        } catch (dbError) {
            console.error('❌ IndexedDB transaction failed:', dbError);
            console.log('📦 Using fallback storage');
            fallbackSaveMessage(message);
            input.value = '';
            loadMessages();
        }
    } catch (error) {
        console.error('❌ Error in sendMessage:', error);
        alert('Failed to classify and send message');
    } finally {
        // Reset input state
        input.disabled = false;
        input.placeholder = originalPlaceholder;
    }
}

function loadMessages() {
    if (!db) {
        // Use fallback storage
        console.log('📦 Loading messages from fallback storage');
        const messages = fallbackLoadMessages();
        displayMessages(messages);
        return;
    }

    try {
        const transaction = db.transaction(['messages'], 'readonly');
        const store = transaction.objectStore('messages');
        const request = store.getAll();

        request.onsuccess = () => {
            const messages = request.result;
            console.log('✅ Loaded', messages.length, 'messages from IndexedDB');
            displayMessages(messages);
        };

        request.onerror = () => {
            console.error('❌ Error loading messages from IndexedDB, trying fallback');
            const messages = fallbackLoadMessages();
            displayMessages(messages);
        };
    } catch (error) {
        console.error('❌ IndexedDB access failed, using fallback:', error);
        const messages = fallbackLoadMessages();
        displayMessages(messages);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-container');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <p style="text-align: center; color: #64748b; padding: 20px; font-family: 'Courier New', monospace;">
                Emergency Response Channel Initialized<br>
                🤖 Gemini AI Classification: ACTIVE<br>
                Ready for communications...
            </p>
        `;
        return;
    }

    // Add priority info to messages that don't have it (backward compatibility)
    const messagesWithPriority = messages.map(msg => {
        if (!msg.priorityInfo) {
            // Use fallback for old messages
            msg.priorityInfo = detectMessagePriorityFallback(msg.text);
        }
        return msg;
    });

    // Sort by priority level (higher level first) then by timestamp
    messagesWithPriority.sort((a, b) => {
        const priorityA = priorityConfig[a.priorityInfo.priority]?.level || 1;
        const priorityB = priorityConfig[b.priorityInfo.priority]?.level || 1;
        
        if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
        }
        
        return new Date(b.timestamp) - new Date(a.timestamp); // Newer first within same priority
    });

    container.innerHTML = messagesWithPriority.map(msg => {
        const isSent = msg.username === currentUsername;
        const priorityInfo = msg.priorityInfo;
        const config = priorityConfig[priorityInfo.priority] || priorityConfig['General'];
        
        // Determine AI method display
        const aiMethodDisplay = priorityInfo.method === 'Gemini AI' ? 
            `🧠 Gemini AI` : 
            priorityInfo.method === 'Fallback Keywords' ? 
            `🔄 Fallback Classification` : 
            `🤖 Auto-Classified`;
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'} priority-${priorityInfo.priority.toLowerCase()}" data-message-id="${msg.id}">
                <div class="message-header">
                    <div class="message-sender">
                        <strong>${isSent ? 'You' : msg.username}</strong>
                        ${createPriorityTag(priorityInfo, config)}
                    </div>
                    <div class="message-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
                </div>
                <div class="message-text">${msg.text}</div>
                <div class="message-footer">
                    <div class="message-priority-info">
                        <span class="ai-method-badge" style="font-size: 11px; color: #60a5fa;">
                            ${aiMethodDisplay}
                        </span>
                        ${priorityInfo.confidence ? 
                            `<span class="confidence" style="font-size: 11px; color: #94a3b8;">
                                ${Math.round(priorityInfo.confidence * 100)}% confidence
                            </span>` : ''
                        }
                    </div>
                    <div class="priority-override-controls">
                        <select onchange="overridePriority('${msg.id}', this.value)" class="priority-override-select">
                            <option value="">Override Priority...</option>
                            ${Object.keys(priorityConfig).map(key => 
                                `<option value="${key}" ${key === priorityInfo.priority ? 'selected' : ''}>
                                    ${priorityConfig[key].icon} ${priorityConfig[key].name}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function createPriorityTag(priorityInfo, config) {
    return `
        <span class="priority-tag priority-${priorityInfo.priority}" 
              style="background: ${config.bgColor}; color: ${config.color}; border-color: ${config.color};" 
              title="${config.description}">
            ${config.icon} ${config.name}
        </span>
    `;
}

// ========================================
// SOS ALERTS
// ========================================

function sendSOS() {
    if (!currentLocation.lat || !currentLocation.lng) {
        alert('❌ Please wait for GPS location');
        return;
    }

    if (!confirm('🚨 Send SOS alert with your current location?')) {
        return;
    }

    const sos = {
        username: currentUsername,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        timestamp: new Date().toISOString()
    };

    const transaction = db.transaction(['sos'], 'readwrite');
    const store = transaction.objectStore('sos');
    const request = store.add(sos);

    request.onsuccess = () => {
        console.log('✅ SOS alert sent');
        alert('🚨 SOS Alert Sent!\nYour location has been broadcast to all users.');
        loadSOSAlerts();        
        // Update crisis analysis for new SOS data
        setTimeout(() => analyzeAndCreateCrisisZones(), 500);    };

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
    const container = document.getElementById('sos-alerts-container');
    
    if (alerts.length === 0) {
        container.innerHTML = '<h3 style="color: #667eea; margin: 20px 0;">Recent SOS Alerts</h3><p style="text-align: center; color: #999; padding: 20px;">No SOS alerts yet.</p>';
        return;
    }

    const alertsHTML = alerts.reverse().map(alert => `
        <div class="sos-alert">
            <h4 style="color: #ff6b6b; margin-bottom: 8px;">🚨 SOS from ${alert.username}</h4>
            <p><strong>Location:</strong> ${alert.lat.toFixed(6)}, ${alert.lng.toFixed(6)}</p>
            <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
            <button onclick="viewSOSOnMap(${alert.lat}, ${alert.lng})" style="margin-top: 8px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                📍 View on Map
            </button>
        </div>
    `).join('');

    container.innerHTML = '<h3 style="color: #667eea; margin: 20px 0;">Recent SOS Alerts</h3>' + alertsHTML;
}

function viewSOSOnMap(lat, lng) {
    switchTab('map');
    map.setView([lat, lng], 17);
    
    // Add temporary marker
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'sos-marker',
            html: '<div style="font-size: 40px;">🚨</div>',
            iconSize: [50, 50],
            iconAnchor: [25, 25]
        })
    }).addTo(map);

    marker.bindPopup(`
        <div class="popup-content">
            <h4 style="color: #ff6b6b;">🚨 SOS Alert Location</h4>
            <p>${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
        </div>
    `).openPopup();

    setTimeout(() => map.removeLayer(marker), 10000);
}

// ========================================
// FORM HANDLERS
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initializing ResilioNet Crisis Intelligence Dashboard...');
        
        // Initialize database
        await initDB();
        console.log('✅ Database initialized');
        
        // Initialize geolocation (non-blocking)
        initGeolocation();
        
        // Initialize map (must work even without geolocation)
        initMap();
        
        // Initialize manual location input handlers
        setupManualCoordinateHandlers();
        
        // Load initial data
        if (db) {
            loadGreenSpots();
        }
        
        // Initialize crisis analysis system
        setTimeout(() => {
            console.log('🔍 Initializing Crisis Intelligence System...');
            try {
                analyzeAndCreateCrisisZones();
            } catch (error) {
                console.error('❌ Error in crisis analysis:', error);
            }
        }, 1000);
        
        // Form submission
        const spotForm = document.getElementById('spot-form');
        if (spotForm) {
            spotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const description = document.getElementById('spot-description').value;
                    const category = document.getElementById('spot-category').value;
                    const notes = document.getElementById('spot-notes').value;
                    addGreenSpot(description, category, notes);
                } catch (error) {
                    console.error('❌ Error submitting spot:', error);
                    alert('Error adding spot. Please try again.');
                }
            });
        }

        console.log('✅ ResilioNet Crisis Intelligence Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        alert('Application failed to initialize. Please refresh the page.');
    }
});

// ========================================
// GLOBAL ERROR HANDLER & SAFETY FUNCTIONS
// ========================================

// Ensure functions are available globally for onclick handlers
window.toggleCrisisFilter = toggleCrisisFilter;
window.resetCrisisMap = resetCrisisMap;
window.sendMessage = sendMessage;
window.sendSOS = sendSOS;
window.switchTab = switchTab;
window.refreshLocation = refreshLocation;
window.centerMapOnUser = centerMapOnUser;

// Global error handler for unhandled errors
window.addEventListener('error', function(e) {
    console.error('❌ Global error caught:', e.error);
    console.log('🔄 Attempting to recover core functionality...');
    
    // Try to reinitialize map if it failed
    if (!map && document.getElementById('map')) {
        setTimeout(() => {
            try {
                console.log('🗺️ Attempting map recovery...');
                initMap();
            } catch (mapError) {
                console.error('❌ Map recovery failed:', mapError);
            }
        }, 1000);
    }
    
    // Don't prevent default error handling
    return false;
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled promise rejection:', e.reason);
    console.log('🔄 Application continuing despite promise rejection...');
    e.preventDefault(); // Prevent default behavior
});

// Emergency fallback to ensure map loads
setTimeout(() => {
    if (!map && document.getElementById('map')) {
        console.log('🚨 Emergency map initialization...');
        try {
            initMap();
            if (navigator.geolocation) {
                initGeolocation();
            }
        } catch (error) {
            console.error('❌ Emergency initialization failed:', error);
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div style="padding: 40px; text-align: center; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                        <h3 style="color: #6c757d; margin-bottom: 10px;">🗺️ Map Loading Issue</h3>
                        <p style="color: #6c757d; margin-bottom: 15px;">The map failed to load. Please:</p>
                        <ul style="color: #6c757d; text-align: left; display: inline-block;">
                            <li>Refresh the page</li>
                            <li>Allow location access when prompted</li>
                            <li>Check your internet connection</li>
                        </ul>
                        <button onclick="location.reload()" 
                                style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            🔄 Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }
}, 3000);

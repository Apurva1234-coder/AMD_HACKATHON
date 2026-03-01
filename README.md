#  Green Spot Mapper - User Guide

##  What This Does

A **real-time location-based system** where:
-  Users mark "Green Spots" (safe zones) using their **actual GPS coordinates**
-  **ALL users** can see spots marked by everyone
-  Spots are saved permanently in the browser (IndexedDB)
-  Works offline after first load
-  Shows distance from your location to each spot

---

##  How to Use

### **Step 1: Allow Location Access**

When you open the page, your browser will ask:
```
"Allow location access?"
```
**Click "Allow"** - This is REQUIRED to:
- Get your GPS coordinates
- Mark green spots at your location
- Calculate distances to other spots

### **Step 2: Wait for GPS Lock**

Top of page shows:
-  Getting your location...` → Wait
-  GPS Active` → Ready!

Your coordinates appear: `28.123456, 77.654321`

### **Step 3: Add a Green Spot**

1. **Fill the form** in the right sidebar:
   - **Description:** "Community Center"
   - **Category:** Select type (Safe Zone, Medical, Food, etc.)
   - **Additional Info:** Optional details

2. **Click " Add Green Spot"**

3. **What happens:**
   - Spot is marked at YOUR CURRENT GPS location
   -  Green marker appears on map
   -  Saved to database
   -  ALL users can now see it!

### **Step 4: View All Spots**

- **Map:** See all green spots with colored markers
- **Sidebar List:** Shows all spots with:
  - Description & category
  - Who added it
  - Distance from you
  - Date/time added

- **Click any spot** in the list to:
  - Zoom to that location on map
  - Open its info popup

### **Step 5: Filter Spots**

Use filter buttons:
- **All** - Show everything
- **Safe Zone** - Only safe zones
- **Medical** - Only medical facilities
- **Food** - Only food/water locations

---

##  Key Features

###  **Real GPS Coordinates**
- Usss `navigator.geolocation` API
- Gets your **actual device location**
- Continuously updates your position
- High accuracy mode enabled

### 2️ **Multi-User Sharing**
- **veryone** who opens the page sees ALL spots
- Spots saved in IndexedDB (local database)
- No server needed - peer-to-peer concept
- Data persists across browser sessions

### 3️ **Smart Distance Calculation**
- Calculates real distance using Haversine formula
- Shows in meters (< 1km) or kilometers
- Updates based on your current location

### 4️ **Category System**
Different types of green spots:
-  **Safe Zone** - General safe areas
-  **Medical** - Hospitals, clinics
-  **Food** - Food/water sources
-  **Shelter** - Temporary shelters
-  **Communication** - Signal hubs
-  **Meeting Point** - Gathering places

### 5️ **Interactive Map**
- Click markers to see details
- Zoom in/out
- Pan around
- Your location shown with pulsing blue dot

---

##  Controls Explained
### ** Find My Location**
- Centers map on your current position
- Opens your location popup

### ** Mark Green Spot Here**
- Scrolls to the form
- Ready to add new spot

### ** Refresh Spots**
- Reloads all spots from database
- Updates the list and map

---

##  How It Works (Technical)

### **GPS Tracking:**
```javascript
navigator.geolocation.getCurrentPosition()
navigator.geolocation.watchPosition()
```
- Requests device location
- Watches for position changes
- High accuracy enabled

### **Data Storage:**
```
IndexedDB → GreenSpotDB
  ↳ greenspots table
      - id (auto)
      - lat, lng (GPS coordinates)
      - description
      - category
      - username
      - timestamp
      - notes
```

### **Coordinate System:**
- Latitude: -90 to +90 (North/South)
- Longitude: -180 to +180 (East/West)
- Example: `28.6139, 77.2090` (New Delhi)

---

##  Testing Scenarios

### **Test 1: Add Your First Spot**
1. Allow location access
2. Wait for GPS lock
3. Fill form: "My Home - Safe Zone"
4. Click "Add Green Spot"
5.  See marker on map at your location!

### **Test 2: Multiple Users**
1. Open in another browser/device
2. Allow location there too
3. Add a different spot
4.  Both users see BOTH spots!

### **Test 3: Filter by Category**
1. Add spots of different categories
2. Click "Medical" filter
3.  Only medical spots shown

### **Test 4: Distance Calculation**
1. Add a spot
2. Move to different location (or simulate)
3.  Distance updates automatically

---

##  Troubleshooting

### **"Location access denied"**
**Fix:**
1. Click the  lock icon in browser address bar
2. Allow location permissions
3. Refresh page

### **"Waiting for GPS..."**
**Fix:**
- Make sure you're not indoors (weak GPS)
- Wait 10-30 seconds for satellite lock
- Check if location services are ON in device settings

### **"Spots not appearing"**
**Fix:**
1. Click " Refresh Spots"
2. Check browser console (F12) for errors
3. Clear IndexedDB and try again

### **Map not loading**
**Fix:**
- Check internet connection (needed for map tiles)
- Tiles are cached after first load
- Try refreshing page

---

##  Use Cases

### **Emergency Situations:**
- Mark safe buildings during disaster
- Share medical facility locations
- Indicate food/water sources
- Meeting points for groups

### **Community Mapping:**
- Document local resources
- Share hidden safe spaces
- Build neighborhood awareness

### **Offline Communication:**
- Pre-mark locations before going offline
- Others can see even without internet
- Data syncs when connection returns

---

##  Data Persistence

### **Stored Locally:**
- All spots saved in browser's IndexedDB
- Survives browser restarts
- No server needed
- Each user has their own database

### **Sharing Between Users:**
In real deployment, you'd add:
- Backend server (Flask/Node.js)
- API endpoints for sync
- WebSocket for real-time updates
- Cloud database (Firebase/MongoDB)

**Current Version:** Simulates multi-user by using local storage

---

##  Mobile Usage

Works great on mobile devices!

**Benefits:**
- Real GPS from phone
- Add spots while moving
- Touch-friendly interface
- Responsive design

**How to use on phone:**
1. Open in mobile browser
2. Allow location access
3. Move around to add spots
4. Perfect for field mapping!

---

##  Quick Reference

| Action | How To |
|--------|--------|
| Allow GPS | Browser popup → "Allow" |
| Add Spot | Fill form → Click "Add Green Spot" |
| View Spot | Click in list or map marker |
| Filter | Click category buttons |
| Find Me | Click "Find My Location" |
| Refresh | Click " Refresh Spots" |
| Change Name | Edit in "User Profile" → Save |

---

##  Now Running At:

**charming-melomakarona-274bff.netlify.app**

1. **Allow location access** when prompted
2. **Wait for GPS lock** (10-30 seconds)
3. **Add your first green spot!**

---

**✅ Ready to map safe zones! 🗺️**


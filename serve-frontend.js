const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// Route for the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🌐 Crisis Mapping Frontend Server running at:`);
    console.log(`📱 http://localhost:${PORT}`);
    console.log(`🖥️  Backend API: http://localhost:3001`);
    console.log(`🚀 Open your browser to see the complete system!`);
});
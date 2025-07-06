require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing
app.use(cors());

// Serve static files (CSS, client-side JS) from the "public" folder
app.use(express.static(path.join(__dirname, '../public')));

// Serve image files from the "items" folder
app.use('/items', express.static(path.join(__dirname, '../items')));

// --- HTML Route ---
const viewsPath = path.join(__dirname, '../views');

// Serve the buy-met.html page as the main page for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(viewsPath, 'buy-met.html'));
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
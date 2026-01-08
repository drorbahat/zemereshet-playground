const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Simple static server - no authentication
app.use(express.static('public'));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎨 Liquid Glass Playground running at http://localhost:${PORT}`);
});

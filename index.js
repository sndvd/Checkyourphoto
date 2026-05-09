const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const publicDir = path.join(__dirname, 'public');
    
    try {
        // We look inside the public folder for ANY file that looks like index.html
        const files = fs.readdirSync(publicDir);
        const actualFile = files.find(f => f.toLowerCase().trim().startsWith('index.html'));

        if (actualFile) {
            console.log(`>>> FORCE LOADING: ${actualFile}`);
            res.sendFile(path.join(publicDir, actualFile));
        } else {
            res.status(404).send("Could not find any file starting with index.html in the public folder.");
        }
    } catch (e) {
        res.status(500).send("Error reading public folder: " + e.message);
    }
});

// Serve assets (graphics)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => console.log(`Server live on port ${port}`));

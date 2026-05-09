const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

/**
 * THE MASTER FINDER
 * This searches every folder in your project to find index.html
 */
function findIndexHtml(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.lstatSync(fullPath);
        
        if (stat.isDirectory()) {
            // Don't look in these folders, they are too big
            if (file === 'node_modules' || file === '.git') continue;
            const found = findIndexHtml(fullPath);
            if (found) return found;
        } else if (file.toLowerCase().includes('index.html')) {
            return fullPath;
        }
    }
    return null;
}

app.get('/', (req, res) => {
    const filePath = findIndexHtml(__dirname);
    if (filePath) {
        console.log(">>> SUCCESS: Serving website from " + filePath);
        res.sendFile(filePath);
    } else {
        res.status(404).send("Error: Could not find index.html anywhere in your GitHub project.");
    }
});

// This part makes sure your icons (assets) load no matter where they are
app.use('/assets', (req, res, next) => {
    const spots = [
        path.join(__dirname, 'public', 'assets', req.url),
        path.join(__dirname, 'assets', req.url),
        path.join(__dirname, 'Public', 'assets', req.url)
    ];
    for (let spot of spots) {
        if (fs.existsSync(spot)) return res.sendFile(spot);
    }
    next();
});

app.listen(port, () => console.log(`Server live on port ${port}`));

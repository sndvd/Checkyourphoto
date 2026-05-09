console.log(">>> SMART BOOT INITIATED...");

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

/**
 * SMART FILE FINDER
 * This looks for your index.html in several common places
 */
function findIndexHtml() {
    const spots = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'Public', 'index.html'),
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'index.HTML')
    ];

    for (let spot of spots) {
        if (fs.existsSync(spot)) {
            console.log(`>>> SUCCESS: Found index.html at: ${spot}`);
            return spot;
        }
    }
    return null;
}

// Show the website
app.get('/', (req, res) => {
    const indexPath = findIndexHtml();
    if (indexPath) {
        res.sendFile(indexPath);
    } else {
        // This part helps us debug if it still fails
        const files = fs.readdirSync(__dirname);
        res.status(404).send(`
            <h1>File Not Found</h1>
            <p>I looked for index.html but couldn't find it.</p>
            <p><strong>Files I see in your project:</strong> ${files.join(', ')}</p>
            <p>Please make sure you have a folder named <strong>public</strong> and a file named <strong>index.html</strong> inside it.</p>
        `);
    }
});

// Serve images and graphics
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'Public', 'assets')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`>>> SERVER ACTIVE ON PORT ${port}`);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// 1. Tell the server where to look for images (Assets)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'Public', 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

// 2. THE EMERGENCY FINDER
app.get('/', (req, res) => {
    // We will look in every possible place for the index file
    const possibleSpots = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'Public', 'index.html'),
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'index.htm'),
    ];

    for (let spot of possibleSpots) {
        if (fs.existsSync(spot)) {
            console.log("SUCCESS: Found file at " + spot);
            return res.sendFile(spot);
        }
    }

    // If we still can't find it, let's look for ANY file that ends in .html
    try {
        const publicPath = path.join(__dirname, 'public');
        if (fs.existsSync(publicPath)) {
            const files = fs.readdirSync(publicPath);
            const htmlFile = files.find(f => f.toLowerCase().includes('.html'));
            if (htmlFile) {
                return res.sendFile(path.join(publicPath, htmlFile));
            }
            res.status(404).send(`Found public folder, but it only contains: ${files.join(', ')}`);
        } else {
            res.status(404).send("Could not find the 'public' folder.");
        }
    } catch (e) {
        res.status(500).send("Error: " + e.message);
    }
});

// 3. THE SCAN ENGINE
app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `up-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.json({ ...metadata, ai_summary: "AI Summary Active", gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null });
    } catch (e) {
        res.status(500).json({ error: 'Scan failed' });
    }
});

app.listen(port, () => console.log(`Server live on port ${port}`));

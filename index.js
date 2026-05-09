const express = require('express');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

/**
 * THE FORCE SEARCH
 */
app.get('/', (req, res) => {
    const publicPath = path.join(__dirname, 'public');
    try {
        const files = fs.readdirSync(publicPath);
        // This line ignores hidden spaces at the end of the name
        const actualFile = files.find(f => f.toLowerCase().trim().startsWith('index.html'));

        if (actualFile) {
            console.log(">>> SUCCESS: Loading " + actualFile);
            res.sendFile(path.join(publicPath, actualFile));
        } else {
            res.status(404).send("Error: Could not find index.html in the public folder.");
        }
    } catch (e) {
        res.status(500).send("Error reading public folder.");
    }
});

/**
 * THE SCAN ENGINE
 */
app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.json({
            ...metadata,
            ai_summary: "AI Analysis: Preview Mode Active.",
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.listen(port, () => console.log(`App live on port ${port}`));

// --- LINE 1: START OF CODE ---
console.log(">>> SYSTEM BOOTING UP...");

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Load Optional Tools
let exiftool;
try {
    const ev = require('exiftool-vendored');
    exiftool = ev.exiftool;
    console.log(">>> METADATA ENGINE: READY");
} catch (e) {
    console.log(">>> METADATA ENGINE: ERROR LOADING");
}

let multer;
try {
    multer = require('multer');
    console.log(">>> UPLOAD ENGINE: READY");
} catch (e) {
    console.log(">>> UPLOAD ENGINE: ERROR LOADING");
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Set up the static folder for your website
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// MAIN PAGE ROUTE
app.get('/', (req, res) => {
    const htmlFile = path.join(publicPath, 'index.html');
    if (fs.existsSync(htmlFile)) {
        res.sendFile(htmlFile);
    } else {
        res.status(404).send("Error: index.html not found in the public folder.");
    }
});

// UPLOAD API
if (multer) {
    const upload = multer({ storage: multer.memoryStorage() });
    app.post('/api/extract', upload.single('file'), async (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        if (!exiftool) return res.status(500).json({ error: 'Engine offline' });

        const tempPath = path.join(os.tmpdir(), `up-${Date.now()}`);
        try {
            fs.writeFileSync(tempPath, req.file.buffer);
            const metadata = await exiftool.read(tempPath, ["-n"]);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            
            res.json({
                ...metadata,
                ai_summary: "AI Summary is currently in Preview Mode.",
                gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
            });
        } catch (e) {
            res.status(500).json({ error: 'Extraction failed' });
        }
    });
}

// HEALTH CHECK
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`>>> SERVER ACTIVE ON PORT ${port}`);
    console.log(`>>> SEARCHING FOR FILES IN: ${publicPath}`);
});
// --- END OF CODE ---

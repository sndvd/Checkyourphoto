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

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        // We use -n to get decimal numbers, and -G to look at all metadata groups
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        // --- DEEP GPS HUNT ---
        const lat = metadata.GPSLatitude || metadata.GPSDestLatitude || (metadata.Composite && metadata.Composite.GPSLatitude);
        const lon = metadata.GPSLongitude || metadata.GPSDestLongitude || (metadata.Composite && metadata.Composite.GPSLongitude);

        const captureDate = metadata.DateTimeOriginal || metadata.CreationDate || metadata.DateCreated;
        const softwareDate = metadata.ModifyDate || metadata.MetadataDate;

        res.json({
            ...metadata,
            display_captured: captureDate ? captureDate.toString() : null,
            display_edited: softwareDate ? softwareDate.toString() : null,
            gps: (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send("index.html missing");
});

app.listen(port, () => console.log(`Forensic System Online`));

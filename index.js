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
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        // --- FORENSIC DATE LOGIC ---
        // We IGNORE 'FileModifyDate' because it often shows the time of upload (misleading)
        // We only pull dates that are EMBEDDED in the image data
        const captureDate = metadata.DateTimeOriginal || metadata.CreationDate || metadata.DateCreated;
        const softwareDate = metadata.ModifyDate || metadata.MetadataDate;

        let aiSummary = "ANALYSIS COMPLETE. ";
        if (!captureDate) {
            aiSummary += "ALERT: EMBEDDED DATE DATA STRIPPED. Your computer may show a 'Created' date, but that is a local system record, not part of the photo's internal identity. ";
        } else {
            aiSummary += "INTERNAL CAMERA SIGNATURE DETECTED. ";
        }

        res.json({
            ...metadata,
            display_captured: captureDate ? captureDate.toString() : null,
            display_edited: softwareDate ? softwareDate.toString() : null,
            ai_summary: aiSummary,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send("index.html missing");
});

app.listen(port, () => console.log(`Forensic Engine Active`));

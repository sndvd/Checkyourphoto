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
        
        // --- DEEP DATE SEARCH ---
        // We look for every possible date tag in the file
        const created = metadata.DateTimeOriginal || metadata.CreateDate || metadata.CreationDate || metadata.DateCreated || metadata.DateTimeDigitized;
        const modified = metadata.FileModifyDate || metadata.ModifyDate || metadata.MetadataDate;

        // --- DEEP AI & EDIT SEARCH ---
        let aiDetection = "NO AI SIGNATURE DETECTED";
        const allText = JSON.stringify(metadata).toLowerCase();
        const software = (metadata.Software || metadata.CreatorTool || "").toLowerCase();
        
        if (software.includes('photoshop') || software.includes('canva') || software.includes('gimp')) {
            aiDetection = "DIGITAL ALTERATION DETECTED (SOFTWARE)";
        } else if (allText.includes('midjourney') || allText.includes('dall-e') || allText.includes('stable diffusion') || allText.includes('ai generated') || allText.includes('generative')) {
            aiDetection = "AI GENERATION SIGNATURE DETECTED";
        }

        // --- DEEP GPS SEARCH ---
        const lat = metadata.GPSLatitude || metadata.GPSDestLatitude;
        const lon = metadata.GPSLongitude || metadata.GPSDestLongitude;

        res.json({
            ...metadata,
            display_created: created ? created.toString() : null,
            display_modified: modified ? modified.toString() : null,
            display_ai: aiDetection,
            gps: (lat && lon) ? { lat, lon } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send("index.html missing");
});

app.listen(port, () => console.log(`Forensic Engine Active`));

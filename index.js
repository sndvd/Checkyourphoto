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

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send("index.html not found");
});

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        // --- SMART FORENSIC SUMMARY LOGIC ---
        let summary = "ANALYSIS COMPLETE. ";
        
        // Check for AI / Software Edits
        const software = (metadata.Software || metadata.CreatorTool || "").toLowerCase();
        if (software.includes('photoshop') || software.includes('canva')) {
            summary += "ALERT: DIGITAL ALTERATION DETECTED. ";
        } else if (software.includes('midjourney') || software.includes('dall-e') || software.includes('ai')) {
            summary += "ALERT: AI GENERATION SIGNATURE DETECTED. ";
        } else if (!metadata.DateTimeOriginal && !metadata.gps) {
            summary += "SIGNATURES STRIPPED (LIKELY SOCIAL MEDIA/WHATSAPP). ";
        } else {
            summary += "METADATA INTEGRITY APPEARS HIGH. ";
        }

        res.json({
            ...metadata,
            ai_summary: summary,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.listen(port, () => console.log(`Forensic System Live on ${port}`));

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
app.use(express.json());

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        // --- 1. SIGNATURE-BASED DETECTION (NO FALSE POSITIVES) ---
        const make = (metadata.Make || "").toLowerCase();
        const software = (metadata.Software || metadata.CreatorTool || "").toLowerCase();
        const sourceType = (metadata.DigitalSourceType || "").toLowerCase();
        const allText = JSON.stringify(metadata).toLowerCase();
        
        // Whitelist known authentic cameras
        const isCamera = ['apple', 'samsung', 'google', 'sony', 'nikon', 'canon', 'fujifilm', 'panasonic', 'olympus', 'leica'].some(m => make.includes(m));
        
        // Specific AI detection (not just "ai" string)
        const isAI = ['midjourney', 'dall-e', 'stable diffusion', 'firefly', 'trainedalgorithmicmedia'].some(m => allText.includes(m) || software.includes(m) || sourceType.includes(m));
        const isEdited = ['photoshop', 'canva', 'gimp', 'lightroom'].some(m => software.includes(m));

        // --- 2. THE NEUTRAL OBSERVATION ---
        let observation = "";
        if (isAI) {
            observation = "🤖 SIGNATURE DETECTED: The file contains technical markers used by AI generative engines.";
        } else if (isEdited) {
            observation = "🛠️ EDITING TRACE: Metadata indicates the file was processed or saved using editing software.";
        } else if (isCamera) {
            observation = `📸 HARDWARE MATCH: Data is consistent with an original capture from a ${metadata.Make} device.`;
        } else {
            observation = "🔍 NOTE: High-level device metadata is missing. This is characteristic of files processed by messaging apps (WhatsApp/Instagram) or screenshots.";
        }

        // --- 3. EMBEDDED DATES ONLY (REMOVES MISLEADING UPLOAD TIMES) ---
        const captureDate = metadata.DateTimeOriginal || metadata.CreateDate || metadata.DateCreated;
        const modifiedDate = metadata.ModifyDate || metadata.MetadataDate;

        res.json({
            ...metadata,
            display_captured: captureDate ? captureDate.toString() : null,
            display_edited: modifiedDate ? modifiedDate.toString() : null,
            display_observation: observation,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Forensic System Active`));

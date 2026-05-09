const express = require('express');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        
        // --- 1. FORENSIC SIGNATURE LOGIC ---
        const make = (metadata.Make || "").toLowerCase();
        const software = (metadata.Software || metadata.CreatorTool || "").toLowerCase();
        const allText = JSON.stringify(metadata).toLowerCase();
        
        // Whitelist: Known Camera Manufacturers
        const isHardwareMake = ['apple', 'samsung', 'google', 'sony', 'nikon', 'canon', 'fujifilm', 'panasonic', 'olympus', 'leica'].some(m => make.includes(m));
        
        // Blacklist: Known AI & Editing Tools
        const isAI = ['midjourney', 'dall-e', 'stable diffusion', 'firefly', 'generative'].some(m => allText.includes(m) || software.includes(m));
        const isEdited = ['photoshop', 'canva', 'gimp', 'lightroom'].some(m => software.includes(m));

        // --- 2. NEUTRAL OBSERVATION GENERATOR ---
        let observation = "";
        if (isAI) {
            observation = "🤖 SIGNATURE DETECTED: The file contains technical markers used by AI generative engines.";
        } else if (isEdited) {
            observation = "🛠️ EDITING TRACE: Metadata shows the file was processed or saved using editing software.";
        } else if (isHardwareMake) {
            observation = `📸 HARDWARE MATCH: Data is consistent with a capture from a ${metadata.Make} device.`;
        } else {
            observation = "🔍 NOTE: High-level device metadata is missing. Common in files from social media/messaging apps.";
        }

        // --- 3. EMBEDDED DATE ONLY (THE TRUTH) ---
        const captureDate = metadata.DateTimeOriginal || metadata.CreateDate || metadata.DateCreated;
        const modifiedDate = metadata.ModifyDate || metadata.MetadataDate;

        res.json({
            ...metadata,
            display_captured: captureDate ? captureDate.toString() : null,
            display_modified: modifiedDate ? modifiedDate.toString() : null,
            display_observation: observation,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Forensic Engine Active on Port ${port}`));

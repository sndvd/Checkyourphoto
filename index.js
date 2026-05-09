const express = require('express');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// AI Setup
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Upload Setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

/**
 * 1. THE IMAGE FIX
 * This tells the server to look for images in every possible folder
 */
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

/**
 * 2. THE WEBSITE FIX
 * This forces index.html to load correctly
 */
app.get('/', (req, res) => {
    const spots = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'index.html')
    ];
    for (let spot of spots) {
        if (fs.existsSync(spot)) return res.sendFile(spot);
    }
    res.status(404).send("Website files not found. Please check your public folder on GitHub.");
});

/**
 * 3. THE SCAN ENGINE (Initiate Scan)
 */
app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `up-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        let aiSummary = "[PREVIEW MODE] To enable AI analysis, add your OpenAI Key to Render.";
        if (openai) {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are a forensic metadata translator. Stay factual." },
                        { role: "user", content: `Translate this: ${JSON.stringify(metadata)}` }
                    ]
                });
                aiSummary = response.choices[0].message.content;
            } catch (e) { aiSummary = "AI analysis unavailable."; }
        }
        
        res.json({
            ...metadata,
            ai_summary: aiSummary,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) {
        res.status(500).json({ error: 'Extraction failed' });
    }
});

// Placeholders for other buttons
app.post('/api/telemetry', (req, res) => res.json({ status: 'ok' }));
app.post('/api/leads', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => console.log(`Server is running on port ${port}`));

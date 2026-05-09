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

// 1. Tell the server to look in the 'public' folder for the website files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// 2. Load the main page directly from the public folder
app.get('/', (req, res) => {
    // We look for index.html in the public folder
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // This will help us find the file if it's named slightly wrong
        const files = fs.readdirSync(path.join(__dirname, 'public'));
        res.status(404).send(`
            <h1>File Not Found</h1>
            <p>I am looking for <strong>index.html</strong> inside your <strong>public</strong> folder.</p>
            <p><strong>Files I see inside 'public':</strong> ${files.join(', ')}</p>
        `);
    }
});

// 3. The Extraction Engine (Scanning)
app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        let aiSummary = "[PREVIEW] AI analysis active.";
        if (openai) {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: `Translate: ${JSON.stringify(metadata)}` }]
                });
                aiSummary = response.choices[0].message.content;
            } catch (e) { aiSummary = "AI unavailable."; }
        }
        
        res.json({
            ...metadata,
            ai_summary: aiSummary,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) { res.status(500).json({ error: 'Scan failed' }); }
});

app.listen(port, () => console.log(`Server live on ${port}`));

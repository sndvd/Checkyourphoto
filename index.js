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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SMART FINDER for index.html
function findIndexHtml(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.git') continue;
            const found = findIndexHtml(fullPath);
            if (found) return found;
        } else if (file.toLowerCase() === 'index.html') {
            return fullPath;
        }
    }
    return null;
}

app.get('/', (req, res) => {
    const filePath = findIndexHtml(__dirname);
    if (filePath) res.sendFile(filePath);
    else res.status(404).send("index.html not found.");
});

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `scan-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        let aiSummary = "[PREVIEW] AI Summary active.";
        if (openai) {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: `Translate metadata: ${JSON.stringify(metadata)}` }]
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

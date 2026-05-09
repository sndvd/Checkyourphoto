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

// Safety check for AI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `up-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        let aiSummary = "[PREVIEW MODE] AI translation is inactive.";
        if (openai) {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are a specialized metadata translator. Stay factual." },
                        { role: "user", content: `Translate this metadata: ${JSON.stringify(metadata)}` }
                    ]
                });
                aiSummary = response.choices[0].message.content;
            } catch (aiErr) {
                aiSummary = "AI analysis currently unavailable.";
            }
        }
        
        res.json({
            ...metadata,
            ai_summary: aiSummary,
            gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null
        });
    } catch (e) {
        console.error("Extraction error:", e);
        res.status(500).json({ error: 'Extraction failed' });
    }
});

// Simple placeholders to prevent errors
app.post('/api/telemetry', (req, res) => res.json({ status: 'ok' }));
app.post('/api/leads', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`--- SERVER STARTED ---`);
    console.log(`Port: ${port}`);
});

const express = require('express');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Database Setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new sqlite3.Database(path.join(dataDir, 'forensics.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        event_name TEXT,
        file_type TEXT,
        metadata_count INTEGER,
        has_gps INTEGER,
        ai_summary_generated INTEGER,
        tab_engaged TEXT,
        export_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// AI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function formatMetadataForAI(metadata) {
    const importantKeys = ['Make', 'Model', 'Software', 'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude', 'FileType', 'UserComment', 'Author', 'Title', 'Producer', 'Company'];
    const filtered = {};
    importantKeys.forEach(k => { if (metadata[k] !== undefined) filtered[k] = metadata[k]; });
    return JSON.stringify(filtered, null, 2);
}

async function getAiSummary(metadataJson) {
    if (!openai) {
        return "[PREVIEW MODE] To enable real AI analysis, add your OpenAI API Key to your hosting settings.";
    }
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a specialized metadata translator. Stay factual. Do not judge authenticity." },
                { role: "user", content: `Convert this metadata into a forensic summary: ${metadataJson}` }
            ]
        });
        return response.choices[0].message.content;
    } catch (e) {
        return "AI Summary unavailable.";
    }
}

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const tempPath = path.join(os.tmpdir(), `up-${Date.now()}`);
    try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const metadata = await exiftool.read(tempPath, ["-n"]);
        fs.unlinkSync(tempPath);
        const aiSummary = await getAiSummary(formatMetadataForAI(metadata));
        res.json({ ...metadata, ai_summary: aiSummary, gps: (metadata.GPSLatitude && metadata.GPSLongitude) ? { lat: metadata.GPSLatitude, lon: metadata.GPSLongitude } : null });
    } catch (e) {
        res.status(500).json({ error: 'Extraction failed' });
    }
});

app.post('/api/telemetry', (req, res) => {
    const { session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type } = req.body;
    db.run(`INSERT INTO telemetry (session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [session_id, event_name, file_type, metadata_count, has_gps ? 1:0, ai_summary_generated ? 1:0, tab_engaged, export_type]);
    res.json({ status: 'ok' });
});

app.post('/api/leads', (req, res) => {
    const { email, session_id } = req.body;
    db.run(`INSERT INTO leads (email, session_id) VALUES (?, ?)`, [email, session_id]);
    res.json({ status: 'ok' });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(port, () => console.log(`App live at http://localhost:${port}`));
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
        if (fs.existsSync(spot)) return res.sendFile(spot

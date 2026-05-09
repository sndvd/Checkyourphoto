const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

function deepSearch(dir, fileName) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (let file of list) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(deepSearch(file, fileName));
        } else if (file.toLowerCase().endsWith(fileName.toLowerCase())) {
            results.push(file);
        }
    }
    return results;
}

app.get('/', (req, res) => {
    console.log("Searching for index.html...");
    const matches = deepSearch(__dirname, 'index.html');
    
    if (matches.length > 0) {
        console.log("Found it at: " + matches[0]);
        res.sendFile(matches[0]);
    } else {
        // Look inside the public folder to see what's in there
        let publicContents = "Folder 'public' not found.";
        const publicPath = path.join(__dirname, 'public');
        if (fs.existsSync(publicPath)) {
            publicContents = fs.readdirSync(publicPath).join(', ');
        }

        res.status(404).send(`
            <h1>File Not Found</h1>
            <p>I looked everywhere for <strong>index.html</strong> but it's not here.</p>
            <p><strong>Contents of your 'public' folder:</strong> ${publicContents}</p>
            <hr>
            <p>Check if your file is named exactly <strong>index.html</strong> (not index.html.txt).</p>
        `);
    }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => console.log(`Server live on port ${port}`));

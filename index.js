const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// This function finds the real path to index.html no matter where it is hiding
function findFile(startPath, targetName) {
    if (!fs.existsSync(startPath)) return null;
    const files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            const found = findFile(filename, targetName);
            if (found) return found;
        } else if (files[i].toLowerCase() === targetName.toLowerCase()) {
            return filename;
        }
    }
    return null;
}

app.get('/', (req, res) => {
    console.log("Looking for index.html...");
    const indexPath = findFile(__dirname, 'index.html');
    
    if (indexPath) {
        console.log("FOUND AT: " + indexPath);
        res.sendFile(indexPath);
    } else {
        // This will tell us what the server actually sees
        const allFiles = [];
        const walk = (dir) => {
            fs.readdirSync(dir).forEach(f => {
                let p = path.join(dir, f);
                if (fs.statSync(p).isDirectory()) walk(p);
                else allFiles.push(p.replace(__dirname, ''));
            });
        }
        try { walk(__dirname); } catch(e) {}
        
        res.status(404).send(`
            <h1>Still can't find index.html</h1>
            <p>I searched everywhere. Here are all the files I found:</p>
            <pre>${allFiles.join('\n')}</pre>
        `);
    }
});

// Help the server find the assets folder
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.listen(port, () => console.log(`Server is running on port ${port}`));

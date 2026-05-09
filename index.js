const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    // This function looks at every file and folder you have
    const getDirectoryTree = (dir) => {
        const stats = fs.lstatSync(dir);
        const info = { name: path.basename(dir) };
        if (stats.isDirectory()) {
            info.type = "folder";
            info.children = fs.readdirSync(dir).map(child => getDirectoryTree(path.join(dir, child)));
        } else {
            info.type = "file";
            info.size = stats.size;
        }
        return info;
    };

    const tree = getDirectoryTree(__dirname);

    // This displays your files on the screen so we can see the mistake
    res.send(`
        <div style="font-family: monospace; background: #111; color: #0f0; padding: 20px; min-height: 100vh;">
            <h1>📁 PROJECT FILE EXPLORER</h1>
            <p>I am searching for index.html. Here is what I found:</p>
            <pre>${JSON.stringify(tree, null, 4)}</pre>
            <hr>
            <p>If you see your index.html listed above, look at its "name" carefully.</p>
        </div>
    `);
});

app.listen(port, () => console.log(`Debug server live`));

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// 1. Tell the server to look for files in the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    // Let's look exactly at the path we expect
    const expectedPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(expectedPath)) {
        res.sendFile(expectedPath);
    } else {
        // If it's not there, let's see what IS in that folder
        let contents = "Folder 'public' is empty or not found.";
        try {
            const publicDir = path.join(__dirname, 'public');
            if (fs.existsSync(publicDir)) {
                contents = fs.readdirSync(publicDir).join(', ');
            }
        } catch (e) {
            contents = "Error reading public folder: " + e.message;
        }

        res.status(404).send(`
            <h1>Almost there!</h1>
            <p>The server is live, but <strong>index.html</strong> is missing from the <strong>public</strong> folder.</p>
            <p><strong>Inside your 'public' folder, I see:</strong> ${contents}</p>
            <hr>
            <p><strong>How to fix:</strong></p>
            <ol>
                <li>Go to GitHub.</li>
                <li>Open the <strong>public</strong> folder.</li>
                <li>Make sure there is a file named exactly <strong>index.html</strong> (all lowercase).</li>
            </ol>
        `);
    }
});

app.listen(port, () => console.log(`Server live on port ${port}`));

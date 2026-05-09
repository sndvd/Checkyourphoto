const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// 1. This tells the server: "Look in the 'public' folder for everything"
app.use(express.static(path.join(__dirname, 'public')));

// 2. This is the code for the main page
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    if (fs.existsSync(indexPath)) {
        // If it finds your file, it will show your website
        res.sendFile(indexPath);
    } else {
        // If it can't find it, it will show this message instead
        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1>🚀 Server is Running!</h1>
                <p>I can see your server, but I can't find your <strong>index.html</strong> file.</p>
                <p>On GitHub, make sure you have a folder named <strong>public</strong> and the file is inside it.</p>
            </div>
        `);
    }
});

app.listen(port, () => {
    console.log(`App is live on port ${port}`);
});

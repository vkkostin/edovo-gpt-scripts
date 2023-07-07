const fs = require('fs');

const file = process.argv[2];

function JSONLValidator() {
    const allFileContents = fs.readFileSync(file, 'utf-8');

    const JSONLines = allFileContents.split(/\n/);

    for (let i = 0; i < JSONLines.length; i++) {
        const currentLine = JSONLines[i];

        // allow for the final line to be empty
        if (i === JSONLines.length - 1 && !currentLine.length) {
            continue;
        }

        try {
            JSON.parse(currentLine)
        } catch (e) {
            console.error(`ERROR ON LINE ${i + 1}: ${e.message}`);
            return;
        }
    }

    console.log('NO ERRORS!');
}

JSONLValidator();

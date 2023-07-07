const fs = require('fs');
const { parse } = require('csv-parse');
const { stripHtml } = require('string-strip-html');

const jsonLines = [];

const inputCSV = process.argv[2];

function buildPrompt(question, answer) {
    return `Question: ${stripHtml(question.replace(/\n/gm, ' ')).result}\\nResponse: ${answer.replace(/\n/gm, ' ')}\\nScore:`;
}

function processRow(row) {
    [question, answer, score] = row;

    const prompt = buildPrompt(question, answer);
    const completion = ` ${score}`;

    const jsonLine = `{"prompt": "${prompt}", "completion": "${completion}"}`;

    jsonLines.push(jsonLine);
}

function processData() {
    try {
        fs.unlinkSync('training_data.jsonl');
    } catch (error) {
        console.log(error);
    }

    const stream = fs.createWriteStream('training_data.jsonl', {flags:'a'});

    jsonLines.forEach(line => {
        stream.write(`${line}\n`)
    });
    stream.end();

    console.log('DONE');
}

function parseResponses() {
	fs.createReadStream(`${inputCSV}.csv`)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

parseResponses();

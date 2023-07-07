const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const { stripHtml } = require('string-strip-html');
const { backOff } = require('exponential-backoff');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const inputCSV = process.argv[2];

const responses = [];
const evaluations = [];

function buildPrompt(response) {
    return `${response}\\nScore:`;
}

async function getResponse(content, index) {
	try {
		console.log(`--- Processing Prompt ${index + 1} / ${responses.length} ---`);
		console.log(content);
		const response = await backOff(() => {
			return openai.createCompletion({
				model: 'davinci:ft-edovo:question-with-prompt-62873-2023-07-03-16-08-03',
				prompt: content,
				temperature: 0.7,
			});
		});

		console.log('--- Finished Processing Prompt ---');
		console.log('\n');

		return processChatCompletionData(response.data);
	} catch (e) {
		console.error(e);
		generateOutput();
	}
}

async function processChatCompletionData(data) {
	const { prompt_tokens, completion_tokens, total_tokens} = data.usage;
    const [firstChoice] = data.choices;
    const completion = firstChoice.text

    console.log(completion);

    const match = completion.match(/Score: (\d)/);
    let score = 'N/A';

    if (match) {
        score = parseInt(match[1], 10);
    }

	console.log('Score: ', score);

	return [
		score,
        completion,
		prompt_tokens,
		completion_tokens,
		total_tokens,
	];
}

async function processData() {
	const headers = responses.shift();
	const lessonNameIndex = headers.indexOf('lesson_name');
	const questionIndex = headers.indexOf('question');
	const answerIdIndex = headers.indexOf('answer_id');
	const answerIndex = headers.indexOf('answer');

	const itemCount = responses.length

	for (let i = 0; i < itemCount; i++) {
		const item = responses[i];
		const lessonName = item[lessonNameIndex];
		const question = stripHtml(item[questionIndex].replace(/\n/gm, ' ')).result;
		const answerId = item[answerIdIndex];
		const answer = item[answerIndex].replace(/\n/gm, ' ');
		const prompt = buildPrompt(question, answer);
		const start = Date.now();
		const assessment = await getResponse(prompt, i);
		const end = Date.now();
		const latency = Math.round((end - start) / 1000);

		evaluations.push([
			lessonName,
			question,
			answerId,
			answer,
			...assessment,
            latency,
		]);

	}
}

function generateOutput() {
	const writableStream = fs.createWriteStream(`text_completion_model_output_${new Date()}.csv`);

	const columns = [
		'lesson_name',
		'question',
		'answer_id',
		'student_answer',
		'score',
        'completion',
		'prompt_tokens',
		'completion_tokens',
		'total_tokens',
        'latency',
	];

	const stringifier = stringify({ header: true, columns: columns });
	evaluations.forEach(row => stringifier.write(row));
	stringifier.pipe(writableStream);

	console.log('DONE!');
}

function processRow(row) {
	responses.push(row)
}

function parseResponses() {
	fs.createReadStream(`./${inputCSV}.csv`)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

parseResponses();

require('dotenv').config();
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

function buildPrompt(question, answer) {
	return `Is "${answer}" an adequate response to the question "${question}"?`;
}

async function getResponse(content, index) {
	try {
		console.log(`--- Processing Prompt ${index + 1} / ${responses.length} ---`);
		console.log(content);
		const response = await backOff(() => {
			return openai.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [{role: 'user', content}],
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
	const score = data.choices[0].message.content

	return [
		score,
		prompt_tokens,
		completion_tokens,
		total_tokens,
	];
}

async function getTranslations(answer) {
    try {
		console.log(`--- Translating ---`);
        console.log(answer);

        const answerResponse = await backOff(() => {
			return openai.createChatCompletion({
				model: 'gpt-3.5-turbo',
				messages: [{role: 'user', content: `Translate this text from Spanish to English: "${answer}"`}],
				temperature: 0.7,
			});
		});

		console.log('--- Finished Translating ---');
		console.log('\n');

		return answerResponse.data.choices[0].message.content
	} catch (e) {
		console.error(e);
		generateOutput();
	}
}

async function processData() {
	const headers = responses.shift();
	const lessonNameIndex = headers.indexOf('lesson_name');
	const questionIndex = headers.indexOf('question');
	const answerIdIndex = headers.indexOf('answer_id');
	const answerIndex = headers.indexOf('answer');

	const itemCount = responses.length;

	for (let i = 0; i < itemCount; i++) {
		const item = responses[i];
		const lessonName = item[lessonNameIndex];
		const question = stripHtml(item[questionIndex]).result;
		const answerId = item[answerIdIndex];
		const answer = item[answerIndex];
		const prompt = buildPrompt(lessonName, question, answer);
        const answerEnglish = await getTranslations(answer);
		const start = Date.now();
		const assessment = await getResponse(prompt, i);
		const end = Date.now();
		const latency = Math.round((end - start) / 1000);

		evaluations.push([
			lessonName,
			question,
			answerId,
			answer,
            answerEnglish,
			latency,
			...assessment,
		]);

	}

	generateOutput();
}

function generateOutput() {
	const writableStream = fs.createWriteStream(`chat_model_spanish_output_${new Date()}.csv`);

	const columns = [
		'lesson_name',
		'question',
		'answer_id',
		'student_answer',
        'answer_english',
		'latency',
		'score',
		'prompt_tokens',
		'completion_tokens',
		'total_tokens',
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
	if (!inputCSV) {
		console.error('MAKE SURE TO INCLUDE THE FILE (OR HARDCODE IT IN THE SCRIPT)');
		return;
	}

	if (!buildPrompt()) {
		console.error('MAKE SURE TO INCLUDE THE PROMPT');
		return;
	}

	fs.createReadStream(`./${inputCSV}.csv`)
		.pipe(parse({ delimiter: "," }))
		.on('data', processRow)
		.on('close', processData);
}

parseResponses();

# **CHAT COMPLETION MODELS**
- All scripts are node scripts and can be run in your terminal with the node command. Make sure to run `npm install` to install all the dependencies.

- Since we've been specifically testing learner _answers_ to _questions_, most scripts accept CSV files and assume they have columns with `answer` and `question` headers.

- All scripts that make requests to OpenAI require an API key. If you have an OpenAI account that is linked to the Edovo Organization, you can create one for yourself in the `API keys` page inside the main Account page. Once you do that, create a `.env` file with a single entry:
```
OPENAI_API_KEY=<your-api=key>
```
- All scripts that generate a file will generate them with the name of the script that generated them and a timestamp in their name so that nothing is overwritten on accident.
- All scripts that make requests to OpenAI have a `buildPrompt` function that needs to return a string with your prompt; the function takes an `answer` and a `question` that you can incorporate into your prompt. You need to have the function return something before you can run the script.

## **chat_completion_single_prompt.js**
```
node chat_completion_single_prompt.js <test-data-file>
```
This is a script that calls an OpenAI chat completion model (e.g. `gpt-3.5-turbo`) with a single prompt. You call it with the name of the CSV test data file (minus the extension) you want to submit for processing. You can also hardcode the name of the file if that is easier. The exact model and various settings, like the `temperature`, are hardcoded - those can be changed in the actual script.

## **chat_completion_double_prompt.js**
```
node chat_completion_single_prompt.js <test-data-file> <conditional>
```
This is a script that calls an OpenAI chat completion model (e.g. `gpt-3.5-turbo`) with an initial prompt, compares the response to your passed-in `conditional`, and if they are the same, calls it again with a follow-up prompt. One use-case for this is asking if a learner response is gibberish in the initial prompt, and if it is _not_, following up by asking if a learner response answers the question. This script has an additional `buildFollowUpPrompt` function that also accepts a `question` and an `answer`.

## **chat_completion_spanish.js**
```
node chat_completion_spanish.js <test-data-file>
```
This is a script that works with an OpenAI chat completion model (e.g. `gpt-3.5-turbo`) and Spanish questions/answers. The main difference between this and `chat_completion_single_prompt.js` is that it has an additional prompt to translate the learner answer, and produces a CSV with a column with the translation.

## PROMPTS WE TRIED

> `A student taking the lesson "${lessonName}" was asked to give a short answer to the question "${question}". The student's answer was "${answer}". Provide a score of 0 (response does not answer question) or 1 (response answers question) and an explanation for the score in JSON format. The JSON object should have a score field with the score and an explanation field with the explanation.`

> `A student was asked to give a short answer to the question "${question}". The student's answer was "${answer}". Provide a score of 0 (response does not answer question) or 1 (response answers question) and an explanation for the score in JSON format. The JSON object should have a score field with the score and an explanation field with the explanation.`

> `A student was asked to give a short answer to the question "${question}". The student's answer was "${answer}". Rate the response 0 (response does not answer question) or 1 (response answers question). Do not provide any other other information.`

> `A student was asked to give a short answer to the question "${question}". The student's answer was "${answer}". Rate the response 0 (response answers no part of the question), 1 (response answers some parts of the question), 2 (response answers all parts of the question but does not explain reasoning), or 3 (response answers all parts of the question and explains reasoning). Do not provide any other other information.`

> `A student was asked to give a short answer to the question "${question}". The student's answer was "${answer}". Rate the response 0 (response does not answer the question), 1 (response answers some parts of the question), or 2 (response answers all parts of the question). Do not provide any other other information.`

> `A student answered "${answer}" to the question "${question}". Which of the following codes apply to this answer? 0 - Valid answer, 1 - Irrelevant, 2 - Unclear, 3 - Incomplete or does not answer all parts of question or provide an explanation (if asked), 4 - Incorrect, 5 - Inappropriate, 6 - Lacking depth. Respond only with the numerical score.`

> `How complete is the answer below with regard to the associated question? Use the following rubric: 2 - Completely answers all parts of the question, 1 - Partially answers the question, 0 - Does not answer question. Your response should just be the number that is your score. Do not provide additional information.\nQuestion: "${question}"\nAnswer: "${answer}"`

> `How complete is the answer below with regard to the associated question? Respond with 1 if the answer is complete and with 0 if the answer is not complete. \nQuestion: "${question}"\nAnswer: "${answer}"`

# **TEXT COMPLETION MODELS**
- Text completion models use a different interface and the data comes back in a slightly different format from the chat completion models, but running the script in this repo is very similar. It accepts a CSV with the same format (`answer` and `question` columns are assumed to exist). We were fine-tuning OpenAI models with learner answers and expected OpenAI to come back with something like `Score: 0` or `Score: 1`. The specific script in this repo was working with completion text that follows `Score` and putting that into the resulting `Score` column of the generated CSV file. It also creates a column for the entire response, which is oftentimes nonsensical.

# **FINE-TUNING A NEW MODEL**
Fine-tuning a text completion model mainly takes place in the terminal. The scripts in this repo will take you from a CSV file with the data to a JSONL file that OpenAI accepts as its training data.
- You will need a CSV file with `question`, `answer`, and a human-generated `score` columns that we would expect that `answer` to have. **THESE SHOULD BE THE FIRST THREE COLUMNS IN THAT ORDER**
- Running the following script will generate a JSONL file in the format that OpenAI expects:
```
node csv_to_jsonl.js <your-csv-file-name>
```
- A JSONL file is a file in which each line is valid JSON. OpenAI expects each line to be a JSON object with a `prompt` field and a `completion` field. When we actually go on to use the model, we will be providing it with just the `prompt` and the model should come back with a `completion` based on what it was trained on.
- After you have the JSONL file, you can validate it with `validate_jsonl.js`:
```
node validate_jsonl.js <JSONL-file-name>
```
- All the validation does is attempt to parse each line. When it encounters an error it will quit and tell you which line and column the error is in. Typically a lot of errors happen from an errant `\` in a learner response that it misinterprets as an escape character.
- Once you have a valid JSONL file with the training data you are ready to submit it to OpenAI for training. You will need Python and `pip` installed on your machine. After that you can follow the instructions in the OpenAI [docs](https://platform.openai.com/docs/guides/fine-tuning).
- You will want to prepare your JSONL file with the following script:
```
openai tools fine_tunes.prepare_data -f <LOCAL_FILE>
```
- The above script will generate a prepared JSONL document that you can finally submit to OpenAI for training:
```
openai api fine_tunes.create -t <TRAIN_FILE_ID_OR_PATH> -m <BASE_MODEL>
```
- The above script should come back with a fine-tune job ID that you can use for subsequent requests:
```
# Stream progress
openai api fine_tunes.follow -i <YOUR_FINE_TUNE_JOB_ID>

# List all created fine-tunes
openai api fine_tunes.list

# Retrieve the state of a fine-tune. The resulting object includes
# job status (which can be one of pending, running, succeeded, or failed)
# and other information
openai api fine_tunes.get -i <YOUR_FINE_TUNE_JOB_ID>

# Cancel a job
openai api fine_tunes.cancel -i <YOUR_FINE_TUNE_JOB_ID>
```
- Once the fine-tune is done, the above get command will come back with the name of your model, which you can then use in the text completion script.
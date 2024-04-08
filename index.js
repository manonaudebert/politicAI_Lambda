/* global fetch */
'use strict';
const cheerio = require('cheerio');
const bedrock = require('@aws-sdk/client-bedrock-runtime');
const bedrockClient = new bedrock.BedrockRuntimeClient({region: "us-east-1"});


const handler = async (event) => {
    const body = JSON.parse(event.body);
    const result = await summarizeWebPage(body);

    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
};


const summarizeWebPage = async (data) => {
    console.log("URL: " + data.url)
    const text = await fetchWebPageText(data.url);
    if (!text) {
        console.log("No text found form webpage :(")
        return "";
    }
    const promptText = buildPromptText(text);
    const response = await bedrockQuery(promptText);
    console.log('Result:', response);
    return cleanResponse(response);
};

const fetchWebPageText = async (url) => {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        // const body = $('body');
        // Get headline
        var body = $('h1[data-testid="headline"]');
        // Get summary 
        body.find('script, style').remove();
        body = body.text().trim().split(' ').slice(0, 1000).join(' ');
        var summary = $('p[id="article-summary"]');
        summary.find('script, style').remove();
        summary = summary.text().trim().split(' ').slice(0, 1000).join(' ');
        body = body + " " + summary;
        console.log("Summary: " + summary)

        console.log("body attempt 1: " + body);
        if (!body) {
            console.log("Couldn't find headline. Trying with article body");
            body = $('body');
            body.find('script, style').remove();
            body = body.text().trim().split(' ').slice(0, 1000).join(' ');
            console.log("body attempt 2: " + body);
        }
        return body;
    } catch (e) {
        console.error(e);
        return "";
    }
};
/* 
    Summarize the text focusing on the main issue it addresses and the primary politician involved. 
    Specifically, identify the central subject (such as healthcare, economy, foreign policy, etc.) in 1 or 2 words max and the first and last name of the key political figure discussed (only 1 politician).
    Please always provide the output in this format with only one pair:

    {topic}:{politician name}
*/
// Assume that we're searching for Biden. Eventually we will also need to get the politician
const buildPromptText = (text) => {
    return `"${text}" Which of the following sectors does this statement fit into? Please only provide the sector name in the response.
    [ Taxes, Healthcare, Technology, War, International_Policy, Immigration, Education, Climate_Change, Economy, 
    Social_Welfare, Housing, Justice_and_Law_Enforcement, Civil_Rights, Infrastructure ]`;
};

const bedrockQuery = async (promptText) => {
    const modelId = 'ai21.j2-ultra-v1';
    const requestBody = {
        prompt: promptText,
        maxTokens: 20,
        temperature: 0.3,
        topP: 0.3,
        stopSequences: [],
        countPenalty: {scale: 0},
        presencePenalty: {scale: 0},
        frequencyPenalty: {scale: 0},
    };
    try {
        const params = {
            modelId: modelId,
            body: JSON.stringify(requestBody),
            accept: 'application/json',
            contentType: 'application/json',
        };

        const command = new bedrock.InvokeModelCommand(params);
        const response = await bedrockClient.send(command);
        const buffer = Buffer.from(response.body);
        const text = buffer.toString();
        const responseData = JSON.parse(text);
        return cleanResponse(responseData.completions[0].data.text);
    } catch (error) {
        console.error(`Error: ${error}`);
        return "";
    }
};

const cleanResponse = (responseText) => {
    console.log("Initial text: " + responseText)
    // should only return 1 word, but if it doesnt, hope that the last word is the category
    const words = responseText.split(" "); // Split the string by spaces
    const lastWord = words[words.length - 1]; // Get the last word
    console.log("Final text: " + lastWord)
    return lastWord.trim();
};

module.exports = { handler };

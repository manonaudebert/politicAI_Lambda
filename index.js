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
    const promptText = buildPromptText(text);
    const response = await bedrockQuery(promptText);
    console.log('Result:', response);
    return parseResponse(response);
};

const fetchWebPageText = async (url) => {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const $ = cheerio.load(data);
        // const body = $('body');
        const body = $('h1[data-testid="headline"]');
        body.find('script, style, div, class').remove();
        console.log("bodY: " + body.text().trim().split(' ').slice(0, 1000).join(' '))
        return body.text().trim().split(' ').slice(0, 1000).join(' ');
    } catch (e) {
        console.error(e);
        return "";
    }
};

const buildPromptText = (text) => {
    return `"${text}"
    Summarize the text focusing on the main topic or issue it addresses and the primary politician involved. 
    Specifically, identify the central subject (such as healthcare, economy, foreign policy, etc.) in 1 or 2 words max and the first and last name of the key political figure discussed (only 1 politician).
    Please always provide the output in this format with only one pair:

    {topic}:{politician name}  
    `;
};

const bedrockQuery = async (promptText) => {
    const modelId = 'ai21.j2-ultra-v1';
    const requestBody = {
        prompt: promptText,
        maxTokens: 100,
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
        
        return responseData.completions[0].data.text;
    } catch (error) {
        console.error(`Error: ${error}`);
        return "";
    }
};

const parseResponse = (responseText) => {
    return responseText
        .trim()
        .split("*")
        .map((item) => item.trim())
        .filter((item) => !!item);
};

module.exports = { handler };

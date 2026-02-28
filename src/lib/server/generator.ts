import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import { MISTRAL_API_KEY } from '$env/static/private';

const model = createMistral({ apiKey: MISTRAL_API_KEY })('codestral-latest');

export async function generateHtml(url: string, text: string | undefined): Promise<string> {
	let textContext = '';
	if (text) {
		textContext =
			'The link text that was clicked was ' +
			text +
			'. Use this as context to determine what may be on that page.';
	}

	const prompt = `Imagine you have no internet connection, but you have the cached version of any web page on the internet.
    
    Output what you expect to be at the following URL at ${url} as HTML.
    
    ${textContext}
    
    Only output everything that should be within the <html> tag including the <style> and <body> tags.
		If there are any images, they should be simple inline SVGs. Do not include any URLs to images in the output.
    Use the appropriate colors for the website that you think is appropriate for the URL.
    Do not add any explanation to the result.
    The result should be able to be rendered in a web browser.
    Do not add any backticks.
		Generate CSS that corresponds to the era that this website would be relevant. Ensure the design is nice looking and things are spaced correctly.
		`;

	console.log(prompt);

	const output = await generateText({
		model,
		prompt
	});

	console.log(output.text);
	return output.text;
}

export async function generateJavascript(url: string, htmlSnippet: string): Promise<string> {
	const jsPrompt = `Here is an HTML snippet for the URL ${url}:

${htmlSnippet}

Write some Javascript that would make sense to run on this page to make it interactive or add appropriate functionality.
Only output the raw Javascript code. Do not include <script> tags. Do not add any explanation or markdown backticks.`;

	console.log(jsPrompt);

	const jsOutput = await generateText({
		model,
		prompt: jsPrompt
	});

	console.log(jsOutput.text);

	const jsCode = jsOutput.text
		.replace(/```javascript/gi, '')
		.replace(/```js/gi, '')
		.replace(/```/g, '')
		.trim();

	return jsCode;
}

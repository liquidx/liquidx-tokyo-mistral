import { createMistral } from '@ai-sdk/mistral';
import { error, json } from '@sveltejs/kit';
import { generateText } from 'ai';
import { MISTRAL_API_KEY } from '$env/static/private';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const params = await request.json();
	const fromLanguage = params.fromLanguage;
	const toLanguage = params.toLanguage;
	const content = params.content;

	// Translate content from fromLanguage to toLanguage
	const model = createMistral({ apiKey: MISTRAL_API_KEY })('codestral');

	const body = await request.json();
	const { url, text } = body;

	if (!url) {
		return json({ error: 'URL is required' }, { status: 400 });
	}

	let textContext = '';
	if (text) {
		textContext =
			'The link text that was clicked was ' +
			text +
			'. Use this as context to determine what may be on that page.';
	}

	// Construct the prompt.
	const prompt = `Imagine you have no internet connection, but you have the cached version of any web page on the internet.
    
    Output what you expect to be at the following URL at ${url} as HTML.
    
    ${textContext}
    
    Only output everything that should be within the <html> tag including the <style> and <body> tags.
		If there are any images, they should be SVGs. Do not include any URLs to images in the output.
    Do not add any explanation to the result.
    The result should be able to be rendered in a web browser.
    Do not add any backticks.
		Generate CSS that corresponds to the era that this website would be relevant.
		`;

	const output = await generateText({
		model: model,
		prompt: prompt
	});

	console.log(output.text);

	return json({});
};

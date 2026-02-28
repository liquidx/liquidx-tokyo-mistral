import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import { MISTRAL_API_KEY } from '$env/static/private';
import { Mistral } from '@mistralai/mistralai';

const model = createMistral({ apiKey: MISTRAL_API_KEY })('codestral-latest');
const IMAGE_GENERATION_AGENT = 'ag_019ca2b8e655700bb2791b556b55cf17';

export async function generateHtml(
	url: string,
	text: string | undefined,
	generateImages: boolean = false
): Promise<string> {
	let textContext = '';
	if (text) {
		textContext =
			'The link text that was clicked was ' +
			text +
			'. Use this as context to determine what may be on that page.';
	}

	let prompt = `Imagine you have no internet connection, but you have the cached version of any web page on the internet.
    
    Output what you expect to be at the following URL at ${url} as HTML.
    
    ${textContext}
    
    Only output everything that should be within the <html> tag including the <style> and <body> tags.
    Use the appropriate colors for the website that you think is appropriate for the URL.
    Do not add any explanation to the result.
    The result should be able to be rendered in a web browser.
    Do not add any backticks.
		Generate CSS that corresponds to the era that this website would be relevant. 
		
		Ensure the design is nice looking and things are spaced correctly.
		`;

	if (generateImages) {
		prompt += `
		    For any icons, inline SVGs in to the HTML.


		    For any images, include an img tag with a src URL, alt parameter for the description of the image and 
    with the correct width and height specified in the HTML tag.
`;
	} else {
		prompt += `
			All images must be inlined SVGs.`;
	}

	const output = await generateText({
		model,
		prompt
	});

	// Generate any images that are included
	let outputText = output.text;
	if (generateImages) {
		const imgTags = outputText.matchAll(/<img[^>]*>/gi);
		if (imgTags) {
			for (const imgTag of Array.from(imgTags)) {
				console.log(imgTag[0]);
				const src = imgTag[0].match(/src="([^"]*)"/i);
				const width = imgTag[0].match(/width="([^"]*)"/i);
				const height = imgTag[0].match(/height="([^"]*)"/i);
				const alt = imgTag[0].match(/alt="([^"]*)"/i);
				if (src && width && height && alt) {
					// Generate the image
					const imageUrl = await generateImage(src[1], alt[1], width[1], height[1]);
					if (imageUrl) {
						outputText = outputText.replace(
							imgTag[0],
							`<img src="${imageUrl}" alt="${alt[1]}" width="${width[1]}" height="${height[1]}">`
						);
					}
				}
			}
		}
	}

	return outputText;
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

export const generateImage = async (
	baseUrl: string,
	imageDescription: string,
	width: string,
	height: string
) => {
	const prompt = `Generate an image that would be appropriate for the website ${baseUrl}. 
    The image should be ${imageDescription}. The image should be ${width}x${height}.`;

	let client = new Mistral({
		apiKey: MISTRAL_API_KEY
	});
	let conversation = await client.beta.conversations.start({
		agentId: IMAGE_GENERATION_AGENT,
		inputs: prompt
		//store:false
	});

	if (!conversation || !conversation.outputs || conversation.outputs.length == 0) {
		console.log('No conversation outputs found');
		return null;
	}

	let output = conversation.outputs.find((output) => output.type === 'message.output');
	if (!output) {
		console.log('No output found');
		return null;
	}

	console.log(output);

	let contents = output.content;
	if (!contents || contents.length == 0) {
		console.log('No contents found');
		return null;
	}

	let fileChunk = contents.find(
		(content: any) => content.type === 'tool_file' && content.tool == 'image_generation'
	);
	if (!fileChunk) {
		return null;
	}

	const fileStream = await client.files.download({ fileId: fileChunk.fileId });
	const response = new Response(fileStream as any);
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const base64 = buffer.toString('base64');
	const url = `data:image/png;base64,${base64}`;
	console.log('Generated image URL: ' + url);
	return url;
};

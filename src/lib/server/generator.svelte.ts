import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import { MISTRAL_API_KEY } from '$env/static/private';
import { Mistral } from '@mistralai/mistralai';

const IMAGE_GENERATION_AGENT = 'ag_019ca2b8e655700bb2791b556b55cf17';

export async function generateHtml(
	url: string,
	text: string | undefined,
	options: {
		generateImages: boolean;
		dev: boolean;
	} = {
		generateImages: false,
		dev: false
	}
): Promise<string> {
	let baseUrl = options.dev ? 'http://localhost:12222' : 'https://liquidx-tokyo-mistral.vercel.app';

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

	if (options.generateImages) {
		prompt += `
		    For any icons, inline SVGs in to the HTML.
		    For any images, that should be shown. Include the URL in src, the description in alt, and the width and height in width and height. 
`;
	} else {
		prompt += `
			All images must be inlined SVGs.`;
	}

	const model = createMistral({ apiKey: MISTRAL_API_KEY })('devstral-latest');
	const output = await generateText({
		model,
		prompt
	});

	// Generate any images that are included
	let outputText = output.text;
	if (options.generateImages) {
		const imgTags = outputText.matchAll(/<img[^>]*>/gi);
		if (imgTags) {
			const imagesToProcess: any[] = [];
			for (const imgTag of Array.from(imgTags)) {
				console.log(imgTag[0]);
				const src = imgTag[0].match(/src="([^"]*)"/i);
				const width = imgTag[0].match(/width="([^"]*)"/i) ?? ['', '200'];
				const height = imgTag[0].match(/height="([^"]*)"/i) ?? ['', '200'];
				const alt = imgTag[0].match(/alt="([^"]*)"/i) ?? ['', ''];
				if (src) {
					const imgId = 'img-' + Math.random().toString(36).substring(2, 9);
					imagesToProcess.push({
						id: imgId,
						url: src[1],
						description: alt[1],
						width: width[1],
						height: height[1]
					});

					const placeholder = `${baseUrl}/empty.png`;
					outputText = outputText.replace(
						imgTag[0],
						`<img id="${imgId}" src="${placeholder}" alt="${alt[1]}" width="${width[1]}" height="${height[1]}">`
					);
				}
			}

			if (imagesToProcess.length > 0) {
				const script = `
<script>
	(function() {
		const images = ${JSON.stringify(imagesToProcess)};
		Promise.all(images.map(async (img) => {
			try {
				console.log('Loading image: ' + img.url);
				const response = await fetch('${baseUrl}/api/img', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url: img.url, description: img.description, width: img.width, height: img.height })
				});
				if (response.ok) {
					const data = await response.json();
					if (data.url) {
						const imgElement = document.getElementById(img.id);
						if (imgElement) {
							imgElement.src = data.url;
						}
					}
				}
			} catch (e) {
				console.error('Failed to load image:', e);
			}
		}));
	})();
</script>`;
				if (outputText.includes('</body>')) {
					outputText = outputText.replace('</body>', script + '\n</body>');
				} else if (outputText.includes('</html>')) {
					outputText = outputText.replace('</html>', script + '\n</html>');
				} else {
					outputText += script;
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

	const model = createMistral({ apiKey: MISTRAL_API_KEY })('devstral-latest');
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

	let contents = (output as any).content;
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

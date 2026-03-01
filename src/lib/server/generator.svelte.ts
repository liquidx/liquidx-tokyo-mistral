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
		model?: string;
		previousPage?: string;
		referer?: string;
		style?: string;
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

	let previousPageContext = '';
	if (options.previousPage) {
		previousPageContext = `The user navigated here from a previous page. Use the following HTML from the previous page as context to maintain stylistic and narrative consistency with the new page:
		
${options.previousPage}

`;
	}

	let refererContext = '';
	if (options.referer) {
		refererContext = `The user navigated to this page from the URL: ${options.referer}.`;
	}

	let designGuidelines = '';
	if (options.style === '1990s') {
		designGuidelines = `1990s Web Design Guidelines:
- Layout: Basic tables for layout, NO CSS positioning
- Color Palette: Bright, highly saturated web-safe colors (pure red, blue, yellow), stark contrasts.
- Backgrounds: Repeating background patterns (\`background="..."\` attribute), \`bgcolor\`.
- Typography: Exclusively 12pt Times New Roman or Courier New. Standard blue underlined hyperlinks.
- Graphics: Copious use of animated GIFs, "Under Construction" signs, pixel-art separators.
- Features: <marquee> tags (mandatory), <blink> tags, highly visible table borders (\`border="1"\`).
- Output ONLY the HTML, no boilerplate. Use archaic tags.`;
	} else if (options.style === '2010s') {
		designGuidelines = `2010s Web Design Guidelines:
- Layout: Modern responsive design concepts, Flexbox, clean grid systems.
- Color Palette: Flat design approach, muted pastels, subtle grays, vibrant accent colors.
- Backgrounds: Solid subtle tones, large 'hero' images.
- Typography: Clean sans-serif fonts (Open Sans, Roboto style), large readable font sizes, good line-height.
- Graphics: High quality images, rounded corners via CSS, minimalistic SVG icons.
- Features: Sticky headers, card-based UI, minimal borders, subtle box-shadows.
- Interactive: Hover states (opacity drops, translate transforms).
- Output semantic HTML5 elements (<header>, <nav>, <section>, <footer>) with inline styles to emulate a CSS framework.`;
	} else {
		// Default 2000s
		designGuidelines = `Early 2000s Web 2.0 Design Guidelines:
- Layout: Table-based layouts transitioning to early CSS floats and positioning.
- Color Palette: Web-safe colors supplemented with glassy/glossy effects, pastel gradients.
- Backgrounds: Gradient backgrounds, beveled buttons.
- Typography: Verdana, Arial, Tahoma with <font> tags or early CSS.
- Navigation: Flash-like button rollovers, top or side navigation bars.
- Graphics: Glossy badges ("Web 2.0"), reflections, early rounded corner hacks.
- Interactive: "Click here" buttons, form-based layouts.
- Output ONLY the complete HTML document within <html> tags.`;
	}

	let prompt = `Generate HTML for ${url}. Capture the aesthetics of the requested era.

${textContext}
${refererContext}

--- Previous Page ---

${previousPageContext}

--- End Previous Page ---

${designGuidelines}

Technical Constraints:
- Use inline styles where possible or a single <style> block.
- No JavaScript (unless explicitly requested later).
- All content must work without JavaScript.

${
	options.generateImages
		? `
Image Handling:
- Icons as inline SVGs
- Images with src, alt, width, height attributes
- Early 2000s aesthetic: web-safe colors, simple graphics`
		: `
All images must be inline SVGs matching the era's style`
}

IMPORTANT: Output ONLY the complete HTML document within <html> tags. NO explanations, comments about the era, or backticks. The HTML should be ready to render in a browser.`;

	if (options.generateImages) {
		prompt += `
		    For any icons, inline SVGs in to the HTML.
		    For any images, that should be shown. Include the URL in src, the description in alt, and the width and height in width and height. 
`;
	} else {
		prompt += `
			All images must be inlined SVGs.`;
	}

	const modelToUse = options.model || 'devstral-latest';
	const model = createMistral({ apiKey: MISTRAL_API_KEY })(modelToUse);
	const output = await generateText({
		model,
		prompt
	});

	let outputText = output.text;
	const imagesToProcess: any[] = [];
	if (options.generateImages) {
		const imgTags = outputText.matchAll(/<img[^>]*>/gi);
		if (imgTags) {
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
		}
	}

	const script = `
<script>
	(function() {
		const images = ${JSON.stringify(imagesToProcess)};
		if (images.length === 0) {
			window.parent.postMessage({ type: 'imagesLoaded' }, '*');
			return;
		}
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
		})).finally(() => {
			window.parent.postMessage({ type: 'imagesLoaded' }, '*');
		});
	})();
</script>`;
	if (outputText.includes('</body>')) {
		outputText = outputText.replace('</body>', script + '\n</body>');
	} else if (outputText.includes('</html>')) {
		outputText = outputText.replace('</html>', script + '\n</html>');
	} else {
		outputText += script;
	}

	return outputText;
}

export async function generateJavascript(
	url: string,
	htmlSnippet: string,
	preferredModel?: string
): Promise<string> {
	const jsPrompt = `Here is an HTML snippet for the URL ${url}:

${htmlSnippet}

Write some Javascript that would make sense to run on this page to make it interactive or add appropriate functionality.
Only output the raw Javascript code. Do not include <script> tags. Do not add any explanation or markdown backticks.`;

	console.log(jsPrompt);

	const modelToUse = preferredModel || 'devstral-latest';
	const model = createMistral({ apiKey: MISTRAL_API_KEY })(modelToUse);
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

export const generateSVG = async (
	baseUrl: string,
	imageDescription: string,
	width: string,
	height: string
) => {
	const prompt = `Generate a scalable vector graphic (SVG) that would be appropriate for the website ${baseUrl}.
The image should be described as: ${imageDescription}.
The SVG should have width="${width}" and height="${height}".
Only output the raw SVG code, with no markdown backticks, no HTML wrapping, just the <svg> opening and </svg> closing tags and everything inside. Do not include an XML declaration.`;

	const model = createMistral({ apiKey: MISTRAL_API_KEY })('devstral-latest');
	const output = await generateText({
		model,
		prompt
	});

	let svgCode = output.text
		.replace(/```xml/gi, '')
		.replace(/```svg/gi, '')
		.replace(/```html/gi, '')
		.replace(/```/g, '')
		.trim();

	const url = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
	return url;
};

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

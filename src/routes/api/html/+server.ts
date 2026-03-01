import { json } from '@sveltejs/kit';
import { generateHtml, generateJavascript } from '$lib/server/generator.svelte';
import { dev } from '$app/environment';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	const body = await request.json();
	const { url, text, includeJs, includeImages, model, previousPage, referer } = body;

	if (!url) {
		return json({ error: 'URL is required' }, { status: 400 });
	}

	console.log(
		'Generating HTML for URL: ' + url,
		'includeJs: ' + includeJs,
		'includeImages: ' + includeImages,
		'model: ' + model
	);

	const html = await generateHtml(url, text, {
		generateImages: includeImages,
		dev: dev,
		model: model,
		previousPage: previousPage,
		referer: referer
	});

	let finalHtml = html;
	let scriptTag = '';
	if (includeJs) {
		const jsCode = await generateJavascript(url, html, model);
		scriptTag = `\n<script>\n${jsCode}\n</script>\n`;
	}

	if (finalHtml.includes('</body>')) {
		finalHtml = finalHtml.replace('</body>', `${scriptTag}</body>`);
	} else if (finalHtml.includes('</html>')) {
		finalHtml = finalHtml.replace('</html>', `${scriptTag}</html>`);
	} else {
		finalHtml += scriptTag;
	}

	return json(
		{ html: finalHtml },
		{
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		}
	);
};

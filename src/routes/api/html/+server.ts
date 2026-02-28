import { error, json } from '@sveltejs/kit';
import { generateHtml, generateJavascript } from '$lib/server/generator';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const { url, text } = body;

	if (!url) {
		return json({ error: 'URL is required' }, { status: 400 });
	}

	const html = await generateHtml(url, text);
	const jsCode = await generateJavascript(url, html);

	let finalHtml = html;
	const scriptTag = `\n<script>\n${jsCode}\n</script>\n`;

	if (finalHtml.includes('</body>')) {
		finalHtml = finalHtml.replace('</body>', `${scriptTag}</body>`);
	} else if (finalHtml.includes('</html>')) {
		finalHtml = finalHtml.replace('</html>', `${scriptTag}</html>`);
	} else {
		finalHtml += scriptTag;
	}

	return json({ html: finalHtml });
};

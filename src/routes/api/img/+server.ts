import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { generateImage } from '$lib/server/generator.svelte';

export const HEAD: RequestHandler = async () => {
	console.log('HEAD request to /api/img');
	return new Response('', {
		headers: {
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Allow-Origin': 'null'
		}
	});
};

export const OPTIONS: RequestHandler = async () => {
	console.log('OPTIONS request to /api/img');
	return new Response('', {
		headers: {
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Allow-Origin': 'null'
		}
	});
};

export const POST: RequestHandler = async ({ request }) => {
	console.log('GET request to /api/img');

	const params = await request.json();

	const baseUrl = params.url;
	const imageDescription = params.description;
	const width = params.width;
	const height = params.height;

	console.log('Generating image for URL: ' + baseUrl, 'imageDescription: ' + imageDescription);

	const url = await generateImage(baseUrl, imageDescription, width, height);

	return json(
		{ url },
		{
			headers: {
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Allow-Origin': 'null'
			}
		}
	);
};

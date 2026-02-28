import { error, json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { MISTRAL_API_KEY } from '$env/static/private';
import { generateImage } from '$lib/server/generator.svelte';

export const POST: RequestHandler = async ({ request }) => {
	const params = await request.json();

	const baseUrl = params.url;
	const imageDescription = params.description;
	const width = params.width;
	const height = params.height;

	const url = await generateImage(baseUrl, imageDescription, width, height);

	return json({ url });
};

<script lang="ts">
	import './layout.css';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	let { children } = $props();

	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<div class="app">
	<main>{@render children()}</main>
</div>

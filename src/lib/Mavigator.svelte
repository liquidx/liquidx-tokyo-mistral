<script lang="ts">
	import BrowserFrame from '$lib/BrowserFrame.svelte';

	interface HistoryEntry {
		url: string;
		content: string;
	}

	const initialBody = `<html>
	<body style="padding: 16px; max-width: 400px; font-family: sans-serif;">
		<h1>The Eternal Browser of the Spotless Transformer Mind.</h1>
		<p>
		Type the URL of your dreams into the location bar and hit enter, the LLM will tell you want it thinks the website will look like.
		The weirder the better. 
		</p>
		<h2>Examples</h2>
		<ul>
		<li><a href="http://twitter.com/@christophercolumbus">twitter.com/@christophercolumbus</a></li>
		<li><a href="http://twitter.com/@shakespeare">http://twitter.com/@shakespeare</a></li>
		<li><a href="http://greatestpoems.com/">greatestpoems.com</a></li>
		<li><a href="http://cutest-llamas.org/">cutest-llamas.org</a></li>
		
		</ul>

	</body>
	</html>`;

	let htmlBody = $state(initialBody);
	let isLoading = $state(false);
	let history = $state<HistoryEntry[]>([]);
	let currentHistoryIndex = $state(-1);
	let currentUrl = $state('');

	const handleUrlChange = async (event: CustomEvent<{ url: string; text?: string }>) => {
		console.log('URL changed to:', event.detail.url);
		isLoading = true;

		try {
			// Make a request to the browse API
			const response = await fetch('/api/html', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url: event.detail.url,
					text: event.detail.text,
					includeJs: false,
					includeImages: true
				})
			});

			if (response.ok) {
				const data = await response.json();
				//console.log('API response:', data);

				// Filter out backticks, HTML markdown code blocks, and doctype tags
				let cleanedResult = data.html
					.replace(/```html\n?/g, '')
					.replace(/```\n?/g, '')
					.replace(/<!DOCTYPE[^>]*>/gi, '')
					.trim();

				htmlBody = cleanedResult;

				// Add to history if this is a new navigation (not back/forward)
				if (currentHistoryIndex === -1 || currentHistoryIndex === history.length - 1) {
					// Remove any entries after current index (if user went back and then navigated)
					history = history.slice(0, currentHistoryIndex + 1);
					// Add new entry
					history = [...history, { url: event.detail.url, content: cleanedResult }];
					currentHistoryIndex = history.length - 1;
					currentUrl = event.detail.url; // Update current URL
				}
			} else {
				console.error('Error fetching API:', response.statusText);
			}
		} catch (error) {
			console.error('Network error:', error);
		} finally {
			isLoading = false;
		}
	};

	const handleLinkClick = async (event: CustomEvent<{ url: string; text: string }>) => {
		console.log('Link clicked:', event.detail.text, 'URL:', event.detail.url);
		// Trigger the same URL change handler
		handleUrlChange(
			new CustomEvent('urlchange', { detail: { url: event.detail.url, text: event.detail.text } })
		);
	};

	const handleBack = () => {
		if (currentHistoryIndex > 0) {
			currentHistoryIndex--;
			const entry = history[currentHistoryIndex];
			htmlBody = entry.content;
			currentUrl = entry.url; // Update location bar
		}
	};

	const handleForward = () => {
		if (currentHistoryIndex < history.length - 1) {
			currentHistoryIndex++;
			const entry = history[currentHistoryIndex];
			htmlBody = entry.content;
			currentUrl = entry.url; // Update location bar
		}
	};

	const handleReload = () => {
		// Reload the current URL by making a new API request
		if (currentUrl) {
			handleUrlChange(new CustomEvent('urlchange', { detail: { url: currentUrl } }));
		}
	};

	const handleHome = () => {
		// Reset to initial state
		htmlBody = initialBody;
		currentUrl = '';
		history = [];
		currentHistoryIndex = -1;
	};

	const canGoBack = $derived(currentHistoryIndex > 0);
	const canGoForward = $derived(currentHistoryIndex < history.length - 1);
</script>

<BrowserFrame
	onurlchange={handleUrlChange}
	onlinkclick={handleLinkClick}
	onback={handleBack}
	onforward={handleForward}
	onreload={handleReload}
	onhome={handleHome}
	contents={htmlBody}
	loading={isLoading}
	{canGoBack}
	{canGoForward}
	currentUrlProp={currentUrl}
/>

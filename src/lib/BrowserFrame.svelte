<script lang="ts">
	import { browser } from '$app/environment';
	import BrowserFrameButton from './BrowserFrameButton.svelte';
	import BrowserFrameWindowButton from './BrowserFrameWindowButton.svelte';
	import BrowserFrameLoadingIndicator from './BrowserFrameLoadingIndicator.svelte';

	let currentUrl = $state('');
	let browserTitle = $state('Metscape Mavigator');

	let windowWidth = $state<number | undefined>(undefined);
	let windowHeight = $state<number | undefined>(undefined);

	type ResizerEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

	function resizable(node: HTMLElement, edge: ResizerEdge) {
		let startX: number;
		let startY: number;
		let startWidth: number;
		let startHeight: number;

		function handlePointerDown(event: PointerEvent) {
			event.preventDefault();

			const windowEl = node.closest('.browser-window') as HTMLElement;
			if (!windowEl) return;

			startX = event.clientX;
			startY = event.clientY;
			startWidth = windowEl.offsetWidth;
			startHeight = windowEl.offsetHeight;

			windowWidth = startWidth;
			windowHeight = startHeight;

			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
		}

		function handlePointerMove(event: PointerEvent) {
			const dx = event.clientX - startX;
			const dy = event.clientY - startY;

			if (edge.includes('e')) {
				windowWidth = Math.max(320, startWidth + dx);
			}
			if (edge.includes('w')) {
				windowWidth = Math.max(320, startWidth - dx);
			}
			if (edge.includes('s')) {
				windowHeight = Math.max(200, startHeight + dy);
			}
			if (edge.includes('n')) {
				windowHeight = Math.max(200, startHeight - dy);
			}
		}

		function handlePointerUp() {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
		}

		node.addEventListener('pointerdown', handlePointerDown);

		return {
			destroy() {
				node.removeEventListener('pointerdown', handlePointerDown);
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerup', handlePointerUp);
			}
		};
	}

	interface Props {
		contents: string;
		loading?: boolean;
		canGoBack?: boolean;
		canGoForward?: boolean;
		currentUrlProp?: string;
		onurlchange?: (event: CustomEvent<{ url: string }>) => void;
		onlinkclick?: (event: CustomEvent<{ url: string; text: string }>) => void;
		onback?: () => void;
		onforward?: () => void;
		onreload?: () => void;
		onhome?: () => void;
	}

	let {
		contents = '',
		loading = false,
		canGoBack = false,
		canGoForward = false,
		currentUrlProp,
		onurlchange,
		onlinkclick,
		onback,
		onforward,
		onreload,
		onhome
	}: Props = $props();

	// Update currentUrl when prop changes (for back navigation)
	$effect(() => {
		if (currentUrlProp) {
			currentUrl = currentUrlProp;
		}
	});

	// Create a data URL for the iframe
	function createDataUrl(htmlContent: string): string {
		const clickInterceptScript =
			'<scr' +
			'ipt>' +
			'document.addEventListener("DOMContentLoaded", function() {' +
			'document.addEventListener("click", function(e) {' +
			'if (e.target.tagName === "A" && e.target.href) {' +
			'e.preventDefault();' +
			'const url = e.target.href;' +
			'const text = e.target.textContent || e.target.innerText || "";' +
			'window.parent.postMessage({' +
			'type: "linkClick",' +
			'url: url,' +
			'text: text.trim()' +
			'}, "*");' +
			'}' +
			'});' +
			'});' +
			'</scr' +
			'ipt>';

		// Inject the script at the end of the HTML content
		const modifiedHtml = htmlContent + clickInterceptScript;
		return `data:text/html;charset=utf-8,${encodeURIComponent(modifiedHtml)}`;
	}

	const dataUrl = $derived(createDataUrl(contents));
	const statusText = $derived(loading ? 'Loading...' : 'Done');

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			// Convert spaces to dots and add http:// if URL doesn't start with http:// or https://
			let url = currentUrl.replace(/\s+/g, '.');
			if (!url.startsWith('http://') && !url.startsWith('https://')) {
				url = 'http://' + url;
			}
			currentUrl = url; // Update the input field
			onurlchange?.(new CustomEvent('urlchange', { detail: { url } }));
		}
	}

	function handleFocus(event: FocusEvent) {
		if (currentUrl === '') {
			currentUrl = 'http://';
			// Move cursor to the end
			setTimeout(() => {
				const input = event.target as HTMLInputElement;
				input.setSelectionRange(input.value.length, input.value.length);
			}, 0);
		}
	}

	function handleGoClick() {
		// Same logic as pressing Enter in the input field
		let url = currentUrl.replace(/\s+/g, '.');
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'http://' + url;
		}
		currentUrl = url;
		onurlchange?.(new CustomEvent('urlchange', { detail: { url } }));
	}

	// Resolve relative URLs against current URL
	function resolveUrl(url: string, baseUrl: string): string {
		// If URL starts with http/https, it's already absolute
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}

		// Handle relative paths
		try {
			return new URL(url, baseUrl).href;
		} catch {
			// Fallback if URL construction fails
			return url;
		}
	}

	// Convert text to URL path
	function textToUrlPath(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric except spaces
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
	}

	// Handle messages from iframe
	function handleMessage(event: MessageEvent) {
		console.log('handleMessage', event.data);
		if (event.data && event.data.type === 'linkClick') {
			let resolvedUrl: string;

			// If the URL starts with http, use it directly
			if (event.data.url.startsWith('http://') || event.data.url.startsWith('https://')) {
				resolvedUrl = event.data.url;
			} else if (event.data.url.startsWith('data:')) {
				// If it's a data URL, generate URL path from the link text
				const pathFromText = textToUrlPath(event.data.text);
				const urlPath = pathFromText ? `/${pathFromText}` : '/';

				// Use default base URL if currentUrl is blank or has no hostname
				let baseUrl = currentUrl;
				if (!baseUrl || !baseUrl.includes('://') || baseUrl === 'http://') {
					baseUrl = 'http://lets.llm/';
				}

				resolvedUrl = resolveUrl(urlPath, baseUrl);
			} else {
				// For other schemes, use resolveUrl
				resolvedUrl = resolveUrl(event.data.url, currentUrl);
			}

			// Update location bar to show the new URL (this won't trigger handleKeyDown)
			currentUrl = resolvedUrl;

			onlinkclick?.(
				new CustomEvent('linkclick', {
					detail: {
						url: resolvedUrl,
						text: event.data.text
					}
				})
			);
		}
	}

	// Set up message listener using $effect
	$effect(() => {
		if (!browser) return;

		window.addEventListener('message', handleMessage);

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	});
</script>

<svelte:head>
	<title>{browserTitle}</title>
</svelte:head>

<div
	class="browser-window font-oldbrowser relative mx-auto my-8 flex w-[320px] flex-col border-2 border-t-white border-r-gray-600 border-b-gray-600 border-l-white bg-gray-300 text-xs text-gray-600 shadow-lg md:w-[800px]"
	style="{windowWidth ? `width: ${windowWidth}px;` : ''} {windowHeight
		? `height: ${windowHeight}px;`
		: ''}"
>
	<!-- resize handles -->
	<div
		class="absolute top-0 right-0 bottom-0 z-50 w-2 cursor-e-resize"
		use:resizable={'e'}
		style="right: -4px;"
	></div>
	<div
		class="absolute top-0 bottom-0 left-0 z-50 w-2 cursor-w-resize"
		use:resizable={'w'}
		style="left: -4px;"
	></div>
	<div
		class="absolute top-0 right-0 left-0 z-50 h-2 cursor-n-resize"
		use:resizable={'n'}
		style="top: -4px;"
	></div>
	<div
		class="absolute right-0 bottom-0 left-0 z-50 h-2 cursor-s-resize"
		use:resizable={'s'}
		style="bottom: -4px;"
	></div>

	<!-- corners -->
	<div
		class="absolute top-0 right-0 z-50 h-3 w-3 cursor-ne-resize"
		use:resizable={'ne'}
		style="top: -4px; right: -4px;"
	></div>
	<div
		class="absolute top-0 left-0 z-50 h-3 w-3 cursor-nw-resize"
		use:resizable={'nw'}
		style="top: -4px; left: -4px;"
	></div>
	<div
		class="absolute right-0 bottom-0 z-50 h-3 w-3 cursor-se-resize"
		use:resizable={'se'}
		style="bottom: -4px; right: -4px;"
	></div>
	<div
		class="absolute bottom-0 left-0 z-50 h-3 w-3 cursor-sw-resize"
		use:resizable={'sw'}
		style="bottom: -4px; left: -4px;"
	></div>

	<div
		class="flex items-center justify-between bg-gradient-to-r from-blue-800 to-blue-400 px-2 py-1 font-bold text-white select-none"
	>
		<div>{browserTitle}</div>
		<div class="flex">
			<BrowserFrameWindowButton type="minimize" />
			<BrowserFrameWindowButton type="maximize" />
			<BrowserFrameWindowButton type="close" />
		</div>
	</div>

	<div class="flex flex-nowrap overflow-x-clip p-0.5 select-none">
		<span class="mr-0.5 px-1.5 py-0.5"><u>F</u>ile</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>E</u>dit</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>V</u>iew</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>G</u>o</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>B</u>ookmarks</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>O</u>ptions</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>D</u>irectory</span>
		<span class="mr-0.5 px-1.5 py-0.5"><u>H</u>elp</span>
	</div>

	<div
		class="flex items-center justify-between overflow-x-clip border-t border-b border-t-white border-b-gray-500 p-1"
	>
		<div class="flex flex-wrap">
			<BrowserFrameButton onclick={canGoBack ? onback : undefined} disabled={!canGoBack}
				>Back</BrowserFrameButton
			>
			<BrowserFrameButton onclick={canGoForward ? onforward : undefined} disabled={!canGoForward}
				>Forward</BrowserFrameButton
			>
			<BrowserFrameButton onclick={onhome}>Home</BrowserFrameButton>
			<BrowserFrameButton onclick={onreload}>Reload</BrowserFrameButton>
			<BrowserFrameButton disabled={!loading}>Stop</BrowserFrameButton>
		</div>
		<BrowserFrameLoadingIndicator {loading} />
	</div>

	<div class="flex items-center p-1">
		<label for="location-input" class="mx-2 font-bold">Location:</label>
		<input
			id="location-input"
			type="text"
			class="font-inherit flex-grow border-2 border-t-gray-600 border-r-gray-100 border-b-gray-100 border-l-gray-600 bg-white px-0.5 py-0.5 text-inherit"
			bind:value={currentUrl}
			onkeydown={handleKeyDown}
			onfocus={handleFocus}
		/>
		<div class="mx-2">
			<BrowserFrameButton onclick={handleGoClick}>Go</BrowserFrameButton>
		</div>
	</div>

	<div
		class="m-1 flex-grow {windowHeight
			? 'min-h-0'
			: 'h-96'} border-2 border-t-gray-500 border-r-white border-b-white border-l-gray-500 bg-white"
	>
		<iframe src={dataUrl} class="h-full w-full border-0" title="Browser content"></iframe>
	</div>

	<div class="flex border-t border-t-white">
		<p
			class="m-0.5 flex-grow border border-t-gray-500 border-l-gray-500 px-1 py-0.5 whitespace-nowrap select-none"
		>
			{statusText}
		</p>
		<p
			class="m-0.5 w-48 border border-t-gray-500 border-l-gray-500 px-1 py-0.5 whitespace-nowrap select-none"
		></p>
		<p
			class="m-0.5 w-5 border border-t-gray-500 border-l-gray-500 px-1 py-0.5 text-center whitespace-nowrap select-none"
		>
			🔒
		</p>
	</div>
</div>

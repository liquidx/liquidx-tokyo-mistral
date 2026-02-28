<script lang="ts">
	import { browser } from '$app/environment';
	import BrowserFrameButton from './BrowserFrameButton.svelte';
	import BrowserFrameWindowButton from './BrowserFrameWindowButton.svelte';
	import BrowserFrameLoadingIndicator from './BrowserFrameLoadingIndicator.svelte';

	export interface MenuItem {
		label?: string;
		shortcut?: string;
		action?: string;
		separator?: boolean;
		checked?: boolean;
	}

	export interface Menu {
		id: string;
		label: string;
		items: MenuItem[];
	}

	let activeMenuId = $state<string | null>(null);

	function toggleMenu(id: string, event: MouseEvent) {
		event.stopPropagation();
		if (activeMenuId === id) {
			activeMenuId = null;
		} else {
			activeMenuId = id;
		}
	}

	function handleWindowClick() {
		activeMenuId = null;
	}

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
		loadImages?: boolean;
		loadJavascript?: boolean;
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
		loadImages = $bindable(true),
		loadJavascript = $bindable(false),
		onurlchange,
		onlinkclick,
		onback,
		onforward,
		onreload,
		onhome
	}: Props = $props();

	let menuBarData: Menu[] = $derived([
		{
			id: 'file',
			label: '<u>F</u>ile',
			items: [
				{ label: 'New Web Browser', shortcut: 'Ctrl+N' },
				{ label: 'New Document', shortcut: '' },
				{ separator: true },
				{ label: 'Open Location...', shortcut: 'Ctrl+L' },
				{ label: 'Open File...', shortcut: 'Ctrl+O' },
				{ separator: true },
				{ label: 'Close', shortcut: 'Ctrl+W' },
				{ label: 'Exit', shortcut: 'Ctrl+Q' }
			]
		},
		{
			id: 'edit',
			label: '<u>E</u>dit',
			items: [
				{ label: 'Undo', shortcut: 'Ctrl+Z' },
				{ separator: true },
				{ label: 'Cut', shortcut: 'Ctrl+X' },
				{ label: 'Copy', shortcut: 'Ctrl+C' },
				{ label: 'Paste', shortcut: 'Ctrl+V' },
				{ separator: true },
				{ label: 'Find in Page...', shortcut: 'Ctrl+F' }
			]
		},
		{
			id: 'view',
			label: '<u>V</u>iew',
			items: [
				{ label: 'Reload', shortcut: 'Ctrl+R', action: 'reload' },
				{ label: 'Reload Frame', shortcut: '' },
				{ separator: true },
				{ label: 'Document Source', shortcut: 'Ctrl+U' }
			]
		},
		{
			id: 'go',
			label: '<u>G</u>o',
			items: [
				{ label: 'Back', shortcut: 'Alt+Left', action: 'back' },
				{ label: 'Forward', shortcut: 'Alt+Right', action: 'forward' },
				{ label: 'Home', action: 'home' },
				{ label: 'Stop Loading', shortcut: 'Esc' }
			]
		},
		{
			id: 'bookmarks',
			label: '<u>B</u>ookmarks',
			items: [{ label: 'Add Bookmark', shortcut: 'Ctrl+D' }]
		},
		{
			id: 'options',
			label: '<u>O</u>ptions',
			items: [
				{ label: 'General Preferences...' },
				{ separator: true },
				{ label: 'Load Images', action: 'toggleImages', checked: loadImages },
				{ label: 'Load Javascript', action: 'toggleJavascript', checked: loadJavascript }
			]
		},
		{ id: 'directory', label: '<u>D</u>irectory', items: [{ label: "Netscape's Home" }] },
		{ id: 'help', label: '<u>H</u>elp', items: [{ label: 'About Netscape...' }] }
	]);

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
		window.addEventListener('click', handleWindowClick);

		return () => {
			window.removeEventListener('message', handleMessage);
			window.removeEventListener('click', handleWindowClick);
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

	<div class="relative z-50 flex flex-nowrap p-0.5 select-none">
		{#each menuBarData as menu}
			<div class="relative">
				<button
					type="button"
					class="mr-0.5 px-1.5 py-0.5 focus:outline-none {activeMenuId === menu.id
						? 'bg-blue-800 text-white'
						: ''}"
					onclick={(e) => toggleMenu(menu.id, e)}
					onmouseenter={() => {
						if (activeMenuId && activeMenuId !== menu.id) activeMenuId = menu.id;
					}}
				>
					{@html menu.label}
				</button>

				{#if activeMenuId === menu.id}
					<div
						class="absolute top-full left-0 min-w-[200px] border-2 border-t-gray-100 border-r-gray-600 border-b-gray-600 border-l-gray-100 bg-gray-300 py-1 shadow-md"
						onclick={(e) => e.stopPropagation()}
						role="menu"
						tabindex="-1"
					>
						{#each menu.items as item}
							{#if item.separator}
								<div class="mx-1 my-1 border-t border-b border-t-gray-500 border-b-gray-100"></div>
							{:else}
								<button
									type="button"
									class="group flex w-full justify-between px-4 py-0.5 text-left hover:bg-blue-800 hover:text-white focus:outline-none disabled:opacity-50"
									onclick={() => {
										activeMenuId = null;
										if (item.action === 'back' && canGoBack && onback) onback();
										if (item.action === 'forward' && canGoForward && onforward) onforward();
										if (item.action === 'home' && onhome) onhome();
										if (item.action === 'reload' && onreload) onreload();
										if (item.action === 'toggleImages') loadImages = !loadImages;
										if (item.action === 'toggleJavascript') loadJavascript = !loadJavascript;
									}}
								>
									<div>
										{#if item.checked !== undefined}
											<span class="inline-block w-4 text-center">{item.checked ? '✓' : ''}</span>
										{/if}
										<span>{item.label}</span>
									</div>
									{#if item.shortcut}
										<span class="ml-4 text-gray-700 group-hover:text-gray-300">{item.shortcut}</span
										>
									{/if}
								</button>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/each}
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

<script lang="ts">
	import { browser } from '$app/environment';
	import BrowserFrameButton from './BrowserFrameButton.svelte';
	import BrowserFrameWindowButton from './BrowserFrameWindowButton.svelte';
	import BrowserFrameLoadingIndicator from './BrowserFrameLoadingIndicator.svelte';
	import MistralLogo from './images/mistral.svg?raw';

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
	let browserTitle = $state('Miscape Mavigator');

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
		model?: string;
	}

	let {
		contents = '',
		loading = $bindable(false),
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
		onhome,
		model = $bindable('devstral-latest')
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
				{ label: 'Stop Loading', shortcut: 'Esc' },
				{ separator: true },
				{ label: 'Load Images', action: 'toggleImages', checked: loadImages },
				{ label: 'Load Javascript', action: 'toggleJavascript', checked: loadJavascript }
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
		{
			id: 'window',
			label: '<u>W</u>indow',
			items: [{ label: 'Bookmarks', shortcut: 'Ctrl+B' }]
		},
		{ id: 'help', label: '<u>H</u>elp', items: [{ label: 'About Miscape...' }] }
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

	let dataUrl = $derived(createDataUrl(contents));
	let statusText = $derived(loading ? 'Loading...' : 'Done');

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
			} else if (event.data.url.startsWith('data:') || event.data.url.startsWith('blob:')) {
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
		} else if (event.data && event.data.type === 'imagesLoaded') {
			loading = false;
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
	class="browser-window font-oldbrowser relative mx-auto my-8 flex w-[320px] flex-col border border-t-[3px] border-r-[3px] border-b-[3px] border-l-[3px] border-t-white border-r-gray-800 border-b-gray-800 border-l-white bg-[#C0C0C0] pb-1 text-xs text-black shadow-lg md:w-[800px]"
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
		class="flex items-center justify-between bg-[#000080] px-1 py-0.5 font-bold text-white select-none"
	>
		<div class="px2 flex items-center px-2 py-1">
			<div class="text-[13px]">{browserTitle}</div>
		</div>
		<div class="flex">
			<BrowserFrameWindowButton type="minimize" />
			<BrowserFrameWindowButton type="maximize" />
			<BrowserFrameWindowButton type="close" />
		</div>
	</div>

	<!-- Menu Bar -->
	<div
		class="relative z-50 flex flex-nowrap border-b border-b-white px-1 shadow-[0_1px_0_0_#808080] select-none"
	>
		{#each menuBarData as menu}
			<div class="relative py-1">
				<button
					type="button"
					class="px-2 focus:outline-none {activeMenuId === menu.id
						? 'bg-[#000080] text-white'
						: 'text-black'}"
					onclick={(e) => toggleMenu(menu.id, e)}
					onmouseenter={() => {
						if (activeMenuId && activeMenuId !== menu.id) activeMenuId = menu.id;
					}}
				>
					{@html menu.label}
				</button>

				{#if activeMenuId === menu.id}
					<div
						class="absolute top-full left-0 min-w-[200px] border-2 border-t-white border-r-gray-800 border-b-gray-800 border-l-white bg-[#C0C0C0] py-1 text-black shadow-md"
						onclick={(e) => e.stopPropagation()}
						role="menu"
						tabindex="-1"
					>
						{#each menu.items as item}
							{#if item.separator}
								<div class="mx-1 my-1 border-t border-b border-t-gray-500 border-b-white"></div>
							{:else}
								<button
									type="button"
									class="group flex w-full justify-between px-4 py-0.5 text-left hover:bg-[#000080] hover:text-white focus:outline-none disabled:opacity-50"
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
										<span class="ml-4">{item.shortcut}</span>
									{/if}
								</button>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Navigation Toolbar -->
	<div class="flex items-center border-b border-b-white pt-1 pb-0 shadow-[0_1px_0_0_#808080]">
		<!-- Etched Handle -->
		<div class="mr-1 ml-0.5 flex h-10 flex-col justify-center">
			<div class="h-full w-1 border-r border-l border-r-gray-500 border-l-white"></div>
		</div>

		<div class="flex flex-grow flex-wrap gap-0.5">
			<BrowserFrameButton onclick={canGoBack ? onback : undefined} disabled={!canGoBack}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#6b7280"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-px"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				<span class="text-[11px] leading-none">Back</span>
			</BrowserFrameButton>
			<BrowserFrameButton onclick={canGoForward ? onforward : undefined} disabled={!canGoForward}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#6b7280"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-px"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
				<span class="text-[11px] leading-none">Forward</span>
			</BrowserFrameButton>
			<BrowserFrameButton onclick={onreload}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="black"
					stroke-width="1.5"
					class="mb-[1px]"
					><path
						d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
						fill="#797979"
					/></svg
				>
				<span class="text-[11px] leading-none">Reload</span>
			</BrowserFrameButton>
			<BrowserFrameButton onclick={onhome}>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="mb-[1px]"
					><polygon points="12,3 2,12 22,12" fill="#808080" stroke="black" stroke-width="1" /><rect
						x="4"
						y="12"
						width="16"
						height="10"
						fill="#afafaf"
						stroke="black"
						stroke-width="1"
					/></svg
				>
				<span class="text-[11px] leading-none">Home</span>
			</BrowserFrameButton>

			<div class="flex items-center justify-center px-1 py-1">
				<div class="h-8 border-r border-l border-r-white border-l-gray-500"></div>
			</div>

			<BrowserFrameButton>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="black"
					stroke-width="1.5"
					class="mb-[1px]"
					><circle cx="10" cy="10" r="6" fill="#9a9a9a" /><line
						x1="14.5"
						y1="14.5"
						x2="20"
						y2="20"
					/></svg
				>
				<span class="text-[11px] leading-none">Search</span>
			</BrowserFrameButton>

			<BrowserFrameButton>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					class="mb-[1px]"
					stroke="black"
					stroke-width="1.5"
					><rect x="4" y="10" width="16" height="10" fill="#e6e6e6" /><rect
						x="6"
						y="2"
						width="12"
						height="8"
						fill="white"
					/><line x1="8" y1="5" x2="16" y2="5" /><line x1="8" y1="7" x2="16" y2="7" /></svg
				>
				<span class="text-[11px] leading-none">Print</span>
			</BrowserFrameButton>
			<BrowserFrameButton>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="black"
					stroke-width="1.5"
					class="mb-[1px]"
					><rect x="6" y="11" width="12" height="10" fill="#afafaf" /><path
						d="M8 11V7a4 4 0 018 0v4"
					/></svg
				>
				<span class="text-[11px] leading-none">Security</span>
			</BrowserFrameButton>
			<BrowserFrameButton disabled={!loading}>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="black"
					stroke-width="1.5"
					class="mb-[1px]"
					><circle cx="12" cy="12" r="10" fill="#777777" /><circle
						cx="12"
						cy="12"
						r="6"
						fill="white"
						stroke="none"
					/></svg
				>
				<span class="text-[11px] leading-none">Stop</span>
			</BrowserFrameButton>
		</div>

		<div class="relative mr-1 ml-1 flex h-12 w-12 items-center justify-center overflow-hidden">
			<BrowserFrameLoadingIndicator {loading} />
		</div>
	</div>

	<!-- Location Bar -->
	<div class="flex items-center border-b border-b-white py-1 shadow-[0_1px_0_0_#808080]">
		<!-- Etched Handle -->
		<div class="mr-1 ml-0.5 flex h-5 flex-col justify-center">
			<div class="h-full w-1 border-r border-l border-r-gray-500 border-l-white"></div>
		</div>

		<button
			class="mx-0.5 flex items-center border border-transparent px-1.5 py-0.5 text-black hover:border-t-white hover:border-r-gray-600 hover:border-b-gray-600 hover:border-l-white"
		>
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				class="mr-1 fill-gray-500"
				stroke="black"
				stroke-width="1"
				><path d="M4 2v20h16V2H4z" /><line
					x1="16"
					y1="6"
					x2="16"
					y2="18"
					stroke="#4c4c4c"
					stroke-width="2"
				/></svg
			>
			<span class="mr-1 text-[13px]">Bookmarks</span>
			<svg width="8" height="8" viewBox="0 0 24 24"
				><polygon points="0,0 24,0 12,12" fill="black" /></svg
			>
		</button>

		<label for="location-input" class="mx-1 text-[13px] whitespace-nowrap">Location:</label>
		<input
			id="location-input"
			type="text"
			class="font-inherit h-6 min-w-[50px] flex-grow border-2 border-t-gray-600 border-r-white border-b-white border-l-gray-600 bg-white px-1 py-0.5 text-inherit focus:outline-none"
			bind:value={currentUrl}
			onkeydown={handleKeyDown}
			onfocus={handleFocus}
		/>

		<select
			class="mx-1 h-6 border-2 border-t-gray-600 border-r-white border-b-white border-l-gray-600 bg-white px-1 py-0.5 text-[11px] focus:outline-none"
			bind:value={model}
		>
			<option value="devstral-latest">devstral-latest</option>
			<option value="codestral-latest">codestral-latest</option>
			<option value="mistral-medium-latest">mistral-medium-latest</option>
			<option value="mistral-large-latest">mistral-large-latest</option>
		</select>

		<button class="mx-0.5 flex items-center px-1.5 py-0.5 font-bold" onclick={handleGoClick}>
			<span class="mx-1 text-[13px] whitespace-nowrap">Go</span>
		</button>
	</div>

	<!-- Personal Toolbar -->
	<div class="flex items-center border-b border-b-white py-0.5 shadow-[0_1px_0_0_#808080]">
		<!-- Etched Handle -->
		<div class="mr-1 ml-0.5 flex h-5 flex-col justify-center">
			<div class="h-full w-1 border-r border-l border-r-gray-500 border-l-white"></div>
		</div>

		<div class="flex flex-nowrap gap-x-4 overflow-hidden px-1 text-[13px] text-[#000080]">
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><rect width="24" height="16" y="4" fill="#c4c4c4" stroke="black" stroke-width="1" /></svg
				>WebMail</span
			>
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><circle cx="12" cy="12" r="8" fill="#9b9b9b" stroke="black" stroke-width="1" /></svg
				>Contact</span
			>
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><path
						d="M12 14c-4.42 0-8 3.58-8 8h16c0-4.42-3.58-8-8-8zM12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"
						fill="#c4c4c4"
						stroke="black"
						stroke-width="1"
					/></svg
				>People</span
			>
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><rect
						width="20"
						height="24"
						x="2"
						y="0"
						fill="#c4c4c4"
						stroke="black"
						stroke-width="1"
					/><line x1="2" y1="8" x2="22" y2="8" stroke="black" stroke-width="1" /><line
						x1="2"
						y1="16"
						x2="22"
						y2="16"
						stroke="black"
						stroke-width="1"
					/></svg
				>Yellow Pages</span
			>
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><polygon
						points="12,22 22,12 16,12 16,2 8,2 8,12 2,12"
						fill="#bdbdbd"
						stroke="black"
						stroke-width="1"
					/></svg
				>Download</span
			>
			<span class="flex cursor-pointer items-center whitespace-nowrap hover:underline"
				><svg width="12" height="12" viewBox="0 0 24 24" class="mr-1 mb-[1px]"
					><rect
						width="20"
						height="16"
						x="2"
						y="4"
						rx="2"
						fill="#d4d4d4"
						stroke="black"
						stroke-width="1"
					/><circle cx="12" cy="20" r="1.5" fill="black" /></svg
				>Channels</span
			>
		</div>
	</div>

	<!-- iframe area -->
	<div class="relative flex flex-grow flex-col pt-1 {windowHeight ? 'min-h-0' : 'h-96'}">
		<div
			class="mx-0.5 flex flex-grow flex-col overflow-hidden border-2 border-t-gray-500 border-r-white border-b-white border-l-gray-500 bg-white"
		>
			<div
				class="relative flex-grow border border-t-black border-r-gray-300 border-b-gray-300 border-l-black"
			>
				<iframe
					src={dataUrl}
					class="absolute inset-0 h-full w-full border-0 bg-white"
					title="Browser content"
				></iframe>
			</div>
		</div>
	</div>

	<!-- Status bar -->
	<div class="mt-1 flex border-t border-t-white text-black">
		<div class="flex w-8 items-center justify-center border-r border-solid border-r-gray-500 px-1">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="mb-[2px]"
				><rect
					x="6"
					y="11"
					width="12"
					height="10"
					fill="#afafaf"
					stroke="black"
					stroke-width="1.5"
				/><path d="M8 11V7a4 4 0 018 0v4" stroke="black" stroke-width="1.5" /></svg
			>
		</div>
		<p
			class="m-[1px] flex-grow border border-t-gray-500 border-r-white border-b-white border-l-gray-500 px-2 py-0 text-[11px] whitespace-nowrap shadow-[0_1px_0_0_#FFF]"
		>
			{statusText}
		</p>
		<p
			class="m-[1px] w-48 border border-t-gray-500 border-r-white border-b-white border-l-gray-500 px-1 py-0 text-[11px] whitespace-nowrap shadow-[0_1px_0_0_#FFF]"
		></p>
		<div
			class="m-[1px] flex items-center justify-center border border-t-gray-500 border-r-white border-b-white border-l-gray-500 px-1 py-0.5 shadow-[0_1px_0_0_#FFF]"
		>
			<div class="flex gap-[2px]">
				<div
					class="h-[8px] w-2 border-r-[3px] border-l-[3px] border-r-black border-l-gray-300 bg-gray-600"
				></div>
				<div
					class="h-[8px] w-2 border-r-[3px] border-l-[3px] border-r-black border-l-gray-300 bg-gray-600"
				></div>
				<div
					class="h-[8px] w-2 border-r-[3px] border-l-[3px] border-r-black border-l-gray-300 bg-gray-600"
				></div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
</script>

<!-- Overlay -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
>
	<!-- Dialog Window -->
	<div
		class="font-oldbrowser flex min-w-[320px] flex-col border-[3px] border-t-white border-r-gray-800 border-b-gray-800 border-l-white bg-[#C0C0C0] p-[2px] text-xs text-black shadow-xl"
	>
		<!-- Title Bar -->
		<div
			class="flex items-center justify-between bg-[#000080] px-1 py-0.5 font-bold text-white select-none"
		>
			<div class="px-1 text-[13px]">About Miscape</div>
			<button
				type="button"
				class="flex h-4 w-4 items-center justify-center border border-t-white border-r-gray-800 border-b-gray-800 border-l-white bg-[#C0C0C0] text-black hover:bg-[#d4d4d4] focus:border-t-gray-800 focus:border-r-white focus:border-b-white focus:border-l-gray-800 focus:outline-none"
				onclick={onclose}
				aria-label="Close"
			>
				<svg width="8" height="8" viewBox="0 0 10 10" stroke="black" stroke-width="2">
					<line x1="1" y1="1" x2="9" y2="9" />
					<line x1="9" y1="1" x2="1" y2="9" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex flex-col items-center gap-4 p-6">
			<div class="text-center">
				<h2 class="mb-2 text-lg font-bold">Miscape Mavigator</h2>
				<p>Version 1.0 (Windows)</p>
				<div class="mt-4 border-t border-gray-500 pt-4" style="border-bottom: 1px solid white;">
					<p class="text-gray-700">
						An exploration of the mind of the LLM represented by HTML. Making the LLM conjure up the
						web from it's own weights.
					</p>
				</div>
			</div>

			<button
				type="button"
				class="mt-2 min-w-[80px] border-2 border-t-white border-r-gray-800 border-b-gray-800 border-l-white bg-[#C0C0C0] px-4 py-1 font-bold hover:bg-[#d4d4d4] focus:border-t-gray-800 focus:border-r-white focus:border-b-white focus:border-l-gray-800 focus:outline-none active:border-t-gray-800 active:border-r-white active:border-b-white active:border-l-gray-800"
				onclick={onclose}
			>
				OK
			</button>
		</div>
	</div>
</div>

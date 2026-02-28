<script lang="ts">
	interface Props {
		type: 'minimize' | 'maximize' | 'close';
		onclick?: () => void;
	}

	let { type, onclick }: Props = $props();

	const symbols = {
		minimize: '−',
		maximize: '□',
		close: '×'
	};
</script>

<button
	class="ml-0.5 flex h-3.5 w-4 items-center justify-center border border-t-gray-200 border-r-black border-b-black border-l-gray-200 bg-gray-300 text-xs text-gray-600 active:border-t-black active:border-r-gray-200 active:border-b-gray-200 active:border-l-black"
	aria-label={type.charAt(0).toUpperCase() + type.slice(1)}
	{onclick}
>
	{symbols[type]}
</button>

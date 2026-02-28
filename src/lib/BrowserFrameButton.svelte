<script lang="ts">
	interface Props {
		children: any;
		onclick?: () => void;
		disabled?: boolean;
	}

	let { children, onclick, disabled = false }: Props = $props();

	const baseClasses =
		'border-2 border-t-gray-100 border-l-gray-100 border-r-gray-600 border-b-gray-600 px-2 py-1 mr-1 min-w-15 active:border-inset';
	const normalClasses = 'text-gray-600 hover:bg-gray-300';
	const disabledClasses = 'text-gray-400 cursor-not-allowed';
</script>

<button
	class="{baseClasses} {disabled ? disabledClasses : normalClasses}"
	onclick={disabled ? undefined : onclick}
	{disabled}
>
	{@render children()}
</button>

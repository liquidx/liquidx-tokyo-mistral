<script lang="ts">
	interface Props {
		children: any;
		onclick?: () => void;
		disabled?: boolean;
	}

	let { children, onclick, disabled = false }: Props = $props();

	const baseClasses =
		'flex flex-col items-center justify-center min-w-[50px] px-1.5 py-1 mx-[1px] border border-transparent select-none';
	const normalClasses =
		'text-black hover:border-t-white hover:border-l-white hover:border-r-gray-600 hover:border-b-gray-600 active:border-r-white active:border-b-white active:border-t-gray-600 active:border-l-gray-600';
	const disabledClasses = 'text-gray-400 opacity-50';
</script>

<button
	class="{baseClasses} {disabled ? disabledClasses : normalClasses}"
	onclick={disabled ? undefined : onclick}
	{disabled}
>
	{@render children()}
</button>

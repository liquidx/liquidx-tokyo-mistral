<script lang="ts">
	import MistralLogo from './images/mistral.svg?raw';

	interface Props {
		loading?: boolean;
	}

	let { loading = false }: Props = $props();
</script>

<div
	class="mistral-spinner relative flex h-8 w-11 shrink-0 items-center justify-center"
	aria-busy={loading}
>
	<!-- Scrolling colored vertical linear gradient masked to Mistral shape -->
	<div
		class="mask-image-mistral absolute inset-0 z-0 flex w-full items-center justify-center overflow-hidden"
	>
		<!-- The gradient container needs to be taller to allow vertical scrolling -->
		<div
			class="pointer-events-none absolute h-[300%] w-full"
			style="background: linear-gradient(to bottom, #FFD800 0%, #FFAF00 25%, #FF8205 50%, #FA500F 75%, #E10500 100%);"
			class:scrolling={loading}
		></div>
	</div>

	<!-- Black overlay Mistral Logo -->
	<div class="pointer-events-none absolute inset-0 z-10 h-full w-full text-black dark:text-white">
		{@html MistralLogo}
	</div>
</div>

<style>
	.scrolling {
		animation: scroll 1.5s linear infinite;
	}

	@keyframes scroll {
		from {
			transform: translateY(-33.33%);
		}
		to {
			transform: translateY(33.33%);
		}
	}

	.mask-image-mistral {
		mask-image: url('./images/mistral.svg');
		mask-size: contain;
		mask-repeat: no-repeat;
		mask-position: center;
		-webkit-mask-image: url('./images/mistral.svg');
		-webkit-mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-position: center;
	}
</style>

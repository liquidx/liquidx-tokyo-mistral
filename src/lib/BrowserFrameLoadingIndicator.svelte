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
	<!-- Spinning colored linear gradient masked to Mistral shape -->
	<div
		class="mask-image-mistral absolute inset-0 z-0 flex w-full items-center justify-center overflow-hidden transition-opacity duration-300"
		class:opacity-100={loading}
		class:opacity-0={!loading}
	>
		<!-- Container needs to be square and large enough to cover the whole shape while rotating -->
		<div
			class="pointer-events-none absolute aspect-square w-[300%]"
			style="background: linear-gradient(to bottom, #cbcbcb, #b2b2b2, #999999, #7b7b7b, #464646, #cbcbcb);"
			class:spinning={loading}
		></div>
	</div>

	<!-- Red overlay Mistral Logo (hides when loading to show gradient) -->
	<div
		class="pointer-events-none absolute inset-0 z-10 h-full w-full text-[#464646] transition-opacity duration-300"
		class:opacity-0={loading}
		class:opacity-100={!loading}
	>
		{@html MistralLogo}
	</div>
</div>

<style>
	.spinning {
		animation: scroll 1.5s steps(12, end) infinite;
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

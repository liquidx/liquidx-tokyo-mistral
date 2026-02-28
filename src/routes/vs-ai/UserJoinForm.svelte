<script lang="ts">
	let { joinParty, username = $bindable() }: { joinParty: () => void; username: string } = $props();
</script>

<div class="flex flex-col gap-8 rounded-lg bg-amber-400 p-8 text-xl font-bold">
	<label for="player" class="text-amber-600"> Player </label>
	<input
		id="player"
		type="text"
		bind:value={username}
		class="rounded-lg border-2 border-orange-600 bg-orange-400 p-2"
	/>
	<button onclick={joinParty} class="rounded-lg bg-orange-600 p-2 text-white"> Join Game </button>
</div>

<script lang="ts">
	let { player }: { player: string } = $props();
</script>

<div class="flex w-96 flex-col gap-8 rounded-lg bg-amber-400 p-8 text-xl font-bold">
	{player}
</div>

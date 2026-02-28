<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PartySocket from 'partysocket';
	import UserJoinForm from './UserJoinForm.svelte';
	import type { GameMessage } from '$lib/game';
	import PlayerBox from './PlayerBox.svelte';

	let socket: PartySocket | undefined = $state(undefined);

	let isHost = $state(false);
	let username = $state('');
	let message = $state('');

	let players: string[] = $state([]);

	function sendToPartyServer() {
		if (socket) {
			const parcel = JSON.stringify({
				message,
				username
			});

			socket.send(parcel);
		}
	}

	const joinParty = () => {
		socket = new PartySocket({
			host: 'localhost:1999',
			room: 'room-id'
		});

		if (!socket) {
			return;
		}
		socket.addEventListener('message', (event) => {
			parseMessage(event.data);
		});

		tick().then(() => {
			const joinMessage = JSON.stringify({
				command: 'join',
				username: username
			});
			if (!socket) {
				return;
			}

			socket.send(joinMessage);
		});
	};

	const parseMessage = (message: string) => {
		const envelope: GameMessage = JSON.parse(message);
		if (envelope.command == 'joined') {
			players = envelope.players ?? [];
		}
		if (envelope.command == 'question') {
		}
		if (envelope.command == 'answer') {
		}
	};

	onMount(() => {
		// listen to the server's broadcasts (this.party.broadcast)
	});
</script>

<section class="flex items-center justify-center gap-4 p-8">
	{#if !socket}
		<UserJoinForm {joinParty} bind:username />
	{/if}

	{#if socket}
		{#each players as player (player)}
			<PlayerBox {player} />
		{/each}
	{/if}
</section>

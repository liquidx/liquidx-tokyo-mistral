import type * as Party from 'partykit/server';
import type { GameMessage } from '../src/lib/game';

export default class Server implements Party.Server {
	constructor(readonly party: Party.Room) {}

	connectedIds: string[] = [];
	connectionUserMap: Record<string, string> = {};
	hostId: string | undefined = undefined;

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		this.connectedIds.push(conn.id);

		if (!this.hostId) {
			this.hostId = conn.id;
			this.sendBecomeHost(this.hostId);
		}

		const isHost = this.connectedIds.length === 1;

		// when joining, broadcast what connection (ID) the client has
		const envelope: GameMessage = {
			command: 'joined',
			players: Object.values(this.connectionUserMap)
		};
		this.party.broadcast(JSON.stringify(envelope));
	}

	onClose(conn: Party.Connection) {
		console.log('Disconnecting', conn.id);
		this.connectedIds = this.connectedIds.filter((id) => id !== conn.id);
		delete this.connectionUserMap[conn.id];

		if (this.hostId === conn.id) {
			// Find the next connection who will become the host.
			if (this.connectedIds.length > 0) {
				this.hostId = this.connectedIds[0];
				this.sendBecomeHost(this.hostId);
			} else {
				this.hostId = undefined;
			}
		}
	}

	onMessage(message: string, sender: Party.Connection) {
		// get parcel sent from client by parsing 'message'
		const command: { username: string; command: string; question?: string; answer?: string } =
			JSON.parse(message);
		if (command.command == 'join') {
			console.log('[RECV] join', command.username);
			// Ensure name is unique
			const existingUsernames = Object.values(this.connectionUserMap);
			if (existingUsernames.includes(command.username)) {
				command.username = command.username + ' ' + (existingUsernames.length + 1);
			}

			// Send the message to everyone else.
			this.connectionUserMap[sender.id] = command.username;
			const envelope: GameMessage = {
				command: 'joined',
				players: Object.values(this.connectionUserMap)
			};
			this.party.broadcast(JSON.stringify(envelope));
		}

		if (command.command == 'start') {
			const envelope = JSON.stringify({
				command: 'start'
			});
			this.party.broadcast(envelope);
		}

		if (command.command == 'question' && command.question) {
			this.party.broadcast(
				JSON.stringify({
					command: 'question',
					username: command.username,
					question: command.question
				})
			);
		}

		if (command.command == 'answer' && command.answer) {
			this.party.broadcast(
				JSON.stringify({
					command: 'answer',
					username: command.username,
					answer: command.answer
				})
			);
		}
	}

	sendBecomeHost(hostId: string) {
		console.log('Sending become host to', hostId);
		if (!hostId) {
			console.log('No hostId provided');
			return;
		}

		const hostConnection = this.party.getConnection(hostId);
		if (!hostConnection) {
			return;
		}

		const envelope = JSON.stringify({
			isHost: hostId
		});

		hostConnection.send(envelope);
	}
}

Server satisfies Party.Worker;

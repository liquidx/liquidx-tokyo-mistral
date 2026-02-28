export type GameMessage = {
	command: string;
	username?: string;
	question?: string;
	answer?: string;
	players?: string[];
};

export type Player = {
	username: string;
	isHost?: boolean;
	score?: number;
};

export type GameState = {
	players: Player[];
	currentQuestion?: string;
	currentAnswer?: string;
};

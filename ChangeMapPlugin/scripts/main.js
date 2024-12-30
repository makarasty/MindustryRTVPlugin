// Configuration
var config = {
	voteRatio: 0.5,
	cooldownMs: 12000,
	voteTimeoutMs: 60000,
};

// State management
var state = {
	delays: new Set(),
	rtvVotes: new Set(),
	mapChangeInProgress: false,
	voteTimer: null,
};

// Utility functions
function setTimeout(callback, delay) {
	var timer = new java.util.Timer();
	timer.schedule(new java.util.TimerTask({ run: callback }), delay);
	return timer;
}

function CommandsMethodRunner(method) {
	return new Packages.arc.util.CommandHandler.CommandRunner({ accept: method });
}

// Core functionality
function getRequiredVotes() {
	return Math.ceil(config.voteRatio * Groups.player.size());
}

function resetVoting() {
	if (state.voteTimer) {
		state.voteTimer.cancel();
		state.voteTimer = null;
	}
	state.rtvVotes.clear();
}

function startVoteTimeout() {
	if (state.voteTimer) {
		state.voteTimer.cancel();
	}

	state.voteTimer = setTimeout(function () {
		if (state.rtvVotes.size > 0) {
			Call.sendMessage(
				"[yellow]Голосування за зміну карти скасовано[gray]! [yellow]Недостатньо голосів протягом хвилини.",
			);
			resetVoting();
		}
	}, config.voteTimeoutMs);
}

function broadcastVoteStatus(player, currentVotes, requiredVotes) {
	if (requiredVotes === 1) {
		Call.sendMessage("[white]" + player.name + " [yellow]Змінює карту[gray]!");
	} else {
		var message = [
			"[white]" + player.name + " [yellow]Хоче змінити карту[gray]!",
			"[gray]Зараз голосів: [yellow]" + currentVotes,
			"[gray]Потрібно голосів: [yellow]" + requiredVotes,
			"[gray]Використовуй /rtv для зміни карти!",
		].join("\n");
		Call.sendMessage(message);
	}
}

function changeMap() {
	if (state.mapChangeInProgress) return;

	state.mapChangeInProgress = true;
	resetVoting();

	Call.sendMessage("[green]Голосів достатньо, змінюю карту!");

	Events.fire(new GameOverEvent(Team.crux));
}

function checkVotesAndChange() {
	var currentVotes = state.rtvVotes.size;
	var requiredVotes = getRequiredVotes();

	if (currentVotes >= requiredVotes) {
		changeMap();
	}
}

// Command handler
function rtvCommand(args, player) {
	var playerID = player.uuid();

	if (state.delays.has(playerID)) {
		player.sendMessage(
			"[red]Куди так швидко[gray]?[red] Почекай секунду друже[gray]!",
		);
		return;
	}

	state.delays.add(playerID);
	setTimeout(function () {
		state.delays.delete(playerID);
	}, config.cooldownMs);

	if (state.rtvVotes.has(playerID)) {
		player.sendMessage("[red]Ви вже голосували за зміну карти[gray]!");
		return;
	}

	if (state.rtvVotes.size === 0) {
		startVoteTimeout();
	}

	state.rtvVotes.add(playerID);
	broadcastVoteStatus(player, state.rtvVotes.size, getRequiredVotes());
	checkVotesAndChange();
}

// Event handlers
function HandleServerLoad(event) {
	Vars.netServer.clientCommands.register(
		"rtv",
		"",
		"Голосувати щоб змінити карту",
		CommandsMethodRunner(rtvCommand),
	);
}

function HandlePlayerLeave(event) {
	var playerID = event.player.uuid();

	if (state.rtvVotes.has(playerID)) {
		state.rtvVotes.delete(playerID);

		var message = [
			"[white]" + event.player.name + " [red]Покинув сервер[gray]!",
			"[gray]Голосування за зміну карти:",
			"[gray]Зараз голосів: [yellow]" + state.rtvVotes.size,
			"[gray]Потрібно голосів: [yellow]" + getRequiredVotes(),
		].join("\n");
		Call.sendMessage(message);

		if (state.rtvVotes.size === 0) {
			resetVoting();
		} else {
			checkVotesAndChange();
		}
	}
}

function HandleGameOver(event) {
	resetVoting();
	state.mapChangeInProgress = false;
}

// Events registration
Events.on(ServerLoadEvent, HandleServerLoad);
Events.on(PlayerLeave, HandlePlayerLeave);
Events.on(GameOverEvent, HandleGameOver);

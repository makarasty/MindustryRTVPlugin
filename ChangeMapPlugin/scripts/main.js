//Init
const delays = new Set()
const rtvVotes = new Set();
const rtvVoteRatio = 0.5; // 50% користувачів серверу повинні голосувати

// Functions
function setTimeout(callback, delay) {
	const timer = new java.util.Timer();

	timer.schedule(new java.util.TimerTask({ run: callback }), delay);
}

function CommandsMethodRunner(method) {
	return new Packages.arc.util.CommandHandler.CommandRunner({ accept: method })
}

function changeServerMapIfVotes(currentVotes, requiredVotes) {
	if (currentVotes >= requiredVotes) {
		rtvVotes.clear();

		Call.sendMessage('[green] Голосів достатньо, змінюю карту!');

		Events.fire(new GameOverEvent(Team.crux));
	}
}

function rtvCommand(args, player) {
	const playersCount = Groups.player.size()
	const requiredVotes = Math.ceil(rtvVoteRatio * playersCount);
	const playerID = player.uuid();

	if (delays.has(playerID)) {
		return player.sendMessage(`[red] Куди так швидко[gray]?[red] Почекай секунду друже[gray]!`);
	}

	delays.add(playerID);
	setTimeout(() => { delays.delete(playerID) }, 12000);

	if (rtvVotes.has(playerID)) {
		player.sendMessage(`[red]Ви вже голосували за зміну карти[gray]!`);
	} else {
		rtvVotes.add(playerID);

		if (requiredVotes === 1) {
			Call.sendMessage([
				'[white]' + player.name + ' [yellow]Змінює карту[gray]!'
			].join('\n'));
		} else {
			Call.sendMessage([
				'[white]' + player.name + ' [yellow]Хоче змінити карту[gray]!',
				'[gray]Зараз голосів: [yellow]' + rtvVotes.size,
				'[gray]Потрібно голосів: [yellow]' + requiredVotes,
				'[gray]Використовуй /rtv для зміни карти!'
			].join('\n'));
		}

		changeServerMapIfVotes(rtvVotes.size, requiredVotes)
	}
}

// Events functions
function HandleServerLoad(event) {
	Vars.netServer.clientCommands.register(
		'rtv',
		'',
		'Голосувати щоб змінити карту',
		CommandsMethodRunner(rtvCommand)
	)
}

function HandlePlayerLeave(event) {
	const playersCount = Groups.player.size()
	const requiredVotes = Math.ceil(rtvVoteRatio * playersCount);
	const playerID = event.player.uuid();

	if (rtvVotes.has(playerID)) {
		rtvVotes.delete(playerID);

		Call.sendMessage([
			'[white]' + event.player.name + ' [red]Покинув сервер[gray]!',
			'[gray]Голосування за зміну карти:',
			'[gray]Зараз голосів: [yellow]' + rtvVotes.size,
			'[gray]Потрібно голосів: [yellow]' + requiredVotes
		].join('\n'));
	}

	changeServerMapIfVotes(rtvVotes.size, requiredVotes)
}

function HandleGameOver(event) {
	rtvVotes.clear();
}

// Events register
Events.on(ServerLoadEvent, HandleServerLoad);
Events.on(PlayerLeave, HandlePlayerLeave);
Events.on(GameOverEvent, HandleGameOver);
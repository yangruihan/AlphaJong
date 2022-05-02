//################################
// API (MAHJONG SOUL)
// Returns data from Mahjong Souls Javascript
//################################


function preventAFK() {
	if (typeof GameMgr == 'undefined') {
		return;
	}
	GameMgr.Inst._pre_mouse_point.x = Math.floor(Math.random() * 100) + 1;
	GameMgr.Inst._pre_mouse_point.y = Math.floor(Math.random() * 100) + 1;
	GameMgr.Inst.clientHeatBeat(); // Prevent Client-side AFK
	app.NetAgent.sendReq2Lobby('Lobby', 'heatbeat', { no_operation_counter: 0 }); //Prevent Server-side AFK

	if (typeof view == 'undefined' || typeof view.DesktopMgr == 'undefined' ||
		typeof view.DesktopMgr.Inst == 'undefined' || view.DesktopMgr.Inst == null) {
		return;
	}
	view.DesktopMgr.Inst.hangupCount = 0;
	//uiscript.UI_Hangup_Warn.Inst.locking
}

function hasFinishedMainLobbyLoading() {
	if (typeof GameMgr == 'undefined') {
		return false;
	}
	return GameMgr.Inst.login_loading_end;
}

function searchForGame() {
	uiscript.UI_PiPeiYuYue.Inst.addMatch(ROOM);

	// Direct way to search for a game, without UI:
	// app.NetAgent.sendReq2Lobby('Lobby', 'startUnifiedMatch', {match_sid: 1 + ":" + ROOM, client_version_string: GameMgr.Inst.getClientVersion()});
}

function getOperationList() {
	return view.DesktopMgr.Inst.oplist;
}

function getOperations() {
	return mjcore.E_PlayOperation;
}

function getDora() {
	return view.DesktopMgr.Inst.dora;
}

function getPlayerHand() {
	return view.DesktopMgr.Inst.players[0].hand;
}

function getDiscardsOfPlayer(player) {
	player = getCorrectPlayerNumber(player);
	return view.DesktopMgr.Inst.players[player].container_qipai;
}

function getCallsOfPlayer(player) {
	player = getCorrectPlayerNumber(player);

	var callArray = [];
	//Mark the tiles with the player who discarded the tile
	for (let ming of view.DesktopMgr.Inst.players[player].container_ming.mings) {
		for (var i = 0; i < ming.pais.length; i++) {
			ming.pais[i].from = ming.from[i];
			if (i == 3) {
				ming.pais[i].kan = true;
			}
			else {
				ming.pais[i].kan = false;
			}
			callArray.push(ming.pais[i]);
		}
	}

	return callArray;
}

function getNumberOfKitaOfPlayer(player) {
	player = getCorrectPlayerNumber(player);

	return view.DesktopMgr.Inst.players[player].container_babei.pais.length;
}

function getTilesLeft() {
	return view.DesktopMgr.Inst.left_tile_count;
}

function localPosition2Seat(player) {
	player = getCorrectPlayerNumber(player);
	return view.DesktopMgr.Inst.localPosition2Seat(player);
}

function seat2LocalPosition(playerSeat) {
	return view.DesktopMgr.Inst.seat2LocalPosition(playerSeat);
}

function getCurrentPlayer() {
	return view.DesktopMgr.Inst.index_player;
}

function getSeatWind(player) {
	return ((4 + localPosition2Seat(player) - view.DesktopMgr.Inst.index_ju) % 4) + 1;
}

function getRound() {
	return view.DesktopMgr.Inst.index_ju;
}

function getRoundWind() {
	return view.DesktopMgr.Inst.index_change + 1;
}

function setAutoCallWin(win) {
	view.DesktopMgr.Inst.setAutoHule(win);
	//view.DesktopMgr.Inst.setAutoNoFulu(true) //Auto No Chi/Pon/Kan
	try {
		uiscript.UI_DesktopInfo.Inst.refreshFuncBtnShow(uiscript.UI_DesktopInfo.Inst._container_fun.getChildByName("btn_autohu"), view.DesktopMgr.Inst.auto_hule); //Refresh GUI Button
	}
	catch {
		return;
	}
}

function getTileForCall() {
	if (view.DesktopMgr.Inst.lastqipai == null) {
		return { index: 0, type: 0, dora: false, doraValue: 0 };
	}
	var tile = view.DesktopMgr.Inst.lastqipai.val;
	tile.doraValue = getTileDoraValue(tile);
	return tile;
}

function makeCall(type) {
	if (MODE === AIMODE.AUTO) {
		app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', { type: type, index: 0, timeuse: Math.random() * 2 + 1 });
		view.DesktopMgr.Inst.WhenDoOperation();
	} else {
		showCrtStrategyMsg(`call ${getCallNameByType(type)} accepted;`);
	}
}

function makeCallWithOption(type, option) {
	if (MODE === AIMODE.AUTO) {
		app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', { type: type, index: option, timeuse: Math.random() * 2 + 1 });
		view.DesktopMgr.Inst.WhenDoOperation();
	} else {
		showCrtStrategyMsg(`call ${getCallNameByType(type)} with ${option} accepted;`);
	}
}

function declineCall(operation) {
	if (MODE === AIMODE.AUTO) {
		if (operation == getOperationList()[getOperationList().length - 1].type) { //Is last operation -> Send decline Command
			app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', { cancel_operation: true, timeuse: Math.random() * 2 + 1 });
			view.DesktopMgr.Inst.WhenDoOperation();
		}
	} else {
		showCrtStrategyMsg(`call ${getCallNameByType(operation)} declined;`);
	}
}

function sendRiichiCall(tile, moqie) {
	if (MODE === AIMODE.AUTO) {
		app.NetAgent.sendReq2MJ('FastTest', 'inputOperation', { type: mjcore.E_PlayOperation.liqi, tile: tile, moqie: moqie, timeuse: Math.random() * 2 + 1 }); //Moqie: Throwing last drawn tile (Riichi -> false)
	} else {
		let tileName = getTileEmoji(tile);
		showCrtStrategyMsg(`riichi ${tileName};`);
	}
}

function sendKitaCall() {
	if (MODE === AIMODE.AUTO) {
		var moqie = view.DesktopMgr.Inst.mainrole.last_tile.val.toString() == "4z";
		app.NetAgent.sendReq2MJ('FastTest', 'inputOperation', { type: mjcore.E_PlayOperation.babei, moqie: moqie, timeuse: Math.random() * 2 + 1 });
		view.DesktopMgr.Inst.WhenDoOperation();
	} else {
		showCrtStrategyMsg(`kita accepted;`);
	}
}

function sendAbortiveDrawCall() {
	if (MODE === AIMODE.AUTO) {
		app.NetAgent.sendReq2MJ('FastTest', 'inputOperation', { type: mjcore.E_PlayOperation.jiuzhongjiupai, index: 0, timeuse: Math.random() * 2 + 1 });
		view.DesktopMgr.Inst.WhenDoOperation();
	} else {
		showCrtStrategyMsg(`Kyuushu Kyuuhai accepted;`);
	}
}

function callDiscard(tileNumber) {
	if (MODE === AIMODE.AUTO) {
		view.DesktopMgr.Inst.players[0]._choose_pai = view.DesktopMgr.Inst.players[0].hand[tileNumber];
		view.DesktopMgr.Inst.players[0].DoDiscardTile();
	} else {
		let tile = ownHand[tileNumber];
		let tileName = getTileName(tile, false);
		showCrtStrategyMsg(`discard ${tileName};`);
	}
}

function getPlayerLinkState(player) {
	player = getCorrectPlayerNumber(player);
	return view.DesktopMgr.player_link_state[localPosition2Seat(player)];
}

function getNumberOfPlayerHand(player) {
	player = getCorrectPlayerNumber(player);
	return view.DesktopMgr.Inst.players[player].hand.length;
}

function isEndscreenShown() {
	return this != null && view != null && view.DesktopMgr != null &&
		view.DesktopMgr.Inst != null && view.DesktopMgr.Inst.gameEndResult != null;
}

function isDisconnect() {
	return uiscript.UI_Hanguplogout.Inst != null && uiscript.UI_Hanguplogout.Inst._me.visible;
}

function isPlayerRiichi(player) {
	var player_correct = getCorrectPlayerNumber(player);
	return view.DesktopMgr.Inst.players[player_correct].liqibang._activeInHierarchy || getDiscardsOfPlayer(player).last_is_liqi;
}

function isInGame() {
	try {
		return this != null && view != null && view.DesktopMgr != null &&
			view.DesktopMgr.Inst != null && view.DesktopMgr.player_link_state != null &&
			view.DesktopMgr.Inst.active && !isEndscreenShown()
	}
	catch {
		return false;
	}
}

function doesPlayerExist(player) {
	return view.DesktopMgr.Inst.players[player].hand != undefined;
}

function getPlayerScore(player) {
	player = getCorrectPlayerNumber(player);
	return view.DesktopMgr.Inst.players[player].score;
}

//Needs to be called before calls array is updated
function hasPlayerHandChanged(player) {
	var player_correct = getCorrectPlayerNumber(player);
	for (let hand of view.DesktopMgr.Inst.players[player_correct].hand) {
		if (hand.old != true) {
			return true;
		}
	}
	return getCallsOfPlayer(player).length > calls[player].length;
}

//Sets a variable for each pai in a players hand
function rememberPlayerHand(player) {
	var player_correct = getCorrectPlayerNumber(player);
	for (let tile of view.DesktopMgr.Inst.players[player_correct].hand) {
		tile.old = true;
	}
}

function isEastRound() {
	return view.DesktopMgr.Inst.game_config.mode.mode == 1;
}

// Is the player able to join a given room
function isInRank(room) {
	var roomData = cfg.desktop.matchmode.get(room);
	try {
		var rank = GameMgr.Inst.account_data[roomData.mode < 10 ? "level" : "level3"].id; // 4 player or 3 player rank
		return (roomData.room == 100) || (roomData.level_limit <= rank && roomData.level_limit_ceil >= rank); // room 100 is casual mode
	}
	catch {
		return roomData.room == 100;
	}
}

// Map of all Rooms
function getRooms() {
	try {
		return cfg.desktop.matchmode;
	}
	catch {
		return null;
	}
}

// Client language
function getLanguage() {
	return GameMgr.client_language;
}

// Name of a room in client language
function getRoomName(room) {
	return room["room_name_" + getLanguage()] + " (" + game.Tools.room_mode_desc(room.mode) + ")";
}

// Extend some internal MJSoul functions with additional code
function extendMJSoulFunctions() {
	if (functionsExtended) {
		return;
	}
	trackRiichiDiscardTile();
	functionsExtended = true;
}

// Track which tile the players discarded on their riichi turn
function trackRiichiDiscardTile() {
	for (var i = 1; i < getNumberOfPlayers(); i++) {
		var player = getCorrectPlayerNumber(i);
		view.DesktopMgr.Inst.players[player].container_qipai.AddQiPai = (function (_super) { // Extend the MJ-Soul Discard function
			return function () {
				if (arguments[1]) { // Contains true when Riichi
					riichiTiles[seat2LocalPosition(this.player.seat)] = arguments[0]; // Track tile in riichiTiles Variable
					log("Riichi Discard: " + arguments[0].toString());
				}
				return _super.apply(this, arguments); // Call original function
			};
		})(view.DesktopMgr.Inst.players[player].container_qipai.AddQiPai);
	}
}
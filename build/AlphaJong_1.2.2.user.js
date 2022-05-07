// ==UserScript==
// @name         AlphaJong
// @namespace    alphajong
// @version      1.2.2
// @description  A Mahjong Soul Bot.
// @author       ryan
// @match        https://mahjongsoul.game.yo-star.com/*
// @match        https://majsoul.com/*
// @match        https://game.maj-soul.com/*
// @match        https://majsoul.union-game.com/*
// @match        https://game.mahjongsoul.com/*
// ==/UserScript==

//################################
// PARAMETERS
// Contains Parameters to change the playstile of the bot. Usually no need to change anything.
//################################

//DEFENSE CONSTANTS
var FOLD_CONSTANT = 10; //Lower -> Earlier Fold. Default: 10

//CALLS
var CALL_CONSTANT = 3; //Amount of han (Open Yaku + Dora) that is needed for calls (to accelerate high value hands). Default: 3
var CALL_KAN_CONSTANT = 50; //Higher Value: Call Kan more often. Default: 50

//HAND EVALUATION CONSTANTS. Higher number => more important.
var EFFICIENCY_VALUE = 0.5; // From 0-1. Lower: Slower hands. Higher: Daster hands. Default: 0.5
var SCORE_VALUE = 0.5 // From 0-1. Lower: Cheaper hands. Higher: More expensive hands. Default: 0.5
var SAFETY_VALUE = 0.5; // From 0-1. Lower: The bot will not pay much attention to safety. Higher: The bot will try to play safer. Default: 0.5
var SAKIGIRI_VALUE = 0.5; // 0 -> Never Sakigiri. Default: 0.3

//STRATEGY CONSTANTS
var CHIITOITSU = 5; //Number of Pairs in Hand to go for chiitoitsu. Default: 5
var THIRTEEN_ORPHANS = 10; //Number of Honor/Terminals in hand to go for 13 orphans. Default: 10
var RIICHI_TILES_LEFT = 6; //Minimum amount of tiles that need to be left for calling Riichi. Default: 6
var WAITS_FOR_RIICHI = 5; //Amount of waits that is considered good enough for calling Riichi. Default: 5

//MISC
var LOG_AMOUNT = 3; //Amount of Messages to log for Tile Priorities
var DEBUG_BUTTON = false; //Display a Debug Button in the GUI
var LOW_SPEC_MODE = false; //Decrease calculation time

var USE_EMOJI = true; //use EMOJI to show tile


//### GLOBAL VARIABLES DO NOT CHANGE ###
var run = false; //Is the bot running

const AIMODE = { //ENUM of AI mode
	AUTO: 0,
	HELP: 1,
}
const AIMODE_NAME = [ //Name of AI mode
	"Auto",
	"Help",
]

const STRATEGIES = { //ENUM of strategies
	GENERAL: 'General',
	CHIITOITSU: 'Chiitoitsu',
	FOLD: 'Fold',
	THIRTEEN_ORPHANS: 'Thirteen_Orphans'
}
var strategy = STRATEGIES.GENERAL; //Current strategy
var strategyAllowsCalls = true; //Does the current strategy allow calls?
var isClosed = true; //Is own hand closed?
var dora = []; //Array of Tiles (index, type, dora)
var ownHand = []; //index, type, dora
var discards = []; //Later: Change to array for each player
var calls = []; //Calls/Melds of each player
var availableTiles = []; //Tiles that are available
var seatWind = 1; //1: East,... 4: North
var roundWind = 1; //1: East,... 4: North
var tilesLeft = 0; //tileCounter
var visibleTiles = []; //Tiles that are visible
var errorCounter = 0; //Counter to check if bot is working
var lastTilesLeft = 0; //Counter to check if bot is working
var isConsideringCall = false;
var riichiTiles = [null, null, null, null]; // Track players discarded tiles on riichi
var functionsExtended = false;
var showingStrategy = false; //Current in own turn?
var playerDiscardSafetyList = [[], [], [], []];
var totalPossibleWaits = {};

//crt choosed tile info variables
var viewInjected = false;
var crtSelectTile = null;
var handTilesdValue = [];

// Display
var tileEmojiList = [
	["red🀝" ,"🀙" ,"🀚" ,"🀛" ,"🀜" ,"🀝" ,"🀞" ,"🀟" ,"🀠" ,"🀡"],
	["red🀋" ,"🀇" ,"🀈" ,"🀉" ,"🀊" ,"🀋" ,"🀌" ,"🀍" ,"🀎" ,"🀏"],
	["red🀔" ,"🀐" ,"🀑" ,"🀒" ,"🀓" ,"🀔" ,"🀕" ,"🀖" ,"🀗" ,"🀘"],
	["", "🀀" ,"🀁" ,"🀂" ,"🀃" ,"🀆" ,"🀅" ,"🀄"]];

//LOCAL STORAGE
var AUTORUN = window.localStorage.getItem("alphajongAutorun") == "true";
var ROOM = window.localStorage.getItem("alphajongRoom");
ROOM = ROOM == null ? 2 : ROOM

var MODE = window.localStorage.getItem("alphajongAIMode")
MODE = MODE == null ? AIMODE.AUTO : parseInt(MODE);

//################################
// GUI
// Adds elements like buttons to control the bot
//################################

var guiDiv = document.createElement("div");
var guiSpan = document.createElement("span");
var startButton = document.createElement("button");
var autorunCheckbox = document.createElement("input");
var aimodeCombobox = document.createElement("select");
var roomCombobox = document.createElement("select");
var currentActionOutput = document.createElement("input");
var currentChoosedTileInfo = document.createElement("textarea");
var debugButton = document.createElement("button");
var hideButton = document.createElement("button");

function initGui() {
	if (getRooms() == null) { // Wait for minimal loading to be done
		setTimeout(initGui, 1000);
		return;
	}

	guiDiv.style.position = "absolute";
	guiDiv.style.zIndex = "100001"; //On top of the game
	guiDiv.style.left = "0px";
	guiDiv.style.top = "0px";
	guiDiv.style.width = "100%";
	guiDiv.style.textAlign = "center";
	guiDiv.style.fontSize = "20px";

	guiSpan.style.backgroundColor = "rgba(255,255,255,0.5)";
	guiSpan.style.padding = "5px";

	startButton.innerHTML = "Start Bot";
	if (window.localStorage.getItem("alphajongAutorun") == "true") {
		startButton.innerHTML = "Stop Bot";
	}
	startButton.style.marginRight = "15px";
	startButton.onclick = function () {
		toggleRun();
	};
	guiSpan.appendChild(startButton);

	autorunCheckbox.type = "checkbox";
	autorunCheckbox.id = "autorun";
	autorunCheckbox.onclick = function () {
		autorunCheckboxClick();
	};
	if (window.localStorage.getItem("alphajongAutorun") == "true") {
		autorunCheckbox.checked = true;
	}
	guiSpan.appendChild(autorunCheckbox);
	var checkboxLabel = document.createElement("label");
	checkboxLabel.htmlFor = "autorun";
	checkboxLabel.appendChild(document.createTextNode('Autostart'));
	checkboxLabel.style.marginRight = "15px";
	guiSpan.appendChild(checkboxLabel);

	refreshAIMode();
	aimodeCombobox.style.marginRight = "15px";
	aimodeCombobox.onchange = function() {
		aiModeChange();
	};
	guiSpan.appendChild(aimodeCombobox);

	refreshRoomSelection();

	roomCombobox.style.marginRight = "15px";
	roomCombobox.onchange = function () {
		roomChange();
	};

	if (window.localStorage.getItem("alphajongAutorun") != "true") {
		roomCombobox.disabled = true;
	}
	guiSpan.appendChild(roomCombobox);

	currentActionOutput.readOnly = "true";
	currentActionOutput.size = "20";
	currentActionOutput.style.marginRight = "15px";
	showCrtActionMsg("Bot is not running.");
	if (window.localStorage.getItem("alphajongAutorun") == "true") {
		showCrtActionMsg("Bot started.");
	}
	guiSpan.appendChild(currentActionOutput);

	currentChoosedTileInfo.readOnly = "true";
	currentActionOutput.size = "15";
	currentChoosedTileInfo.cols = 20;
	currentChoosedTileInfo.rows = 10;
	currentChoosedTileInfo.style.marginRight = "15px";
	guiSpan.appendChild(currentChoosedTileInfo);

	debugButton.innerHTML = "Debug";
	debugButton.onclick = function () {
		showDebugString();
	};
	if (DEBUG_BUTTON) {
		guiSpan.appendChild(debugButton);
	}

	hideButton.innerHTML = "Hide GUI";
	hideButton.onclick = function () {
		toggleGui();
	};
	guiSpan.appendChild(hideButton);

	guiDiv.appendChild(guiSpan);
	document.body.appendChild(guiDiv);
	toggleGui();
}

function toggleGui() {
	if (guiDiv.style.display == "block") {
		guiDiv.style.display = "none";
	}
	else {
		guiDiv.style.display = "block";
	}
}

function showDebugString() {
	alert("If you notice a bug while playing please go to the correct turn in the replay (before the bad discard), press this button, copy the Debug String from the textbox and include it in your issue on github.");
	if (isInGame()) {
		setData();
		showCrtActionMsg(getDebugString());
	}
}

function aiModeChange() {
	window.localStorage.setItem("alphajongAIMode", aimodeCombobox.value);
	MODE = parseInt(aimodeCombobox.value);

	setAutoCallWin(MODE === AIMODE.AUTO);
}

function roomChange() {
	window.localStorage.setItem("alphajongRoom", roomCombobox.value);
	ROOM = roomCombobox.value;
}

function hideButtonClick() {
	guiDiv.style.display = "none";
}

function autorunCheckboxClick() {
	if (autorunCheckbox.checked) {
		roomCombobox.disabled = false;
		window.localStorage.setItem("alphajongAutorun", "true");
		AUTORUN = true;
	}
	else {
		roomCombobox.disabled = true;
		window.localStorage.setItem("alphajongAutorun", "false");
		AUTORUN = false;
	}
}

// Refresh the AI mode
function refreshAIMode() {
	aimodeCombobox.innerHTML = AIMODE_NAME[MODE];
	for (let i = 0; i < AIMODE_NAME.length; i++) {
		var option = document.createElement("option");
		option.text = AIMODE_NAME[i];
		option.value = i;
		aimodeCombobox.appendChild(option);
	}
	aimodeCombobox.value = MODE;
}

// Refresh the contents of the Room Selection Combobox with values appropiate for the rank
function refreshRoomSelection() {
	roomCombobox.innerHTML = ""; // Clear old entries
	getRooms().forEach(function (room) {
		if (isInRank(room.id) && room.mode != 0) { // Rooms with mode = 0 are 1 Game only, not sure why they are in the code but not selectable in the UI...
			var option = document.createElement("option");
			option.text = getRoomName(room);
			option.value = room.id;
			roomCombobox.appendChild(option);
		}
	});
	roomCombobox.value = ROOM;
}

// Show msg to currentActionOutput
function showCrtActionMsg(msg) {
	if (!showingStrategy) {
		currentActionOutput.value =  msg;
	}
}

// Apend msg to currentActionOutput
function showCrtStrategyMsg(msg) {
	showingStrategy = true;
	currentActionOutput.value = msg;
}

function clearCrtStrategyMsg() {
	showingStrategy = false;
	currentActionOutput.value = "";
}

function showCrtChoosedTileInfo(msg) {
	currentChoosedTileInfo.value = msg;
}
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
	return GameMgr.Inst.login_loading_end || isInGame();
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
	if (!isInGame())
		return;

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
		let tileName = getTileEmojiByName(tile);
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

function getNumberOfTilesInHand(player) {
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
	return typeof view.DesktopMgr.Inst.players[player].hand != 'undefined' && view.DesktopMgr.Inst.players[player].hand != null;
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
		return roomData.room == 100 || roomData.level_limit > 0; // Display the Casual Rooms and all ranked rooms (no special rooms)
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

// Client language: ["chs", "chs_t", "en", "jp"]
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
	trackDiscardTiles();
	functionsExtended = true;
}

// Track which tiles the players discarded (for push/fold judgement and tracking the riichi tile)
function trackDiscardTiles() {
	for (var i = 1; i < getNumberOfPlayers(); i++) {
		var player = getCorrectPlayerNumber(i);
		view.DesktopMgr.Inst.players[player].container_qipai.AddQiPai = (function (_super) { // Extend the MJ-Soul Discard function
			return function () {
				if (arguments[1]) { // Contains true when Riichi
					riichiTiles[seat2LocalPosition(this.player.seat)] = arguments[0]; // Track tile in riichiTiles Variable
				}
				setData(false);
				visibleTiles.push(arguments[0]);
				var danger = getTileDanger(arguments[0], null, seat2LocalPosition(this.player.seat));
				if (arguments[2] && danger < 20) { // Ignore Tsumogiri of a safetile
					danger = -1;
				}
				playerDiscardSafetyList[seat2LocalPosition(this.player.seat)].push(danger);
				return _super.apply(this, arguments); // Call original function
			};
		})(view.DesktopMgr.Inst.players[player].container_qipai.AddQiPai);
	}
}
//################################
// UTILS
// Contains utility functions
//################################

//Return the number of players in the game (3 or 4)
function getNumberOfPlayers() {
	if (!doesPlayerExist(1) || !doesPlayerExist(2) || !doesPlayerExist(3)) {
		return 3;
	}
	return 4;
}

//Correct the player numbers
//Only necessary for 3 player games
function getCorrectPlayerNumber(player) {
	if (getNumberOfPlayers() == 4) {
		return player;
	}
	if (!doesPlayerExist(1)) {
		if (player > 0) {
			return player + 1;
		}
	}
	if (!doesPlayerExist(2)) {
		if (player > 1) {
			return player + 1;
		}
	}
	return player;
}

function isSameTile(tile1, tile2) {
	if (typeof tile1 == 'undefined' || typeof tile2 == 'undefined') {
		return false;
	}
	return tile1.index == tile2.index && tile1.type == tile2.type;
}

//Return number of doras in tiles
function getNumberOfDoras(tiles) {
	var dr = 0;
	for (let tile of tiles) {
		dr += tile.doraValue;
	}
	return dr;
}

//Pairs in tiles
function getPairs(tiles) {
	var sortedTiles = sortTiles(tiles);

	var pairs = [];
	var oldIndex = 0;
	var oldType = 0;
	sortedTiles.forEach(function (tile) {
		if (oldIndex != tile.index || oldType != tile.type) {
			var ts = getTilesInTileArray(sortedTiles, tile.index, tile.type);
			if ((ts.length >= 2)) {
				pairs.push({ tile1: ts[0], tile2: ts[1] }); //Grabs highest dora tiles first
			}
			oldIndex = tile.index;
			oldType = tile.type;
		}
	});
	return pairs;
}

//Pairs in tiles as array
function getPairsAsArray(tiles) {
	var pairs = getPairs(tiles);
	var pairList = [];
	pairs.forEach(function (pair) {
		pairList.push(pair.tile1);
		pairList.push(pair.tile2);
	});
	return pairList;
}

//Return doubles in tiles
function getDoubles(tiles) {
	var doubles = [];
	tiles.forEach(function (tile) {
		if (isDouble(tiles, tile)) {
			doubles.push(tile);
		}
	});
	return doubles;
}


//Tile twice or 2 sequence or "bridge". Might even be triple
function isDouble(tiles, tile) {
	var tileNumber = getNumberOfTilesInTileArray(tiles, tile.index, tile.type);
	if (tile.type == 3) {
		return tileNumber == 2;
	}
	return ((tileNumber == 2) ||
		(((getNumberOfTilesInTileArray(tiles, tile.index - 1, tile.type) >= 1) ||
			(getNumberOfTilesInTileArray(tiles, tile.index + 1, tile.type) >= 1) ||
			(getNumberOfTilesInTileArray(tiles, tile.index - 2, tile.type) >= 1) ||
			(getNumberOfTilesInTileArray(tiles, tile.index + 2, tile.type) >= 1)) && tileNumber >= 1));
}

//Return all triplets/3-sequences and pairs as a tile array
function getTriplesAndPairs(tiles) {
	var sequences = getSequences(tiles);
	var triplets = getTriplets(tiles);
	var pairs = getPairs(tiles);
	return getBestCombinationOfTiles(tiles, sequences.concat(triplets).concat(pairs), { triples: [], pairs: [] });
}

//Return all triplets/3-tile-sequences as a tile array
function getTriples(tiles) {
	var sequences = getSequences(tiles);
	var triplets = getTriplets(tiles);
	return getBestCombinationOfTiles(tiles, sequences.concat(triplets), { triples: [], pairs: [] }).triples;
}

//Return all triplets in tile array
function getTriplets(tiles) {
	var sortedTiles = sortTiles(tiles);

	var triples = [];
	var oldIndex = 0;
	var oldType = 0;
	sortedTiles.forEach(function (tile) {
		if (oldIndex != tile.index || oldType != tile.type) {
			var ts = getTilesInTileArray(sortedTiles, tile.index, tile.type);
			if ((ts.length >= 3)) {
				triples.push({ tile1: ts[0], tile2: ts[1], tile3: ts[2] }); //Grabs highest dora tiles first because of sorting
			}
			oldIndex = tile.index;
			oldType = tile.type;
		}
	});
	return triples;
}

//Triplets in tiles as array
function getTripletsAsArray(tiles) {
	var triplets = getTriplets(tiles);
	var tripletsList = [];
	triplets.forEach(function (triplet) {
		tripletsList.push(triplet.tile1);
		tripletsList.push(triplet.tile2);
		tripletsList.push(triplet.tile3);
	});
	return tripletsList;
}

//Returns the best combination of sequences. 
//Small Bug: Can return red dora tiles multiple times, but doesn't matter for the current use cases
function getBestSequenceCombination(inputHand) {
	return getBestCombinationOfTiles(inputHand, getSequences(inputHand), { triples: [], pairs: [] }).triples;
}

//Check if there is already a red dora tile in the tiles array.
//More or less a workaround for a problem with the getBestCombinationOfTiles function...
function pushTileAndCheckDora(tiles, arrayToPush, tile) {
	if (tile.dora && tiles.some(t => t.type == tile.type && t.dora)) {
		var nonDoraTile = { ...tile };
		nonDoraTile.dora = false;
		nonDoraTile.doraValue = getTileDoraValue(nonDoraTile);
		arrayToPush.push(nonDoraTile);
		return nonDoraTile;
	}
	arrayToPush.push(tile);
	return tile;
}

//Return the best combination of 3-tile Sequences, Triplets and pairs in array of tiles
//Recursive Function, weird code that can probably be optimized
function getBestCombinationOfTiles(inputTiles, possibleCombinations, chosenCombinations) {
	var originalC = { triples: [...chosenCombinations.triples], pairs: [...chosenCombinations.pairs] };
	for (var i = 0; i < possibleCombinations.length; i++) {
		var cs = { triples: [...originalC.triples], pairs: [...originalC.pairs] };
		var tiles = possibleCombinations[i];
		var hand = [...inputTiles];
		if (!("tile3" in tiles)) { // Pairs
			if (tiles.tile1.index == tiles.tile2.index && getNumberOfTilesInTileArray(hand, tiles.tile1.index, tiles.tile1.type) < 2) {
				continue;
			}
		}
		else if (getNumberOfTilesInTileArray(hand, tiles.tile1.index, tiles.tile1.type) == 0 ||
			getNumberOfTilesInTileArray(hand, tiles.tile2.index, tiles.tile2.type) == 0 ||
			getNumberOfTilesInTileArray(hand, tiles.tile3.index, tiles.tile3.type) == 0 ||
			(tiles.tile1.index == tiles.tile2.index && getNumberOfTilesInTileArray(hand, tiles.tile1.index, tiles.tile1.type) < 3)) {
			continue;
		}
		if ("tile3" in tiles) {
			var tt = pushTileAndCheckDora(cs.pairs.concat(cs.triples), cs.triples, tiles.tile1);
			hand = removeTilesFromTileArray(hand, [tt]);
			tt = pushTileAndCheckDora(cs.pairs.concat(cs.triples), cs.triples, tiles.tile2);
			hand = removeTilesFromTileArray(hand, [tt]);
			tt = pushTileAndCheckDora(cs.pairs.concat(cs.triples), cs.triples, tiles.tile3);
			hand = removeTilesFromTileArray(hand, [tt]);
		}
		else {
			var tt = pushTileAndCheckDora(cs.pairs.concat(cs.triples), cs.pairs, tiles.tile1);
			hand = removeTilesFromTileArray(hand, [tt]);
			tt = pushTileAndCheckDora(cs.pairs.concat(cs.triples), cs.pairs, tiles.tile2);
			hand = removeTilesFromTileArray(hand, [tt]);
		}
		var anotherChoice = getBestCombinationOfTiles(hand, possibleCombinations.slice(i + 1), cs);
		if (anotherChoice.triples.length > chosenCombinations.triples.length ||
			(anotherChoice.triples.length == chosenCombinations.triples.length &&
				anotherChoice.pairs.length > chosenCombinations.pairs.length) ||
			(anotherChoice.triples.length == chosenCombinations.triples.length &&
				anotherChoice.pairs.length == chosenCombinations.pairs.length &&
				getNumberOfDoras(anotherChoice.triples.concat(anotherChoice.pairs)) > getNumberOfDoras(chosenCombinations.triples.concat(chosenCombinations.pairs)))) {
			chosenCombinations = anotherChoice;
		}
	}

	return chosenCombinations;
}

//Return all 3-tile Sequences in tile array
function getSequences(tiles) {
	var sortedTiles = sortTiles(tiles);
	var sequences = [];
	for (var index = 0; index <= 7; index++) {
		for (var type = 0; type <= 2; type++) {
			var tiles1 = getTilesInTileArray(sortedTiles, index, type);
			var tiles2 = getTilesInTileArray(sortedTiles, index + 1, type);
			var tiles3 = getTilesInTileArray(sortedTiles, index + 2, type);

			var i = 0;
			while (tiles1.length > i && tiles2.length > i && tiles3.length > i) {
				sequences.push({ tile1: tiles1[i], tile2: tiles2[i], tile3: tiles3[i] });
				i++;
			}
		}
	}
	return sequences;
}

//Return tile array without given tiles
function removeTilesFromTileArray(inputTiles, tiles) {
	var tileArray = [...inputTiles];

	for (let tile of tiles) {
		for (var j = 0; j < tileArray.length; j++) {
			if (tile.index == tileArray[j].index && tile.type == tileArray[j].type && tile.dora == tileArray[j].dora) {
				tileArray.splice(j, 1);
				break;
			}
		}
	}

	return tileArray;
}

//Sort tiles
function sortTiles(inputTiles) {
	var tiles = [...inputTiles];
	tiles = tiles.sort(function (p1, p2) { //Sort dora value descending
		return p2.doraValue - p1.doraValue;
	});
	tiles = tiles.sort(function (p1, p2) { //Sort index ascending
		return p1.index - p2.index;
	});
	tiles = tiles.sort(function (p1, p2) { //Sort type ascending
		return p1.type - p2.type;
	});
	return tiles;
}

//Return number of specific tiles available
function getNumberOfTilesAvailable(index, type) {
	if (index < 1 || index > 9 || type < 0 || type > 3 || (type == 3 && index > 7)) {
		return 0;
	}
	if (getNumberOfPlayers() == 3 && (index > 1 && index < 9 && type == 1)) {
		return 0;
	}

	return 4 - visibleTiles.filter(tile => tile.index == index && tile.type == type).length;
}

//Return if a tile is furiten
function isTileFuriten(index, type) {
	for (var i = 1; i < getNumberOfPlayers(); i++) { //Check if melds from other player contain discarded tiles of player 0
		if (calls[i].some(tile => tile.index == index && tile.type == type && tile.from == localPosition2Seat(0))) {
			return true;
		}
	}
	return discards[0].some(tile => tile.index == index && tile.type == type);
}

//Return number of specific non furiten tiles available
function getNumberOfNonFuritenTilesAvailable(index, type) {
	if (isTileFuriten(index, type)) {
		return 0;
	}
	return getNumberOfTilesAvailable(index, type);
}

//Return number of specific tile in tile array
function getNumberOfTilesInTileArray(tileArray, index, type) {
	return getTilesInTileArray(tileArray, index, type).length;
}

//Return specific tiles in tile array
function getTilesInTileArray(tileArray, index, type) {
	return tileArray.filter(tile => tile.index == index && tile.type == type);
}

//Update the available tile pool
function updateAvailableTiles() {
	visibleTiles = dora.concat(ownHand, discards[0], discards[1], discards[2], discards[3], calls[0], calls[1], calls[2], calls[3]);
	visibleTiles = visibleTiles.filter(tile => typeof tile != 'undefined');
	availableTiles = [];
	for (var i = 0; i <= 3; i++) {
		for (var j = 1; j <= 9; j++) {
			if (i == 3 && j == 8) {
				break;
			}
			for (var k = 1; k <= getNumberOfTilesAvailable(j, i); k++) {
				var isRed = (j == 5 && i != 3 && visibleTiles.concat(availableTiles).filter(tile => tile.type == i && tile.dora).length == 0) ? true : false;
				availableTiles.push({
					index: j,
					type: i,
					dora: isRed,
					doraValue: getTileDoraValue({ index: j, type: i, dora: isRed })
				});
			}
		}
	}
	for (let vis of visibleTiles) {
		vis.doraValue = getTileDoraValue(vis);
	}
}

//Return sum of red dora/dora indicators for tile
function getTileDoraValue(tile) {
	var dr = 0;

	if (getNumberOfPlayers() == 3) {
		if (tile.type == 3 && tile.index == 4) { //North Tiles
			dr = 1;
		}
	}

	for (let d of dora) {
		if (d.type == tile.type && getHigherTileIndex(d) == tile.index) {
			dr++;
		}
	}

	if (tile.dora) {
		return dr + 1;
	}
	return dr;
}

//Helper function for dora indicators
function getHigherTileIndex(tile) {
	if (tile.type == 3) {
		if (tile.index == 4) {
			return 1;
		}
		return tile.index == 7 ? 5 : tile.index + 1;
	}
	if (getNumberOfPlayers() == 3 && tile.index == 1 && tile.type == 1) {
		return 9; // 3 player mode: 1 man indicator means 9 man is dora
	}
	return tile.index == 9 ? 1 : tile.index + 1;
}

//Returns true if DEBUG flag is set
function isDebug() {
	return typeof DEBUG != 'undefined';
}

//Adds calls of player 0 to the hand
function getHandWithCalls(inputHand) {
	return inputHand.concat(calls[0]);
}

//Adds a tile if not in array
function pushTileIfNotExists(tiles, index, type) {
	if (tiles.findIndex(t => t.index == index && t.type == type) === -1) {
		var tile = { index: index, type: type, dora: false };
		tile.doraValue = getTileDoraValue(tile);
		tiles.push(tile);
	}
}

//Returns true if player can call riichi
function canRiichi() {
	if (isDebug()) {
		return false;
	}
	var operations = getOperationList();
	for (let op of operations) {
		if (op.type == getOperations().liqi) {
			return true;
		}
	}
	return false;
}

function getUradoraChance() {
	if (getNumberOfPlayers() == 4) {
		return dora.length * 0.4;
	}
	else {
		return dora.length * 0.5;
	}
}

//Returns tiles that can form a triple in one turn for a given tile array
function getUsefulTilesForTriple(tileArray) {
	var tiles = [];
	for (let tile of tileArray) {
		var amount = getNumberOfTilesInTileArray(tileArray, tile.index, tile.type);
		if (tile.type == 3 && amount >= 2) {
			pushTileIfNotExists(tiles, tile.index, tile.type);
			continue;
		}

		if (amount >= 2) {
			pushTileIfNotExists(tiles, tile.index, tile.type);
		}

		var amountLower = getNumberOfTilesInTileArray(tileArray, tile.index - 1, tile.type);
		var amountLower2 = getNumberOfTilesInTileArray(tileArray, tile.index - 2, tile.type);
		var amountUpper = getNumberOfTilesInTileArray(tileArray, tile.index + 1, tile.type);
		var amountUpper2 = getNumberOfTilesInTileArray(tileArray, tile.index + 2, tile.type);
		if (tile.index > 1 && (amount == amountLower + 1 && (amountUpper > 0 || amountLower2 > 0))) { //No need to check if index in bounds
			pushTileIfNotExists(tiles, tile.index - 1, tile.type);
		}

		if (tile.index < 9 && (amount == amountUpper + 1 && (amountLower > 0 || amountUpper2 > 0))) {
			pushTileIfNotExists(tiles, tile.index + 1, tile.type);
		}
	}
	return tiles;
}

//Returns tiles that can form at least a double in one turn for a given tile array
function getUsefulTilesForDouble(tileArray) {
	var tiles = [];
	for (let tile of tileArray) {
		pushTileIfNotExists(tiles, tile.index, tile.type);
		if (tile.type == 3) {
			continue;
		}

		var amountLower = getNumberOfTilesInTileArray(tileArray, tile.index - 1, tile.type);
		var amountUpper = getNumberOfTilesInTileArray(tileArray, tile.index + 1, tile.type);
		if (amountLower == 0 && tile.index - 1 >= 1) {
			pushTileIfNotExists(tiles, tile.index - 1, tile.type);
		}

		if (amountUpper == 0 && tile.index + 1 <= 9) {
			pushTileIfNotExists(tiles, tile.index + 1, tile.type);
		}
	}
	return tiles;
}

// Returns Tile[], where all are terminal/honors.
function getAllTerminalHonorFromHand(hand) {
	return hand.filter(tile => isTerminalOrHonor(tile));
}

//Honor tile or index 1/9
function isTerminalOrHonor(tile) {
	// Honor tiles
	if (tile.type == 3) {
		return true;
	}

	// 1 or 9.
	if (tile.index == 1 || tile.index == 9) {
		return true;
	}

	return false;
}

// Returns a number how "good" the wait is. An average wait is 1, a bad wait (like a middle tile) is lower, a good wait (like an honor tile) is higher.
function getWaitQuality(tile) {
	return (3 - (getWaitScoreForTileAndPlayer(0, tile, false) / 90)) / 2;
}

//Calculate the shanten number. Based on this: https://www.youtube.com/watch?v=69Xhu-OzwHM
//Fast and accurate, but original hand needs to have 14 or more tiles.
function calculateShanten(triples, pairs, doubles) {
	if ((triples * 3) + (pairs * 2) + (doubles * 2) > 14) {
		doubles = (13 - ((triples * 3) + (pairs * 2))) / 2;
	}
	var shanten = 8 - (2 * triples) - (pairs + doubles);
	if (triples + pairs + doubles >= 5 && pairs == 0) {
		shanten++;
	}
	if (triples + pairs + doubles >= 6) {
		shanten += triples + pairs + doubles - 5;
	}
	if (shanten < 0) {
		return 0;
	}
	return shanten;
}

// Calculate Score for given han and fu. For higher han values the score is "fluid" to better account for situations where the exact han value is unknown
// (like when an opponent has around 5.5 han => 10k)
function calculateScore(player, han, fu = 30) {
	var score = (fu * Math.pow(2, 2 + han) * 4);

	if (han > 4) {
		score = 8000;
	}

	if (han > 5) {
		score = 8000 + ((han - 5) * 4000);
	}
	if (han > 6) {
		score = 12000 + ((han - 6) * 2000);
	}
	if (han > 8) {
		score = 16000 + ((han - 8) * 2666);
	}
	if (han > 11) {
		score = 24000 + ((han - 11) * 4000);
	}
	if (han >= 13) {
		score = 32000;
	}

	if (getSeatWind(player) == 1) { //Is Dealer
		score *= 1.5;
	}

	return score;
}

//Calculate the Fu Value for given parameters. Not 100% accurate, but good enough
function calculateFu(triples, openTiles, pair, waitTiles, winningTile, ron = true) {
	var fu = 20;

	var sequences = getSequences(triples);
	var closedTriplets = getTriplets(triples);
	var openTriplets = getTriplets(openTiles);

	var kans = removeTilesFromTileArray(openTiles, getTriples(openTiles));

	closedTriplets.forEach(function (t) {
		if (isTerminalOrHonor(t.tile1)) {
			if (!isSameTile(t.tile1, winningTile)) {
				fu += 8;
			}
			else { //Ron on that tile: counts as open
				fu += 4;
			}
		}
		else {
			if (!isSameTile(t.tile1, winningTile)) {
				fu += 4;
			}
			else { //Ron on that tile: counts as open
				fu += 2;
			}
		}
	});

	openTriplets.forEach(function (t) {
		if (isTerminalOrHonor(t.tile1)) {
			fu += 4;
		}
		else {
			fu += 2;
		}
	});

	//Kans: Add to existing fu of pon
	kans.forEach(function (tile) {
		if (openTiles.filter(t => isSameTile(t, tile) && t.from != localPosition2Seat(0)).length > 0) { //Is open
			if (isTerminalOrHonor(tile)) {
				fu += 12;
			}
			else {
				fu += 6;
			}
		}
		else { //Closed Kans
			if (isTerminalOrHonor(tile)) {
				fu += 28;
			}
			else {
				fu += 14;
			}
		}
	});


	if (typeof pair[0] != 'undefined' && isValueTile(pair[0])) {
		fu += 2;
		if (pair[0].index == seatWind && seatWind == roundWind) {
			fu += 2;
		}
	}

	if (fu == 20 && (sequences.findIndex(function (t) { //Is there a way to interpret the wait as ryanmen when at 20 fu? -> dont add fu
		return (isSameTile(t.tile1, winningTile) && t.tile3.index < 9) || (isSameTile(t.tile3, winningTile) && t.tile1.index > 1);
	}) >= 0)) {
		fu += 0;
	} //if we are at more than 20 fu: check if the wait can be interpreted in other ways to add more fu
	else if ((waitTiles.length != 2 || waitTiles[0].type != waitTiles[1].type || Math.abs(waitTiles[0].index - waitTiles[1].index) != 1)) {
		if (closedTriplets.findIndex(function (t) { return isSameTile(t.tile1, winningTile); }) < 0) { // 0 fu for shanpon
			fu += 2;
		}
	}

	if (ron && isClosed) {
		fu += 10;
	}

	return Math.ceil(fu / 10) * 10;
}

//Is the tile a dragon or valuable wind?
function isValueTile(tile) {
	return tile.type == 3 && (tile.index > 4 || tile.index == seatWind || tile.index == roundWind);
}

//Return a danger value which is the threshold for folding (danger higher than this value -> fold)
function getFoldThreshold(tilePrio, hand) {
	var dealInValues;
	if (getNumberOfPlayers() == 4) {
		dealInValues = getExpectedDealInValue(1) + getExpectedDealInValue(2) + getExpectedDealInValue(3);
	}
	else {
		dealInValues = getExpectedDealInValue(1) + getExpectedDealInValue(2);
	}

	var handScore = tilePrio.score.open;
	if (isClosed) {
		handScore = tilePrio.score.riichi;
	}

	var waits = tilePrio.waits;

	// Formulas are based on this table: https://docs.google.com/spreadsheets/d/172LFySNLUtboZUiDguf8I3QpmFT-TApUfjOs5iRy3os/edit#gid=212618921
	// TODO: Maybe switch to this: https://riichi-mahjong.com/2020/01/28/mahjong-strategy-push-or-fold-4-maximizing-game-ev/
	if (tilePrio.shanten == 0) {
		var foldValue = waits * handScore / 40;
	}
	else if (tilePrio.shanten == 1) {
		var foldValue = waits * handScore / 30;
	}
	else {
		if (dealInValues > 5000) {
			return 0;
		}
		var foldValue = (((6 - (tilePrio.shanten - tilePrio.efficiency)) * 2000) + handScore) / 200;
	}

	if (isLastGame()) { //Fold earlier when first/later when last in last game
		if (getDistanceToLast() > 0) {
			foldValue *= 1.3; //Last Place -> Later Fold
		}
		else if (getDistanceToFirst() < 0) {
			var dist = (getDistanceToFirst() / 30000) > -0.5 ? getDistanceToFirst() / 30000 : -0.5;
			foldValue *= 1 + dist; //First Place -> Easier Fold
		}
	}

	foldValue *= 1 + (((35 - tilesLeft) / (35 * 5)) * (waits / 4)); // up to 20% more/less fold when early/lategame.

	foldValue *= seatWind == 1 ? 1.1 : 1; //Push more as dealer (it's already in the handScore, but because of Tsumo Malus pushing is even better)

	var safeTiles = 0;
	for (let tile of hand) { // How many safe tiles do we currently have?
		if (getTileDanger(tile) < 20) {
			safeTiles++;
		}
		if (safeTiles == 2) {
			break;
		}
	}
	foldValue *= 1 + (0.4 - (safeTiles / 5)); // 20% less likely to fold when only 1 safetile, or 40% when 0 safetiles

	foldValue = foldValue < 0 ? 0 : foldValue;

	return Number(foldValue).toFixed(2);
}

//Return true if danger is too high in relation to the value of the hand
function shouldFold(tiles) {
	if (tiles[0].shanten > 0 && tiles[0].shanten * 4 >= tilesLeft) {
		log("Hand is too far from tenpai before end of game. Fold!");
		strategy = STRATEGIES.FOLD;
		strategyAllowsCalls = false;
		return true;
	}

	var foldThreshold = getFoldThreshold(tiles[0], ownHand);
	log("Would fold this hand above " + foldThreshold + " danger.");

	if (tiles[0].danger > foldThreshold) {
		log("Tile Danger " + Number(tiles[0].danger).toFixed(2) + " of " + getTileName(tiles[0].tile, false) + " is too dangerous.");
		strategyAllowsCalls = false; //Don't set the strategy to full fold, but prevent calls
		return true;
	}
	return false;
}

//Decide whether to call Riichi
//Based on: https://mahjong.guide/2018/01/28/mahjong-fundamentals-5-riichi/
function shouldRiichi(tilePrio) {
	var badWait = tilePrio.waits < WAITS_FOR_RIICHI;
	var lotsOfDoraIndicators = tilePrio.dora.length >= 3;

	//Thirteen Orphans
	if (strategy == STRATEGIES.THIRTEEN_ORPHANS) {
		log("Decline Riichi because of Thirteen Orphan strategy.");
		return false;
	}

	//Close to end of game
	if (tilesLeft <= RIICHI_TILES_LEFT) {
		log("Decline Riichi because close to end of game.");
		return false;
	}

	//No waits
	if (tilePrio.waits < 1) {
		log("Decline Riichi because of no waits.");
		return false;
	}

	// Last Place (in last game)? -> Yolo
	if (isLastGame() && getDistanceToLast() > 0) {
		log("Accept Riichi because of last place in last game.");
		return true;
	}

	// Already large lead of more than 10000 points
	if (isLastGame() && getDistanceToFirst() < -10000) {
		log("Decline Riichi because of huge lead in last game.");
		return false;
	}

	// Not Dealer & bad Wait & Riichi is only yaku
	if (seatWind != 1 && badWait && tilePrio.score.riichi < 2500 && !lotsOfDoraIndicators) {
		log("Decline Riichi because of worthless hand, bad waits and not dealer.");
		return false;
	}

	// High Danger and hand not worth much or bad wait
	if (getCurrentDangerLevel() > 5000 && (tilePrio.score.riichi < 3500 || badWait)) {
		log("Decline Riichi because of worthless hand and high danger.");
		return false;
	}

	// Hand already has high value and enough yaku
	if (tilePrio.yaku.closed >= 1 && tilePrio.score.riichi > 5000 + (tilePrio.waits * 500)) {
		log("Decline Riichi because of high value hand with enough yaku.");
		return false;
	}

	// Hand already has high value and no yaku
	if (tilePrio.yaku.closed < 1 && tilePrio.score.riichi > 4000) {
		log("Accept Riichi because of high value hand without yaku.");
		return true;
	}

	// Number of Kans(Dora Indicators) -> more are higher chance for uradora
	if (lotsOfDoraIndicators) {
		log("Accept Riichi because of multiple dora indicators.");
		return true;
	}

	// Don't Riichi when: Last round with bad waits & would lose place with -1000
	if (isLastGame() && badWait && ((getDistanceToPlayer(1) >= -1000 && getDistanceToPlayer(1) <= 0) ||
		(getDistanceToPlayer(2) >= -1000 && getDistanceToPlayer(2) <= 0) ||
		(getNumberOfPlayers() > 3 && getDistanceToPlayer(3) >= -1000 && getDistanceToPlayer(3) <= 0))) {
		log("Decline Riichi because distance to next player is < 1000 in last game.");
		return false;
	}

	// Default: Just do it.
	log("Accept Riichi by default.");
	return true;
}

//Negative number: Distance to second
//Positive number: Distance to first
function getDistanceToFirst() {
	if (getNumberOfPlayers() == 3) {
		return Math.max(getPlayerScore(1), getPlayerScore(2)) - getPlayerScore(0);
	}
	return Math.max(getPlayerScore(1), getPlayerScore(2), getPlayerScore(3)) - getPlayerScore(0);
}

//Negative number: Distance to last
//Positive number: Distance to third
function getDistanceToLast() {
	if (getNumberOfPlayers() == 3) {
		return Math.min(getPlayerScore(1), getPlayerScore(2)) - getPlayerScore(0);
	}
	return Math.min(getPlayerScore(1), getPlayerScore(2), getPlayerScore(3)) - getPlayerScore(0);
}

//Positive: Other player is in front of you
function getDistanceToPlayer(player) {
	if (getNumberOfPlayers() == 3 && player == 3) {
		return 0;
	}
	return getPlayerScore(player) - getPlayerScore(0);
}

//Check if "All Last"
function isLastGame() {
	if (isEastRound()) {
		return getRound() == 3 || getRoundWind() > 1; //East 4 or South X
	}
	return (getRound() == 2 && getRoundWind() > 1) || getRoundWind() > 2; //South 3 or West X
}

//Check if Hand is complete
function isWinningHand(numberOfTriples, numberOfPairs) {
	if (strategy == STRATEGIES.CHIITOITSU) {
		return numberOfPairs == 7;
	}
	return numberOfTriples == 4 && numberOfPairs == 1;
}

//Returns the binomialCoefficient for two numbers. Needed for chance to draw tile calculation. Fails if a faculty of > 134 is needed (should not be the case since there are 134 tiles)
function binomialCoefficient(a, b) {
	var numerator = facts[a];
	var denominator = facts[a - b] * facts[b];
	return numerator / denominator;
} 

function getCallNameByType(type) {
	switch (type) {
		case 1: return "discard";
		case 2: return "chi";
		case 3: return "pon";
		case 4: return "kan(ankan)";
		case 5: return "kan(daiminkan)";
		case 6: return "kan(shouminkan)";
		case 7: return "riichi";
		case 8: return "tsumo";
		case 9: return "ron";
		case 10: return "kyuushu kyuuhai";
		case 11: return "kita";
		default: return type;
	}
}

function getTileEmoji(tileType, tileIdx, dora) {
	if (dora) {
		tileIdx = 0;
	}
	return tileEmojiList[tileType][tileIdx];
}

//Get Emoji str by tile name
function getTileEmojiByName(name) {
	let tile = getTileFromString(name);
	return getTileEmoji(tile.type, tile.index, tile.dora);
}

//################################
// LOGGING
// Contains logging functions
//################################

//Print string to HTML or console
function log(t) {
	if (isDebug()) {
		document.body.innerHTML += t + "<br>";
	}
	else {
		console.log(t);
	}
}

//Print all tiles in hand
function printHand(hand) {
	var handString = getStringForTiles(hand);
	log("Hand:" + handString);
}

//Get String for array of tiles
function getStringForTiles(tiles, useRaw = true) {
	var tilesString = "";
	var oldType = "";
	tiles.forEach(function (tile) {
		if (useRaw || !USE_EMOJI) {
			if (getNameForType(tile.type) != oldType) {
				tilesString += oldType;
				oldType = getNameForType(tile.type);
			}
		}

		if (tile.dora == 1) {
			if (useRaw || !USE_EMOJI) {
				tilesString += "0";
			} else {
				tilesString += getTileName(tile, false);
			}
		}
		else {
			if (useRaw || !USE_EMOJI) {
				tilesString += tile.index;
			} else {
				tilesString += getTileName(tile, false);
			}
		}
	});
	if (useRaw || !USE_EMOJI) {
		tilesString += oldType;
	}
	return tilesString;
}

//Print tile name
function printTile(tile) {
	log(getTileName(tile, false));
}

function getTilePriorityString(tileItem) {
	return getTileName(tileItem.tile, false) +
			": Priority: <" + Number(tileItem.priority).toFixed(3) +
			"> Efficiency: <" + Number(tileItem.efficiency).toFixed(3) +
			"> Yaku Open: <" + Number(tileItem.yaku.open).toFixed(3) +
			"> Yaku Closed: <" + Number(tileItem.yaku.closed).toFixed(3) +
			"> Dora: <" + Number(tileItem.dora).toFixed(3) +
			"> Waits: <" + Number(tileItem.waits).toFixed(3) +
			"> Danger: <" + Number(tileItem.danger).toFixed(2) + ">";
}

//Print given tile priorities
function printTilePriority(tiles) {
	log("Overall: Value Open: <" + Number(tiles[0].score.open).toFixed(0) +
		"> Closed Value: <" + Number(tiles[0].score.closed).toFixed(0) +
		"> Riichi Value: <" + Number(tiles[0].score.riichi).toFixed(0) +
		"> Shanten: <" + Number(tiles[0].shanten).toFixed(0) + ">");
	for (var i = 0; i < tiles.length && i < LOG_AMOUNT; i++) {
		log(getTilePriorityString(tiles[i]));
	}
}

//Input string to get an array of tiles (e.g. "123m456p789s1z")
function getTilesFromString(inputString) {
	var numbers = [];
	var tiles = [];
	for (let input of inputString) {
		var type = 4;
		switch (input) {
			case "p":
				type = 0;
				break;
			case "m":
				type = 1;
				break;
			case "s":
				type = 2;
				break;
			case "z":
				type = 3;
				break;
			default:
				numbers.push(input);
				break;
		}
		if (type != "4") {
			for (let number of numbers) {
				if (parseInt(number) == 0) {
					tiles.push({ index: 5, type: type, dora: true, doraValue: 1 });
				}
				else {
					tiles.push({ index: parseInt(number), type: type, dora: false, doraValue: 0 });
				}
			}
			numbers = [];
		}
	}
	return tiles;
}

//Input string to get a tiles (e.g. "1m")
function getTileFromString(inputString) {
	var type = 4;
	var dr = false;
	switch (inputString[1]) {
		case "p":
			type = 0;
			break;
		case "m":
			type = 1;
			break;
		case "s":
			type = 2;
			break;
		case "z":
			type = 3;
			break;
	}
	if (inputString[0] == "0") {
		inputString[0] = 5;
		dr = true;
	}
	if (type != "4") {
		var tile = { index: parseInt(inputString[0]), type: type, dora: dr };
		tile.doraValue = getTileDoraValue(tile);
		return tile;
	}
	return null;
}

//Returns the name for a tile
function getTileName(tile, useRaw = true) {
	let name = "";
	if (tile.dora == true) {
		name =  "0" + getNameForType(tile.type);
	} else {
		name = tile.index + getNameForType(tile.type);
	}

	if (!useRaw && USE_EMOJI) {
		return getTileEmoji(tile.type, tile.index, tile.dora);
	} else {
		return name;
	}
}

//Returns the corresponding char for a type
function getNameForType(type) {
	switch (type) {
		case 0:
			return "p";
		case 1:
			return "m";
		case 2:
			return "s";
		case 3:
			return "z";
		default:
			return "?";
	}
}

//returns a string for the current state of the game
function getDebugString(useRaw = true) {
	var debugString = "";
	if (!useRaw) {
		debugString += "dora:";
	}
	debugString += getStringForTiles(dora, useRaw) + "|";
	if (!useRaw) {
		debugString += "hand:";
	}
	debugString += getStringForTiles(ownHand, useRaw) + "|";
	if (!useRaw) {
		debugString += "call[0]:";
	}
	debugString += getStringForTiles(calls[0], useRaw) + "|";
	if (!useRaw) {
		debugString += "call[1]:";
	}
	debugString += getStringForTiles(calls[1], useRaw) + "|";
	if (!useRaw) {
		debugString += "call[2]:";
	}
	debugString += getStringForTiles(calls[2], useRaw) + "|";
	if (getNumberOfPlayers() == 4) {
		if (!useRaw) {
			debugString += "call[3]:";
		}
		debugString += getStringForTiles(calls[3], useRaw) + "|";
	}
	if (!useRaw) {
		debugString += "discards[0]:";
	}
	debugString += getStringForTiles(discards[0], useRaw) + "|";
	if (!useRaw) {
		debugString += "discards[1]:";
	}
	debugString += getStringForTiles(discards[1], useRaw) + "|";
	if (!useRaw) {
		debugString += "discards[2]:";
	}
	debugString += getStringForTiles(discards[2], useRaw) + "|";
	if (getNumberOfPlayers() == 4) {
		if (!useRaw) {
			debugString += "discards[3]:";
		}
		debugString += getStringForTiles(discards[3], useRaw) + "|";
	}

	if (!useRaw) {
		debugString += "riichi:";
	}
	if (getNumberOfPlayers() == 4) {
		debugString += (isPlayerRiichi(0) * 1) + "," + (isPlayerRiichi(1) * 1) + "," + (isPlayerRiichi(2) * 1) + "," + (isPlayerRiichi(3) * 1) + "|";
	}
	else {
		debugString += (isPlayerRiichi(0) * 1) + "," + (isPlayerRiichi(1) * 1) + "," + (isPlayerRiichi(2) * 1) + "|";
	}

	if (!useRaw) {
		debugString += "seatWind:";
	}
	debugString += seatWind + "|";

	if (!useRaw) {
		debugString += "roundWind:";
	}
	debugString += roundWind + "|";

	if (!useRaw) {
		debugString += "tilesLeft:";
	}
	debugString += tilesLeft;
	return debugString;
}

//################################
// YAKU
// Contains the yaku calculations
//################################

//Returns the closed and open yaku value of the hand
function getYaku(inputHand, inputCalls, triplesAndPairs = null) {

	//Remove 4th tile from Kans, which could lead to false yaku calculation
	inputCalls = inputCalls.filter(tile => !tile.kan);

	var hand = inputHand.concat(inputCalls); //Add calls to hand

	var yakuOpen = 0;
	var yakuClosed = 0;


	// ### 1 Han ###

	if (triplesAndPairs == null) { //Can be set as a parameter to save calculation time if already precomputed
		triplesAndPairs = getTriplesAndPairs(hand);
	}
	else {
		triplesAndPairs.triples = triplesAndPairs.triples.concat(inputCalls);
	}
	var triplets = getTripletsAsArray(hand);
	var sequences = getBestSequenceCombination(inputHand).concat(getBestSequenceCombination(inputCalls));

	//Yakuhai
	//Wind/Dragon Triples
	//Open
	if (strategy != STRATEGIES.CHIITOITSU) {
		var yakuhai = getYakuhai(triplesAndPairs.triples);
		yakuOpen += yakuhai.open;
		yakuClosed += yakuhai.closed;
	}

	//Riichi (Bot has better results without additional value for Riichi)
	//Closed
	//var riichi = getRiichi(tenpai);
	//yakuOpen += riichi.open;
	//yakuClosed += riichi.closed;

	//Tanyao
	//Open
	var tanyao = getTanyao(hand, triplesAndPairs, inputCalls);
	yakuOpen += tanyao.open;
	yakuClosed += tanyao.closed;

	//Pinfu is applied in ai_offense when fu=30
	//There's no certain way to check for it here, so ignore it

	//Iipeikou (Identical Sequences in same type)
	//Closed
	if (strategy != STRATEGIES.CHIITOITSU) {
		var iipeikou = getIipeikou(sequences);
		yakuOpen += iipeikou.open;
		yakuClosed += iipeikou.closed;

		// ### 2 Han ###

		//Chiitoitsu
		//7 Pairs
		//Closed
		// -> Not necessary, because own strategy

		//Sanankou
		//3 concealed triplets
		//Open*
		var sanankou = getSanankou(inputHand);
		yakuOpen += sanankou.open;
		yakuClosed += sanankou.closed;

		//Sankantsu
		//3 Kans
		//Open
		//-> TODO: Should not influence score, but Kan calling.

		//Toitoi
		//All Triplets
		//Open
		var toitoi = getToitoi(triplets);
		yakuOpen += toitoi.open;
		yakuClosed += toitoi.closed;

		//Sanshoku Doukou
		//3 same index triplets in all 3 types
		//Open
		var sanshokuDouko = getSanshokuDouko(triplets);
		yakuOpen += sanshokuDouko.open;
		yakuClosed += sanshokuDouko.closed;

		//Sanshoku Doujun
		//3 same index straights in all types
		//Open/-1 Han after call
		var sanshoku = getSanshokuDoujun(sequences);
		yakuOpen += sanshoku.open;
		yakuClosed += sanshoku.closed;

		//Shousangen
		//Little 3 Dragons (2 Triplets + Pair)
		//Open
		var shousangen = getShousangen(hand);
		yakuOpen += shousangen.open;
		yakuClosed += shousangen.closed;
	}

	//Chanta
	//Half outside Hand (including terminals)
	//Open/-1 Han after call
	var chanta = getChanta(triplets, sequences, triplesAndPairs.pairs);
	yakuOpen += chanta.open;
	yakuClosed += chanta.closed;

	//Honrou
	//All Terminals and Honors (means: Also 4 triplets)
	//Open
	var honrou = getHonrou(triplets);
	yakuOpen += honrou.open;
	yakuClosed += honrou.closed;

	//Ittsuu
	//Pure Straight
	//Open/-1 Han after call
	var ittsuu = getIttsuu(sequences);
	yakuOpen += ittsuu.open;
	yakuClosed += ittsuu.closed;

	//3 Han

	//Ryanpeikou
	//2 times identical sequences (2 Iipeikou)
	//Closed

	//Junchan
	//All Terminals
	//Open/-1 Han after call
	var junchan = getJunchan(triplets, sequences, triplesAndPairs.pairs);
	yakuOpen += junchan.open;
	yakuClosed += junchan.closed;

	//Honitsu
	//Half Flush
	//Open/-1 Han after call
	var honitsu = getHonitsu(hand);
	yakuOpen += honitsu.open;
	yakuClosed += honitsu.closed;

	//6 Han

	//Chinitsu
	//Full Flush
	//Open/-1 Han after call
	var chinitsu = getChinitsu(hand);
	yakuOpen += chinitsu.open;
	yakuClosed += chinitsu.closed;

	//Yakuman

	//Daisangen
	//Big Three Dragons
	//Open
	var daisangen = getDaisangen(hand);
	yakuOpen += daisangen.open;
	yakuClosed += daisangen.closed;

	//Suuankou
	//4 Concealed Triplets
	//Closed

	//Tsuuiisou
	//All Honours
	//Open

	//Ryuuiisou
	//All Green
	//Open

	//Chinroutou
	//All Terminals
	//Open

	//Suushiihou
	//Four Little Winds
	//Open

	//Suukantsu
	//4 Kans
	//Open

	//Chuuren poutou
	//9 Gates
	//Closed

	//Kokushi musou
	//Thirteen Orphans
	//Closed

	//Double Yakuman

	//Suuankou tanki
	//4 Concealed Triplets Single Wait
	//Closed

	//Kokushi musou juusan menmachi
	//13 Wait Thirteen Orphans
	//Closed

	//Junsei chuuren poutou
	//True Nine Gates
	//Closed

	//Daisuushii
	//Four Big Winds
	//Open


	return { open: yakuOpen, closed: yakuClosed };
}

//Yakuhai
function getYakuhai(triples) {
	var yakuhai = 0;
	yakuhai = parseInt(triples.filter(tile => tile.type == 3 && (tile.index > 4 || tile.index == seatWind || tile.index == roundWind)).length / 3);
	yakuhai += parseInt(triples.filter(tile => tile.type == 3 && tile.index == seatWind && tile.index == roundWind).length / 3);
	return { open: yakuhai, closed: yakuhai };
}

//Riichi
function getRiichi(tenpai) {
	if (tenpai) {
		return { open: 0, closed: 1 };
	}
	return { open: 0, closed: 0 };
}

//Tanyao
function getTanyao(hand, triplesAndPairs, inputCalls) {
	if (hand.filter(tile => tile.type != 3 && tile.index > 1 && tile.index < 9).length >= 13 &&
		inputCalls.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length == 0 &&
		triplesAndPairs.pairs.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length == 0 &&
		triplesAndPairs.triples.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length == 0) {
		return { open: 1, closed: 1 };
	}
	return { open: 0, closed: 0 };
}

//Iipeikou
function getIipeikou(triples) {
	for (let triple of triples) {
		var tiles1 = getNumberOfTilesInTileArray(triples, triple.index, triple.type);
		var tiles2 = getNumberOfTilesInTileArray(triples, triple.index + 1, triple.type);
		var tiles3 = getNumberOfTilesInTileArray(triples, triple.index + 2, triple.type);
		if (tiles1 == 2 && tiles2 == 2 && tiles3 == 2) {
			return { open: 0, closed: 1 };
		}
	}
	return { open: 0, closed: 0 };
}

//Sanankou
function getSanankou(hand) {
	if (!isConsideringCall) {
		var concealedTriples = getTripletsAsArray(hand);
		if (parseInt(concealedTriples.length / 3) >= 3) {
			return { open: 2, closed: 2 };
		}
	}

	return { open: 0, closed: 0 };
}

//Toitoi
function getToitoi(triplets) {
	if (parseInt(triplets.length / 3) >= 4) {
		return { open: 2, closed: 2 };
	}

	return { open: 0, closed: 0 };
}

//Sanshoku Douko
function getSanshokuDouko(triplets) {
	for (var i = 1; i <= 9; i++) {
		if (triplets.filter(tile => tile.index == i && tile.type < 3).length >= 9) {
			return { open: 2, closed: 2 };
		}
	}
	return { open: 0, closed: 0 };
}

//Sanshoku Doujun
function getSanshokuDoujun(sequences) {
	for (var i = 1; i <= 7; i++) {
		var seq = sequences.filter(tile => tile.index == i || tile.index == i + 1 || tile.index == i + 2);
		if (seq.length >= 9 && seq.filter(tile => tile.type == 0) >= 3 &&
			seq.filter(tile => tile.type == 1) >= 3 && seq.filter(tile => tile.type == 0) >= 3) {
			return { open: 1, closed: 2 };
		}
	}
	return { open: 0, closed: 0 };
}

//Shousangen
function getShousangen(hand) {
	if (hand.filter(tile => tile.type == 3 && tile.index >= 5).length == 8 &&
		hand.filter(tile => tile.type == 3 && tile.index == 5).length < 4 &&
		hand.filter(tile => tile.type == 3 && tile.index == 6).length < 4 &&
		hand.filter(tile => tile.type == 3 && tile.index == 7).length < 4) {
		return { open: 2, closed: 2 };
	}
	return { open: 0, closed: 0 };
}

//Daisangen
function getDaisangen(hand) {
	if (hand.filter(tile => tile.type == 3 && tile.index == 5).length >= 3 &&
		hand.filter(tile => tile.type == 3 && tile.index == 6).length >= 3 &&
		hand.filter(tile => tile.type == 3 && tile.index == 7).length >= 3) {
		return { open: 10, closed: 10 }; //Yakuman -> 10?
	}
	return { open: 0, closed: 0 };
}

//Chanta - poor detection
function getChanta(triplets, sequences, pairs) {
	if ((triplets.concat(pairs)).filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length +
		(sequences.filter(tile => tile.index == 1 || tile.index == 9).length * 3) >= 13) {
		return { open: 1, closed: 2 };
	}
	return { open: 0, closed: 0 };
}

//Honrou
function getHonrou(triplets) {
	if (triplets.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length >= 13) {
		return { open: 3, closed: 2 }; // - Added to Chanta
	}
	return { open: 0, closed: 0 };
}

//Junchan
function getJunchan(triplets, sequences, pairs) {
	if ((triplets.concat(pairs)).filter(tile => tile.type != 3 && (tile.index == 1 || tile.index == 9)).length + (sequences.filter(tile => tile.index == 1 || tile.index == 9).length * 3) >= 13) {
		return { open: 1, closed: 1 }; // - Added to Chanta
	}
	return { open: 0, closed: 0 };
}

//Ittsuu
function getIttsuu(triples) {
	for (var j = 0; j <= 2; j++) {
		for (var i = 1; i <= 9; i++) {
			if (!triples.some(tile => tile.type == j && tile.index == i)) {
				break;
			}
			if (i == 9) {
				return { open: 1, closed: 2 };
			}
		}
	}
	return { open: 0, closed: 0 };
}

//Honitsu
function getHonitsu(hand) {
	var pinzu = hand.filter(tile => tile.type == 3 || tile.type == 0).length;
	var manzu = hand.filter(tile => tile.type == 3 || tile.type == 1).length;
	var souzu = hand.filter(tile => tile.type == 3 || tile.type == 2).length;
	if (pinzu >= 14 || pinzu >= hand.length ||
		manzu >= 14 || manzu >= hand.length ||
		souzu >= 14 || souzu >= hand.length) {
		return { open: 2, closed: 3 };
	}
	return { open: 0, closed: 0 };
}

//Chinitsu
function getChinitsu(hand) {
	var pinzu = hand.filter(tile => tile.type == 0).length;
	var manzu = hand.filter(tile => tile.type == 1).length;
	var souzu = hand.filter(tile => tile.type == 2).length;
	if (pinzu >= 14 || pinzu >= hand.length ||
		manzu >= 14 || manzu >= hand.length ||
		souzu >= 14 || souzu >= hand.length) {
		return { open: 3, closed: 3 }; //Score gets added to honitsu -> 5/6 han
	}
	return { open: 0, closed: 0 };
}

//################################
// AI OFFENSE
// Offensive part of the AI
//################################

//Look at Hand etc. and decide for a strategy.
function determineStrategy() {

	if (strategy != STRATEGIES.FOLD) {
		var handTriples = parseInt(getTriples(getHandWithCalls(ownHand)).length / 3);
		var pairs = getPairsAsArray(ownHand).length / 2;

		if ((pairs == 6 || (pairs >= CHIITOITSU && handTriples < 2)) && isClosed) {
			strategy = STRATEGIES.CHIITOITSU;
			strategyAllowsCalls = false;
		}
		else if (canDoThirteenOrphans()) {
			strategy = STRATEGIES.THIRTEEN_ORPHANS;
			strategyAllowsCalls = false;
		}
		else {
			if (strategy == STRATEGIES.THIRTEEN_ORPHANS ||
				strategy == STRATEGIES.CHIITOITSU) {
				strategyAllowsCalls = true; //Don't reset this value when bot is playing defensively without a full fold
			}
			strategy = STRATEGIES.GENERAL;
		}
	}
	log("Strategy: " + strategy);
}

//Call a Chi/Pon
//combination example: Array ["6s|7s", "7s|9s"]
function callTriple(combinations, operation) {

	log("Consider call on " + getTileName(getTileForCall()));

	var handValue = getHandValues(ownHand);
	var newHand = ownHand.concat([getTileForCall()]);

	var currentHandTriples = getTriplesAndPairs(ownHand);
	var newHandTriples = getTriplesAndPairs(newHand);

	//Find best Combination
	var comb = -1;
	var newTriple = removeTilesFromTileArray(newHandTriples.triples, currentHandTriples.triples.concat(getTileForCall()));
	newTriple = sortTiles(newTriple);

	if (newHandTriples.triples.length <= currentHandTriples.triples.length || typeof newTriple[0] == 'undefined' || typeof newTriple[1] == 'undefined') { //No new triple
		log("Call would form no new triple! Declined!");
		declineCall(operation);
		return false;
	}

	for (var i = 0; i < combinations.length; i++) {
		if (combinations[i] == getTileName(newTriple[0]) + "|" + getTileName(newTriple[1]) || combinations[i] == getTileName(newTriple[1]) + "|" + getTileName(newTriple[0])) {
			var wasClosed = isClosed;
			calls[0].push(newTriple[0]); //Simulate "Call" for hand value calculation
			calls[0].push(newTriple[1]);
			calls[0].push(getTileForCall());
			isClosed = false;
			newHand = removeTilesFromTileArray(ownHand, [newTriple[0], newTriple[1]]); //Remove called tiles from hand
			var nextDiscard = getDiscardTile(getTilePriorities(newHand)); //Calculate next discard
			newHand = removeTilesFromTileArray(newHand, [nextDiscard]); //Remove discard from hand
			var newHandValue = getHandValues(newHand, nextDiscard); //Get Value of that hand
			newHandTriples = getTriplesAndPairs(newHand); //Get Triples, to see if discard would make the hand worse
			calls[0].pop();
			calls[0].pop();
			calls[0].pop();
			isClosed = wasClosed;
			if (nextDiscard.index == getTileForCall().index && nextDiscard.type == getTileForCall().type) {
				declineCall(operation);
				log("Next discard would be the same tile. Call declined!");
				return false;
			}
			log("Combination found: " + combinations[i]);
			comb = i;
		}
	}

	if (!strategyAllowsCalls) { //No Calls allowed
		log("Strategy allows no calls! Declined!");
		declineCall(operation);
		return false;
	}

	if (comb == -1) {
		log("Could not find combination. Call declined!");
		declineCall(operation);
		return false;
	}

	if (shouldFold([newHandValue])) {
		log("Would fold next discard! Declined!");
		declineCall(operation);
		return false;
	}

	if (newHandValue.yaku.open < 0.1) { //Yaku chance is too bad
		log("Not enough Yaku! Declined! " + newHandValue.yaku.open + "<0.1");
		declineCall(operation);
		return false;
	}

	if (newHandTriples.triples.length < currentHandTriples.triples.length) { //Destroys triple next turn
		log("Next discard would destroy a triple. Declined!");
		declineCall(operation);
		return false;
	}

	if (parseInt(currentHandTriples.triples.length / 3) == 3 && parseInt(currentHandTriples.pairs.length / 2) == 1) { //New Triple destroys the last pair
		log("Call would destroy last pair! Declined!");
		declineCall(operation);
		return false;
	}

	if (handValue.waits > 1 && newHandValue.waits < handValue.waits + 1) { //Call results in worse waits 
		log("Call would result in less waits! Declined!");
		declineCall(operation);
		return false;
	}

	if (isClosed && newHandValue.score.open < 1500 && newHandValue.shanten >= 3 && seatWind != 1) { // Hand is worthless and slow and not dealer. Should prevent cheap yakuhai or tanyao calls
		log("Hand is cheap and slow! Declined!");
		declineCall(operation);
		return false;
	}

	if (handValue.shanten >= 4 && seatWind == 1) { //Very slow hand & dealer? -> Go for a fast win
		log("Call accepted because of bad hand and dealer position!");
	}
	else if (!isClosed && newHandValue.score.open > handValue.score.open * 0.9) { //Hand is already open and not much value is lost
		log("Call accepted because hand is already open!");
	}
	else if (newHandValue.score.open >= 4000 && newHandValue.score.open > handValue.score.closed * 0.7) { //High value hand? -> Go for a fast win
		log("Call accepted because of high value hand!");
	}
	else if (newHandValue.score.open >= handValue.score.closed * 1.75) { //Call gives additional value to hand
		log("Call accepted because it boosts the value of the hand!");
	}
	else if (newHandValue.shanten == 0 && newHandValue.score.open > handValue.score.closed * 0.9 && newHandValue.waits > 2 && // Make hand ready and eliminate a bad wait
		(newTriple[0].index == newTriple[1].index || Math.abs(newTriple[0].index - newTriple[1].index) == 2 || // Pon or Kanchan
			newTriple[0].index >= 8 && newTriple[1].index >= 8 || newTriple[0].index <= 2 && newTriple[1].index <= 2)) { //Penchan
		log("Call accepted because it eliminates a bad wait and makes the hand ready!");
	}
	else { //Decline
		declineCall(operation);
		log("Call declined because it does not benefit the hand!");
		return false;
	}

	makeCallWithOption(operation, comb);
	if (MODE === AIMODE.AUTO) {
		isClosed = false; // help mode just check every time
	}
	return true;

}

//Call Tile for Kan
function callDaiminkan() {
	if (!isClosed) {
		callKan(getOperations().ming_gang, getTileForCall());
	}
	else { //Always decline with closed hand
		declineCall(getOperations().ming_gang);
	}
}

//Add from Hand to existing Pon
function callShouminkan() {
	callKan(getOperations().add_gang, getTileForCall());
}

//Closed Kan
function callAnkan(combination) {
	callKan(getOperations().an_gang, getTileFromString(combination[0]));
}

//Needs a semi good hand to call Kans and other players are not dangerous
function callKan(operation, tileForCall) {
	log("Consider Kan.");
	var tiles = getHandValues(getHandWithCalls(ownHand));

	var newTiles = getHandValues(getHandWithCalls(removeTilesFromTileArray(ownHand, [tileForCall]))); //Check if efficiency goes down without additional tile

	if (isPlayerRiichi(0) ||
		(strategyAllowsCalls &&
			tiles.shanten <= (tilesLeft / 30) + (CALL_KAN_CONSTANT / 50) &&
			getCurrentDangerLevel() < 1000 + (CALL_KAN_CONSTANT * 10) &&
			(tiles.shanten <= newTiles.shanten) &&
			(tiles.efficiency * 0.9 <= newTiles.efficiency))) {
		makeCall(operation);
		log("Kan accepted!");
	}
	else {
		if (operation == getOperations().ming_gang) { // Decline call for closed/added Kans is not working, just skip it and discard normally
			declineCall(operation);
		}
		log("Kan declined!");
	}
}

function callRon() {
	makeCall(getOperations().rong);
}

function callTsumo() {
	makeCall(getOperations().zimo);
}

function callKita() { // 3 player only
	if (strategy != STRATEGIES.THIRTEEN_ORPHANS && strategy != STRATEGIES.FOLD) {
		sendKitaCall();
		return true;
	}
	return false;
}

function callAbortiveDraw() { // Kyuushu Kyuuhai, 9 Honors or Terminals in starting Hand
	if (canDoThirteenOrphans()) {
		return;
	}
	var handValue = getHandValues(ownHand);
	if (handValue.shanten >= 4) { //Hand is bad -> abort game
		sendAbortiveDrawCall();
	}
}

function callRiichi(tiles) {
	var operations = getOperationList();
	var combination = [];
	for (let op of operations) {
		if (op.type == getOperations().liqi) { //Get possible tiles for discard in riichi
			combination = op.combination;
		}
	}
	log(JSON.stringify(combination));
	for (let tile of tiles) {
		for (let comb of combination) {
			if (comb.charAt(0) == "0") { //Fix for Dora Tiles
				combination.push("5" + comb.charAt(1));
			}
			if (getTileName(tile.tile) == comb) {
				if (shouldRiichi(tile)) {
					var moqie = false;
					if (getTileName(tile.tile) == getTileName(ownHand[ownHand.length - 1])) { //Is last tile?
						moqie = true;
					}
					log("Call Riichi!");
					sendRiichiCall(comb, moqie);
					return;
				}
				else {
					log("Riichi declined!");
					discardTile(tiles[0].tile);
					return;
				}
			}
		}
	}
	log("Riichi declined because Combination not found!");
	discardTile(tiles[0].tile);
}

//Discard either: The safest tile in hand if full fold
//Or the safest tile at the top of the list if one turn fold
function discardFold(tiles) {
	if (strategy != STRATEGIES.FOLD) { //Not in full Fold mode yet: Discard a relatively safe tile with high priority
		for (let tile of tiles) {
			var foldThreshold = getFoldThreshold(tile, ownHand);
			if (tile.priority * 1.1 > tiles[0].priority) { //If next tile is not much worse in priority than the top priority discard
				if (tile.danger <= foldThreshold) { //Tile that is safe enough exists
					log("Tile Priorities: ");
					printTilePriority(tiles);
					discardTile(tile.tile);
					return tile.tile;
				}
			}
		}
		// No safe tile with high priority found: Full Fold.
		log("Hand is very dangerous, full fold.");
		//strategy = STRATEGIES.FOLD;
		strategyAllowsCalls = false;
	}

	tiles.sort(function (p1, p2) {
		return p1.danger - p2.danger;
	});
	log("Fold Tile Priorities: ");
	printTilePriority(tiles);

	discardTile(tiles[0].tile);
	return tiles[0].tile;
}

//Remove the given Tile from Hand
function discardTile(tile) {
	log("Discard: " + getTileName(tile));
	for (var i = 0; i < ownHand.length; i++) {
		if (ownHand[i].index == tile.index && ownHand[i].type == tile.type && ownHand[i].dora == tile.dora) {
			discards[0].push(ownHand[i]);
			if (!isDebug()) {
				callDiscard(i);
			}
			else {
				ownHand.splice(i, 1);
			}
			break;
		}
	}
}

//Simulates discarding every tile and calculates hand value
function getTilePriorities(inputHand) {

	if (isDebug()) {
		log("Dora: " + getTileName(dora[0]));
		printHand(inputHand);
	}

	if (strategy == STRATEGIES.CHIITOITSU) {
		return chiitoitsuPriorities();
	}
	else if (strategy == STRATEGIES.THIRTEEN_ORPHANS) {
		return thirteenOrphansPriorities();
	}

	var tiles = [];
	for (var i = 0; i < inputHand.length; i++) { //Create 13 Tile hands

		var hand = [...inputHand];
		hand.splice(i, 1);

		tiles.push(getHandValues(hand, inputHand[i]));

	}

	tiles.sort(function (p1, p2) {
		return p2.priority - p1.priority;
	});
	return tiles;
}

/*
Calculates Values for all tiles in the hand.
As the Core of the AI this function is really complex. The simple explanation:
It simulates the next two turns, calculates all the important stuff (shanten, dora, yaku, waits etc.) and produces a priority for each tile based on the expected value/shanten in two turns.

In reality it would take far too much time to calculate all the possibilites (availableTiles * (availableTiles - 1) * 2 which can be up to 30000 possibilities).
Therefore most of the complexity comes from tricks to reduce the runtime:
At first all the tiles are computed that could improve the hand in the next two turns (which is usually less than 1000).
Duplicates (for example 3m -> 4m and 4m -> 3m) are marked and will only be computed once, but with twice the value.
The rest is some math to produce the same result which would result in actually simulating everything (like adding the original value of the hand for all the useless combinations).
*/
function getHandValues(hand, discardedTile) {
	var shanten = 8; //No check for Chiitoitsu in this function, so this is maximum

	var callTriples = parseInt(getTriples(calls[0]).length / 3);

	var triplesAndPairs = getTriplesAndPairs(hand);
	var triples = triplesAndPairs.triples;
	var pairs = triplesAndPairs.pairs;
	var doubles = getDoubles(removeTilesFromTileArray(hand, triples.concat(pairs)));

	var baseDora = getNumberOfDoras(triples.concat(pairs, calls[0]));
	var baseYaku = getYaku(hand, calls[0], triplesAndPairs);
	var baseShanten = calculateShanten(parseInt(triples.length / 3) + callTriples, parseInt(pairs.length / 2), parseInt(doubles.length / 2));

	if (typeof discardedTile != 'undefined') { //When deciding whether to call for a tile there is no discarded tile in the evaluation
		hand.push(discardedTile); //Calculate original values
		var originalCombinations = getTriplesAndPairs(hand);
		var originalTriples = originalCombinations.triples;
		var originalPairs = originalCombinations.pairs;
		var originalDoubles = getDoubles(removeTilesFromTileArray(hand, originalTriples.concat(originalPairs)));

		var originalShanten = calculateShanten(parseInt(originalTriples.length / 3) + callTriples, parseInt(originalPairs.length / 2), parseInt(originalDoubles.length / 2));
		hand.pop();
	}
	else {
		var originalShanten = baseShanten;
	}

	var expectedScore = { open: 0, closed: 0, riichi: 0 }; //For the expected score (only looking at hands that improve the current hand)
	var yaku = { open: 0, closed: 0 }; //Expected Yaku
	var doraValue = 0; //Expected Dora
	var waits = 0; //Waits when in Tenpai (Or fractions of it when 1 shanten)
	var fu = 0;

	var waitTiles = [];
	var tileCombinations = []; //List of combinations for second step to save calculation time

	// STEP 1: Create List of combinations of tiles that can improve the hand
	var newTiles1 = getUsefulTilesForDouble(hand); //For every tile: Find tiles that make them doubles or triples
	for (let newTile of newTiles1) {

		var numberOfTiles1 = getNumberOfTilesAvailable(newTile.index, newTile.type);
		if (numberOfTiles1 <= 0) { //Skip if tile is dead
			continue;
		}

		hand.push(newTile);
		var newTiles2 = getUsefulTilesForDouble(hand).filter(t => getNumberOfTilesAvailable(t.index, t.type) > 0);
		if (LOW_SPEC_MODE) { //In Low Spec Mode: Ignore some combinations that are unlikely to improve the hand -> Less calculation time
			newTiles2 = getUsefulTilesForTriple(hand).filter(t => getNumberOfTilesAvailable(t.index, t.type) > 0);
			//newTiles2 = newTiles2.filter(t => t.type == newTile.type);
		}

		var newTiles2Objects = [];
		for (let t of newTiles2) {
			var dupl1 = tileCombinations.find(tc => isSameTile(tc.tile1, t)); //Check if combination is already in the array
			var skip = false;
			if (typeof dupl1 != 'undefined') {
				var duplicateCombination = dupl1.tiles2.find(t2 => isSameTile(t2.tile2, newTile));
				if (typeof duplicateCombination != 'undefined') { //If already exists: Set flag to count it twice and set flag to skip the current one
					duplicateCombination.duplicate = true;
					skip = true;
				}
			}
			newTiles2Objects.push({ tile2: t, winning: false, furiten: false, triplesAndPairs: null, duplicate: false, skip: skip });
		};

		tileCombinations.push({ tile1: newTile, tiles2: newTiles2Objects, winning: false, furiten: false, triplesAndPairs: null });
		hand.pop();
	}

	//STEP 2: Check if some of these tiles or combinations are winning or in furiten. We need to know this in advance for Step 3
	for (let tileCombination of tileCombinations) {
		//Simulate only the first tile drawn for now
		var tile1 = tileCombination.tile1;
		hand.push(tile1);

		var triplesAndPairs2 = getTriplesAndPairs(hand);

		var winning = isWinningHand(parseInt((triplesAndPairs2.triples.length / 3)) + callTriples, triplesAndPairs2.pairs.length / 2);
		if (winning) {
			waitTiles.push(tile1);
			//Mark this tile in other combinations as not duplicate and no skip
			for (let tc of tileCombinations) {
				tc.tiles2.forEach(function (t2) {
					if (isSameTile(tile1, t2.tile2)) {
						t2.duplicate = false;
						t2.skip = false;
					}
				});
			}
		}
		var furiten = (winning && isTileFuriten(tile1.index, tile1.type));
		tileCombination.winning = winning;
		tileCombination.furiten = furiten;
		tileCombination.triplesAndPairs = triplesAndPairs2; //The triplesAndPairs function is really slow, so save this result for later

		hand.pop();
	}

	var tile1Furiten = tileCombinations.filter(t => t.furiten).length > 0;
	for (let tileCombination of tileCombinations) { //Now again go through all the first tiles, but also the second tiles
		hand.push(tileCombination.tile1);
		for (let tile2Data of tileCombination.tiles2) {
			if (tile2Data.skip || (tileCombination.winning && !tile1Furiten)) { //Ignore second tile if marked as skip(is a duplicate) or already winning with tile 1
				continue;
			}
			hand.push(tile2Data.tile2);

			var triplesAndPairs3 = getTriplesAndPairs(hand);

			var winning2 = isWinningHand(parseInt((triplesAndPairs3.triples.length / 3)) + callTriples, triplesAndPairs3.pairs.length / 2);
			var furiten2 = winning2 && isTileFuriten(tile2Data.tile2.index, tile2Data.tile2.type);
			tile2Data.winning = winning2;
			tile2Data.furiten = furiten2;
			tile2Data.triplesAndPairs = triplesAndPairs3;

			hand.pop();
		}
		hand.pop();
	}

	var numberOfTotalCombinations = 0;
	var numberOfTotalWaitCombinations = 0;

	//STEP 3: Check the values when these tiles are drawn.
	for (let tileCombination of tileCombinations) {
		var tile1 = tileCombination.tile1;
		var numberOfTiles1 = getNumberOfTilesAvailable(tile1.index, tile1.type);

		//Simulate only the first tile drawn for now
		hand.push(tile1);

		var triplesAndPairs2 = tileCombination.triplesAndPairs;
		var triples2 = triplesAndPairs2.triples;
		var pairs2 = triplesAndPairs2.pairs;

		if (!isClosed && (!tileCombination.winning || tile1Furiten) &&
			getNumberOfTilesInTileArray(triples2, tile1.index, tile1.type) == 3) {
			numberOfTiles1 *= 2; //More value to possible triples when hand is open (can call pons from all players)
		}

		var factor;
		if (tileCombination.winning && !tile1Furiten) { //Hand is winning: Add the values of the hand for most possible ways to draw this:
			factor = numberOfTiles1 * (availableTiles.length - 1); //Number of ways to draw this tile first and then any of the other tiles
			//Number of ways to draw a random tile which we don't have in the array and then the winning tile. We only look at the "good tile -> winning tile" combination later.
			factor += (availableTiles.length - tileCombinations.reduce((pv, cv) => pv + getNumberOfTilesAvailable(cv.tile1.index, cv.tile1.type), 0)) * numberOfTiles1;
			shanten += (0 - baseShanten) * factor; //Just for completion: We are tenpai
		}
		else { // This tile is not winning
			// For all the tiles we don't consider as a second draw (because they're useless): The shanten value for this tile -> useless tile is just the value after the first draw
			var doubles2 = getDoubles(removeTilesFromTileArray(hand, triples2.concat(pairs2)));
			factor = numberOfTiles1 * ((availableTiles.length - 1) - tileCombination.tiles2.reduce(function (pv, cv) { // availableTiles - useful tiles (which we will check later)
				if (isSameTile(tile1, cv.tile2)) {
					return pv + getNumberOfTilesAvailable(cv.tile2.index, cv.tile2.type) - 1;
				}
				return pv + getNumberOfTilesAvailable(cv.tile2.index, cv.tile2.type);
			}, 0));
			if (tile1Furiten) {
				shanten += (1 - baseShanten) * factor;
			}
			else {
				shanten += (calculateShanten(parseInt(triples2.length / 3) + callTriples, parseInt(pairs2.length / 2), parseInt(doubles2.length / 2)) - baseShanten) * factor;
			}
		}

		var thisFu = 30;
		var thisDora = getNumberOfDoras(triples2.concat(pairs2, calls[0]));
		var thisYaku = getYaku(hand, calls[0], triplesAndPairs2);

		if (tileCombination.winning) { //For winning tiles: Add waits, fu and the Riichi value (value only for drawing winning tiles)
			if (!tile1Furiten) {
				if (isClosed || thisYaku.open >= 1) {
					var thisWait = numberOfTiles1 * getWaitQuality(tile1);
					waits += thisWait;
					thisFu = calculateFu(triples2, calls[0], pairs2, removeTilesFromTileArray(hand, triples.concat(pairs).concat(tile1)), tile1);
					fu += thisFu * thisWait * factor;
					if (thisFu == 30 && isClosed) {
						thisYaku.closed += 1;
					}
				}
			}
			expectedScore.riichi += calculateScore(0, thisYaku.closed + thisDora + 1 + 0.2 + getUradoraChance(), thisFu) * thisWait * factor;
			numberOfTotalWaitCombinations += factor * thisWait;
		}

		if ((tileCombination.winning && !tile1Furiten) || //If this tile improves the hand (or wins): Add the values to our expected values
			thisDora > baseDora || thisYaku.closed > baseYaku.closed || (isClosed && thisYaku.open > baseYaku.open)) {
			if (!tileCombination.winning || tile1Furiten) {
				//This tile in combination with all the tiles we are not checking as second tiles
				factor = numberOfTiles1 * (availableTiles.length - 1 - tileCombination.tiles2.reduce((pv, cv) => pv + getNumberOfTilesAvailable(cv.tile2.index, cv.tile2.type), 0));
				//This tile in combination with all the tiles we are not checking as first tiles
				factor += (availableTiles.length - tileCombinations.reduce((pv, cv) => pv + getNumberOfTilesAvailable(cv.tile1.index, cv.tile1.type), 0)) * numberOfTiles1;
			}
			doraValue += thisDora * factor;
			yaku.open += thisYaku.open * factor;
			yaku.closed += thisYaku.closed * factor;
			expectedScore.open += calculateScore(0, thisYaku.open + thisDora, thisFu) * factor;
			expectedScore.closed += calculateScore(0, thisYaku.closed + thisDora, thisFu) * factor;
			numberOfTotalCombinations += factor;
		}

		if (tileCombination.winning && !tile1Furiten) {
			hand.pop();
			continue; //No need to check this tile in combination with any of the other tiles, if this is drawn first and already wins
		}

		var tile2Furiten = tileCombination.tiles2.filter(t => t.furiten).length > 0;

		for (let tile2Data of tileCombination.tiles2) {//Look at second tiles if not already winning
			var tile2 = tile2Data.tile2;
			var numberOfTiles2 = getNumberOfTilesAvailable(tile2.index, tile2.type);
			if (isSameTile(tile1, tile2)) {
				if (numberOfTiles2 == 1) {
					continue;
				}
				numberOfTiles2--;
			}

			if (tile2Data.skip) {
				continue;
			}

			var combFactor = numberOfTiles1 * numberOfTiles2; //Number of ways to draw tile 1 first and then tile 2
			if (tile2Data.duplicate) {
				combFactor *= 2;
			}

			hand.push(tile2); //Simulate second draw

			var triplesAndPairs3 = tile2Data.triplesAndPairs;
			var triples3 = triplesAndPairs3.triples;
			var pairs3 = triplesAndPairs3.pairs;

			var thisShanten = 8;
			var winning = isWinningHand(parseInt((triples3.length / 3)) + callTriples, pairs3.length / 2);

			var thisDora = getNumberOfDoras(triples3.concat(pairs3, calls[0]));
			var thisYaku = getYaku(hand, calls[0], triplesAndPairs3);

			if (!isClosed && (!winning || tile2Furiten) &&
				getNumberOfTilesInTileArray(triples3, tile2.index, tile2.type) == 3) {
				numberOfTiles2 *= 2; //More value to possible triples when hand is open (can call pons from all players)
			}

			if (winning && !tile2Furiten) { //If this tile combination wins in 2 turns: calculate waits etc.
				thisShanten = 0 - baseShanten;
				if (waitTiles.filter(t => isSameTile(t, tile2)).length == 0) {
					var newWait = numberOfTiles2 * getWaitQuality(tile2) * ((numberOfTiles1) / availableTiles.length);
					if (tile2Data.duplicate) {
						newWait += numberOfTiles1 * getWaitQuality(tile1) * ((numberOfTiles2) / availableTiles.length);
					}
					waits += newWait;
				}

				var secondDiscard = removeTilesFromTileArray(hand, triples3.concat(pairs3))[0];
				if (!tile2Data.duplicate) {
					var newFu = calculateFu(triples3, calls[0], pairs3, removeTilesFromTileArray(hand, triples.concat(pairs).concat(tile2).concat(secondDiscard)), tile2);
					if (newFu == 30 && isClosed) {
						thisYaku.closed += 1;
					}
				}
				else { //Calculate Fu for drawing both tiles in different orders
					var newFu = calculateFu(triples3, calls[0], pairs3, removeTilesFromTileArray(hand, triples.concat(pairs).concat(tile2).concat(secondDiscard)), tile2);
					var newFu2 = calculateFu(triples3, calls[0], pairs3, removeTilesFromTileArray(hand, triples.concat(pairs).concat(tile1).concat(secondDiscard)), tile1);
					if (newFu == 30 && isClosed) {
						thisYaku.closed += 0.5;
					}
					if (newFu2 == 30 && isClosed) {
						thisYaku.closed += 0.5;
					}
				}
			}
			else { //Not winning? Calculate shanten correctly
				if (winning && tile2Furiten) { //Furiten: We are 1 shanten
					thisShanten = 1 - baseShanten;
				}
				else {
					var doubles3 = getDoubles(removeTilesFromTileArray(hand, triples3.concat(pairs3)));
					thisShanten = calculateShanten(parseInt(triples3.length / 3) + callTriples, parseInt(pairs3.length / 2), parseInt(doubles3.length / 2)) - baseShanten;
				}
			}
			shanten += thisShanten * combFactor;

			if (((thisDora > baseDora || thisYaku.open > baseYaku.open || //Does this combination improve the hand (in value or in shanten?) -> Add these expected values
				(isClosed && thisYaku.closed > baseYaku.closed))) ||
				winning || thisShanten < 0) {
				doraValue += thisDora * combFactor;
				yaku.open += thisYaku.open * combFactor;
				yaku.closed += thisYaku.closed * combFactor;
				expectedScore.open += calculateScore(0, thisYaku.open + thisDora) * combFactor;
				expectedScore.closed += calculateScore(0, thisYaku.closed + thisDora) * combFactor;
				numberOfTotalCombinations += combFactor;
			}

			hand.pop();
		}

		hand.pop();
	}

	var allCombinations = availableTiles.length * (availableTiles.length - 1);
	shanten /= allCombinations; //Divide by total amount of possible draw combinations

	expectedScore.open /= numberOfTotalCombinations; //Divide by the total combinations we checked, to get the average expected value
	expectedScore.closed /= numberOfTotalCombinations;
	doraValue /= numberOfTotalCombinations;
	yaku.open /= numberOfTotalCombinations;
	yaku.closed /= numberOfTotalCombinations;
	if (numberOfTotalWaitCombinations > 0) {
		expectedScore.riichi /= numberOfTotalWaitCombinations;
		fu /= numberOfTotalWaitCombinations;
	}

	fu = fu <= 30 ? 30 : fu;
	fu = fu > 110 ? 30 : fu;

	var efficiency = (shanten + (baseShanten - originalShanten)) * -1; //Percent Number that indicates how big the chance is to improve the hand (in regards to efficiency). Negative for increasing shanten with the discard
	if (originalShanten == 0) { //Already in Tenpai: Look at waits instead
		efficiency = waits / 20;
	}
	else { //When not tenpai
		expectedScore.riichi = calculateScore(0, yaku.closed + doraValue + 1 + 0.2 + getUradoraChance());
	}

	if (getNumberOfPlayers() == 3) {
		var kita = getNumberOfKitaOfPlayer(0) * getTileDoraValue({ index: 4, type: 3 });;
		doraValue += kita;
	}

	var danger = 0;
	if (typeof discardedTile != 'undefined') { //When deciding whether to call for a tile there is no discarded tile in the evaluation
		danger = getTileDanger(discardedTile, hand);
	}
	var priority = calculateTilePriority(efficiency, expectedScore, danger);
	return {
		tile: discardedTile, priority: priority, shanten: baseShanten, efficiency: efficiency,
		score: expectedScore, dora: doraValue, yaku: yaku, waits: waits, danger: danger, fu: fu
	};
}

function calculateTilePriority(efficiency, expectedScore, danger) {
	var score = expectedScore.open;
	if (isClosed) {
		score = expectedScore.closed;
	}

	var placementFactor = 1; //TODO: Add this to the formula

	if (isLastGame() && getDistanceToFirst() < -10000) { //Huge lead in last game
		placementFactor = 0.75;
	}

	//TODO: Add parameters
	return efficiency * (score - danger);
}

//Get Chiitoitsu Priorities -> Look for Pairs
function chiitoitsuPriorities() {

	var tiles = [];

	var originalPairs = getPairsAsArray(ownHand);

	var originalShanten = 6 - (originalPairs.length / 2);

	for (var i = 0; i < ownHand.length; i++) { //Create 13 Tile hands, check for pairs
		var newHand = [...ownHand];
		newHand.splice(i, 1);
		var pairs = getPairsAsArray(newHand);
		var pairsValue = pairs.length / 2;
		var handWithoutPairs = removeTilesFromTileArray(newHand, pairs);

		var baseDora = getNumberOfDoras(pairs);
		var doraValue = 0;
		var baseShanten = 6 - pairsValue;

		var waits = 0;
		var shanten = 0;

		var baseYaku = getYaku(newHand, calls[0]);
		var yaku = { open: 0, closed: 0 };

		//Possible Value, Yaku and Dora after Draw
		var oldTile = { index: 9, type: 9, dora: false };
		availableTiles.forEach(function (tile) {
			if (tile.index != oldTile.index || tile.type != oldTile.type) {
				var currentHand = [...handWithoutPairs];
				currentHand.push(tile);
				var numberOfTiles = getNumberOfNonFuritenTilesAvailable(tile.index, tile.type);
				var chance = numberOfTiles / availableTiles.length;
				var pairs2 = getPairsAsArray(currentHand);
				if (pairs2.length > 0) { //If the tiles improves the hand: Calculate the expected values
					shanten += ((6 - (pairsValue + (pairs2.length / 2))) - baseShanten) * chance;
					doraValue += (getNumberOfDoras(pairs2) - baseDora) * chance;
					var y2 = getYaku(newHand, calls[0]);
					yaku.open += (y2.open - baseYaku.open) * chance;
					yaku.closed += (y2.closed - baseYaku.closed) * chance;
					if (pairsValue + (pairs2.length / 2) == 7) { //Winning hand
						waits = numberOfTiles * getWaitQuality(tile); //Factor waits by "uselessness" for opponents
						yaku = getYaku(newHand, calls[0]);
						doraValue = getNumberOfDoras(newHand); //When Tenpai: The Dora/Yaku for the specific waits needs to be calculated seperately
					}
				}
			}
			oldTile = tile;
		});
		doraValue += baseDora;
		yaku.open += baseYaku.open;
		yaku.closed += baseYaku.closed + 2; //Add Chiitoitsu manually
		if (getNumberOfPlayers() == 3) {
			doraValue += getNumberOfKitaOfPlayer(0) * getTileDoraValue({ index: 4, type: 3 });
		}

		var expectedScore = {
			open: 1000, closed: calculateScore(0, yaku.closed + doraValue, 25),
			riichi: calculateScore(0, yaku.closed + doraValue + 1 + 0.2 + getUradoraChance(), 25)
		};

		var efficiency = (shanten + (baseShanten - originalShanten)) * -1
		var danger = getTileDanger(ownHand[i], newHand);
		var priority = calculateTilePriority(efficiency, expectedScore, danger);
		tiles.push({
			tile: ownHand[i], priority: priority, shanten: baseShanten, efficiency: efficiency,
			score: expectedScore, dora: doraValue, yaku: yaku, waits: waits, danger: danger, fu: 25
		});
	}
	tiles.sort(function (p1, p2) {
		return p2.priority - p1.priority;
	});
	return tiles;
}

//Get Thirteen Orphans Priorities -> Look for Honors/1/9
//Returns Array of tiles with priorities (value, danger etc.)
function thirteenOrphansPriorities() {

	var originalOwnTerminalHonors = getAllTerminalHonorFromHand(ownHand);
	// Filter out all duplicate terminal/honors
	var originalUniqueTerminalHonors = [];
	originalOwnTerminalHonors.forEach(tile => {
		if (!originalUniqueTerminalHonors.some(otherTile => tile.index == otherTile.index && tile.type == otherTile.type)) {
			originalUniqueTerminalHonors.push(tile);
		}
	});
	var originalShanten = 13 - originalUniqueTerminalHonors.length;
	if (originalOwnTerminalHonors.length > originalUniqueTerminalHonors.length) { //At least one terminal/honor twice
		originalShanten -= 1;
	}

	var tiles = [];
	for (var i = 0; i < ownHand.length; i++) { //Simulate discard of every tile

		var hand = [...ownHand];
		hand.splice(i, 1);

		var ownTerminalHonors = getAllTerminalHonorFromHand(hand);
		// Filter out all duplicate terminal/honors
		var uniqueTerminalHonors = [];
		ownTerminalHonors.forEach(tile => {
			if (!uniqueTerminalHonors.some(otherTile => tile.index == otherTile.index && tile.type == otherTile.type)) {
				uniqueTerminalHonors.push(tile);
			}
		});
		var shanten = 13 - uniqueTerminalHonors.length;
		if (ownTerminalHonors.length > uniqueTerminalHonors.length) { //At least one terminal/honor twice
			shanten -= 1;
		}
		var doraValue = getNumberOfDoras(hand);
		var yaku = { open: 13, closed: 13 };
		var waits = 0;
		if (shanten == 0) {
			var missingTile = getMissingTilesForThirteenOrphans(uniqueTerminalHonors)[0];
			waits = getNumberOfNonFuritenTilesAvailable(missingTile.index, missingTile.type);
		}

		var efficiency = shanten == originalShanten ? 1 : 0;
		var danger = getTileDanger(ownHand[i], hand);
		var yakuman = calculateScore(0, 13);
		var expectedScore = { open: 0, closed: yakuman, riichi: yakuman };
		var priority = calculateTilePriority(efficiency, expectedScore, danger);

		tiles.push({
			tile: ownHand[i], priority: priority, shanten: shanten, efficiency: efficiency,
			score: expectedScore, dora: doraValue, yaku: yaku, waits: waits, danger: danger, fu: 30
		});

	}

	tiles.sort(function (p1, p2) {
		return p2.priority - p1.priority;
	});
	return tiles;
}

// Used during the match to see if its still viable to go for thirteen orphans.
function canDoThirteenOrphans() {

	// PARAMETERS
	var max_missing_orphans_count = 2; // If an orphan has been discarded more than this time (and is not in hand), we don't go for thirteen orphan.
	// Ie. 'Red Dragon' is not in hand, but been discarded 3-times on field. We stop going for thirteen orphan.

	if (!isClosed) { //Already called some tiles? Can't do thirteen orphans
		return false;
	}

	var ownTerminalHonors = getAllTerminalHonorFromHand(ownHand);

	// Filter out all duplicate terminal/honors
	var uniqueTerminalHonors = [];
	ownTerminalHonors.forEach(tile => {
		if (!uniqueTerminalHonors.some(otherTile => tile.index == otherTile.index && tile.type == otherTile.type)) {
			uniqueTerminalHonors.push(tile);
		}
	});

	// Fails if we do not have enough unique orphans.
	if (uniqueTerminalHonors.length < THIRTEEN_ORPHANS) {
		return false;
	}

	// Get list of missing orphans.
	var missingOrphans = getMissingTilesForThirteenOrphans(uniqueTerminalHonors);

	if (missingOrphans.length == 1) {
		max_missing_orphans_count = 3;
	}

	// Check if there are enough required orphans in the pool.
	for (let uniqueOrphan of missingOrphans) {
		if (4 - getNumberOfNonFuritenTilesAvailable(uniqueOrphan.index, uniqueOrphan.type) > max_missing_orphans_count) {
			return false;
		}
	}

	return true;
}

//Return a list of missing tiles for thirteen orphans
function getMissingTilesForThirteenOrphans(uniqueTerminalHonors) {
	var thirteen_orphans_set = "19m19p19s1234567z";
	var thirteenOrphansTiles = getTilesFromString(thirteen_orphans_set);
	return missingOrphans = thirteenOrphansTiles.filter(tile =>
		!uniqueTerminalHonors.some(otherTile => tile.index == otherTile.index && tile.type == otherTile.type));
}


//Discards the "best" tile
function discard() {

	var tiles = getTilePriorities(ownHand);
	handTilesdValue = tiles;

	if (strategy == STRATEGIES.FOLD || shouldFold(tiles)) {
		return discardFold(tiles);
	}

	log("Tile Priorities: ");
	printTilePriority(tiles);

	var tile = getDiscardTile(tiles);

	if (canRiichi()) {
		callRiichi(tiles);
	}
	else {
		discardTile(tile);
	}

	return tile;
}

//Input: Tile Priority List
//Output: Best Tile to discard. Usually the first tile in the list, but for open hands a valid yaku is taken into account
function getDiscardTile(tiles) {
	var tile = tiles[0].tile;

	if (tiles[0].yaku.open >= 1 || isClosed) {
		return tile;
	}

	var highestYaku = -1;
	for (let t of tiles) {
		var foldThreshold = getFoldThreshold(t, ownHand);
		if (t.yaku.open > highestYaku + 0.01 && t.yaku.open / 3 > highestYaku && t.danger <= foldThreshold) {
			tile = t.tile;
			highestYaku = t.yaku.open;
			if (t.yaku.open >= 1) {
				break;
			}
		}
	}
	if (getTileName(tile) != (getTileName(tiles[0].tile))) {
		log("Hand is open, trying to keep at least 1 Yaku.");
	}
	return tile;
}

//################################
// AI DEFENSE
// Defensive part of the AI
//################################

//Returns danger of tile for all players (from a specific players perspective, see second param) as a number from 0-100+
//Takes into account Genbutsu (Furiten for opponents), Suji, Walls and general knowledge about remaining tiles.
//From the perspective of playerPerspective parameter
function getTileDanger(tile, hand, playerPerspective = 0) {
	var dangerPerPlayer = [0, 0, 0, 0];
	for (var player = 0; player < getNumberOfPlayers(); player++) { //Foreach Player
		if (player == playerPerspective) {
			continue;
		}

		dangerPerPlayer[player] = getDealInChanceForTileAndPlayer(player, tile, playerPerspective);

		if (playerPerspective == 0) { //Multiply with expected deal in value
			dangerPerPlayer[player] *= getExpectedDealInValue(player);
		}

		if (playerPerspective == 0 && typeof hand != 'undefined') {
			dangerPerPlayer[player] += shouldKeepSafeTile(player, hand, dangerPerPlayer[player]);
		}
	}
	return dangerPerPlayer[0] + dangerPerPlayer[1] + dangerPerPlayer[2] + dangerPerPlayer[3];
}

//Return the Danger value for a specific tile and player
function getTileDangerForPlayer(tile, player, playerPerspective = 0) {
	var danger = 0;
	if (getLastTileInDiscard(player, tile) != null) { // Check if tile in discard (Genbutsu)
		return 0;
	}

	danger = getWaitScoreForTileAndPlayer(player, tile, true, playerPerspective == 0); //Suji, Walls and general knowledge about remaining tiles.

	if (danger <= 0) {
		return 0;
	}

	//Is Dora? -> 10% more dangerous
	danger *= (1 + (getTileDoraValue(tile) / 10));

	//Is close to Dora? -> 5% more dangerous
	if (isTileCloseToDora(tile)) {
		danger *= 1.05;
	}

	//Is the player doing a flush of that type? -> More dangerous
	var honitsuChance = isDoingHonitsu(player, tile.type);
	var otherHonitsu = Math.max(isDoingHonitsu(player, 0) || isDoingHonitsu(player, 1) || isDoingHonitsu(player, 2));
	if (honitsuChance > 0) {
		danger *= 1 + (honitsuChance / 3);
	}
	else if (otherHonitsu > 0) { //Is the player going for any other flush?
		if (tile.type == 3) {
			danger *= 1 + (otherHonitsu / 3); //Honor tiles are also dangerous
		}
		else {
			danger /= 1 + (otherHonitsu / 3); //Other tiles are less dangerous
		}
	}

	//Is the player doing a tanyao? Inner tiles are more dangerous, outer tiles are less dangerous
	if (tile.type != 3 && tile.index < 9 && tile.index > 1) {
		danger *= 1 + (isDoingTanyao(player) / 10);
	}
	else {
		danger /= 1 + (isDoingTanyao(player) / 10);
	}

	//Does the player have no yaku yet? Yakuhai is likely -> Honor tiles are 10% more dangerous
	if (!hasYaku(player)) {
		if (tile.type == 3 && (tile.index > 4 || tile.index == getSeatWind(player) || tile.index == getRoundWind()) &&
			getNumberOfTilesAvailable(tile.type, tile.index) > 2) {
			danger *= 1.1;
		}
	}

	//Is Tile close to the tile discarded on the riichi turn? -> 10% more dangerous
	if (isPlayerRiichi(player) && riichiTiles[getCorrectPlayerNumber(player)] != null &&
		typeof riichiTiles[getCorrectPlayerNumber(player)] != 'undefined') {
		if (isTileCloseToOtherTile(tile, riichiTiles[getCorrectPlayerNumber(player)])) {
			danger *= 1.1;
		}
	}

	//Is Tile close to an early discard (first row)? -> 10% less dangerous
	discards[player].slice(0, 6).forEach(function (earlyDiscard) {
		if (isTileCloseToOtherTile(tile, earlyDiscard)) {
			danger *= 0.9;
		}
	});

	//Danger is at least 5
	if (danger < 5) {
		danger = 5;
	}

	return danger;
}

//Percentage to deal in with a tile
function getDealInChanceForTileAndPlayer(player, tile, playerPerspective = 0) {
	var total = 0;
	if (playerPerspective == 0) {
		if (typeof totalPossibleWaits.turn == 'undefined' || totalPossibleWaits.turn != tilesLeft) {
			totalPossibleWaits = { turn: tilesLeft, totalWaits: [0, 0, 0, 0] }; // Save it in a global variable to not calculate this expensive step multiple times per turn
			for (let pl = 1; pl < getNumberOfPlayers(); pl++) {
				totalPossibleWaits.totalWaits[pl] = getTotalPossibleWaits(pl);
			}
		}
		total = totalPossibleWaits.totalWaits[player];
	}
	if (playerPerspective != 0) {
		total = getTotalPossibleWaits(player);
	}
	return getTileDangerForPlayer(tile, player, playerPerspective) / total; //Then compare the given tile with it, this is our deal in percentage
}

//Total amount of waits possible
function getTotalPossibleWaits(player) {
	var total = 0;
	for (let i = 1; i <= 9; i++) { // Go through all tiles and check how many combinations there are overall for waits.
		for (let j = 0; j <= 3; j++) {
			if (j == 3 && i >= 8) {
				break;
			}
			total += getTileDangerForPlayer({ index: i, type: j }, player);
		}
	}
	return total;
}

//Returns the expected deal in calue
function getExpectedDealInValue(player) {
	var tenpaiChance = isPlayerTenpai(player);

	var value = getExpectedHandValue(player);

	//DealInValue is probability of player being in tenpai multiplied by the value of the hand
	return tenpaiChance * value;
}

//Calculate the expected Han of the hand
function getExpectedHandValue(player) {
	var handValue = getNumberOfDoras(calls[player]); //Visible Dora (melds)

	handValue += getExpectedDoraInHand(player); //Dora in hidden tiles (hand)

	if (isPlayerRiichi(player)) {
		handValue += 1;
	}

	//Kita (3 player mode only)
	if (getNumberOfPlayers() == 3) {
		handValue += (getNumberOfKitaOfPlayer(player) * getTileDoraValue({ index: 4, type: 3 })) * 1;
	}

	//Yakus (only for open hands)
	handValue += (Math.max(isDoingHonitsu(player, 0) * 2), (isDoingHonitsu(player, 1) * 2), (isDoingHonitsu(player, 2) * 2)) +
		(isDoingToiToi(player) * 2) + (isDoingTanyao(player) * 1) + (isDoingYakuhai(player) * 1);

	//Expect some hidden Yaku when more tiles are unknown. 1.3 Yaku for a fully concealed hand
	handValue += getNumberOfTilesInHand(player) / 10;

	return calculateScore(player, handValue);
}

//How many dora does the player have on average in his hidden tiles?
function getExpectedDoraInHand(player) {
	var uradora = 0;
	if (isPlayerRiichi(player)) { //amount of dora indicators multiplied by chance to hit uradora
		uradora = getUradoraChance();
	}
	return (((getNumberOfTilesInHand(player) + (discards[player].length / 2)) / availableTiles.length) * getNumberOfDoras(availableTiles)) + uradora;
}

//Returns the current Danger level of the table
function getCurrentDangerLevel(forPlayer = 0) { //Most Dangerous Player counts extra
	var i = 1;
	var j = 2;
	var k = 3;
	if (forPlayer == 1) {
		i = 0;
	}
	if (forPlayer == 2) {
		j = 0;
	}
	if (forPlayer == 3) {
		k = 0;
	}
	if (getNumberOfPlayers() == 3) {
		return ((getExpectedDealInValue(i) + getExpectedDealInValue(j) + Math.max(getExpectedDealInValue(i), getExpectedDealInValue(j))) / 3);
	}
	return ((getExpectedDealInValue(i) + getExpectedDealInValue(j) + getExpectedDealInValue(k) + Math.max(getExpectedDealInValue(i), getExpectedDealInValue(j), getExpectedDealInValue(k))) / 4);
}

//Returns the number of turns ago when the tile was most recently discarded
function getMostRecentDiscardDanger(tile, player, includeOthers) {
	var danger = 99;
	for (var i = 0; i < getNumberOfPlayers(); i++) {
		var r = getLastTileInDiscard(i, tile);
		if (player == i && r != null) { //Tile is in own discards
			return 0;
		}
		if (!includeOthers) {
			continue;
		}
		if (r != null && typeof (r.numberOfPlayerHandChanges) == 'undefined') {
			danger = 0;
		}
		else if (r != null && r.numberOfPlayerHandChanges[player] < danger) {
			danger = r.numberOfPlayerHandChanges[player];
		}
	}

	return danger;
}

//Returns the position of a tile in discards
function getLastTileInDiscard(player, tile) {
	for (var i = discards[player].length - 1; i >= 0; i--) {
		if (discards[player][i].index == tile.index && discards[player][i].type == tile.type) {
			return discards[player][i];
		}
	}
	if (wasTileCalledFromOtherPlayers(player, tile)) {
		return 10; //unknown when it was discarded
	}
	return null;
}

//Checks if a tile has been called by someone
function wasTileCalledFromOtherPlayers(player, tile) {
	for (var i = 0; i < getNumberOfPlayers(); i++) {
		if (i == player) { //Skip own melds
			continue;
		}
		for (let t of calls[i]) { //Look through all melds and check where the tile came from
			if (t.from == localPosition2Seat(getCorrectPlayerNumber(player)) && tile.index == t.index && tile.type == t.type) {
				return true;
			}
		}
	}
	return false;
}

//Returns a number from 0 to 1 how likely it is that the player is tenpai
function isPlayerTenpai(player) {
	var numberOfCalls = parseInt(calls[player].length / 3);
	if (isPlayerRiichi(player) || numberOfCalls >= 4) {
		return 1;
	}

	//Based on: https://pathofhouou.blogspot.com/2021/04/analysis-tenpai-chance-by-tedashis-and.html
	//TODO: Include the more specific lists for Dama hands
	var tenpaiChanceList = [[], [], [], []];
	tenpaiChanceList[0] = [0, 0.1, 0.2, 0.5, 1, 1.8, 2.8, 4.2, 5.8, 7.6, 9.5, 11.5, 13.5, 15.5, 17.5, 19.5, 21.7, 23.9, 25, 27];
	tenpaiChanceList[1] = [0.2, 0.9, 2.3, 4.7, 8.3, 12.7, 17.9, 23.5, 29.2, 34.7, 39.7, 43.9, 47.4, 50.3, 52.9, 55.2, 57.1, 59, 61, 63];
	tenpaiChanceList[2] = [0, 5.1, 10.5, 17.2, 24.7, 32.3, 39.5, 46.1, 52, 57.2, 61.5, 65.1, 67.9, 69.9, 71.4, 72.4, 73.3, 74.2, 75, 76];
	tenpaiChanceList[3] = [0, 0, 41.9, 54.1, 63.7, 70.9, 76, 79.9, 83, 85.1, 86.7, 87.9, 88.7, 89.2, 89.5, 89.4, 89.3, 89.2, 89.2, 89.2];

	var numberOfDiscards = discards[player].length;
	if (numberOfDiscards > 20) {
		numberOfDiscards = 20;
	}
	for (var i = 0; i < getNumberOfPlayers(); i++) {
		if (i == player) {
			continue;
		}
		for (let t of calls[i]) { //Look through all melds and check where the tile came from
			if (t.from == localPosition2Seat(getCorrectPlayerNumber(player))) {
				numberOfDiscards++;
			}
		}
	}

	var tenpaiChance = tenpaiChanceList[numberOfCalls][numberOfDiscards] / 100;

	tenpaiChance *= 1 + (isPlayerPushing(player) / 5);

	//Player who is doing Honitsu starts discarding tiles of his own type => probably tenpai
	if ((isDoingHonitsu(player, 0) && discards[player].slice(10).filter(tile => tile.type == 0).length > 0)) {
		tenpaiChance *= 1 + (isDoingHonitsu(player, 0) / 1.5);
	}
	if ((isDoingHonitsu(player, 1) && discards[player].slice(10).filter(tile => tile.type == 1).length > 0)) {
		tenpaiChance *= 1 + (isDoingHonitsu(player, 1) / 1.5);
	}
	if ((isDoingHonitsu(player, 2) && discards[player].slice(10).filter(tile => tile.type == 2).length > 0)) {
		tenpaiChance *= 1 + (isDoingHonitsu(player, 2) / 1.5);
	}

	if (tenpaiChance > 1) {
		tenpaiChance = 1;
	}
	else if (tenpaiChance < 0) {
		tenpaiChance = 0;
	}

	return tenpaiChance;
}

//Returns a number from -1 (fold) to 1 (push).
function isPlayerPushing(player) {
	var lastDiscardSafety = playerDiscardSafetyList[player].slice(-3).filter(v => v >= 0); //Check safety of last three discards. If dangerous: Not folding.

	if (playerDiscardSafetyList[player].length < 3 || lastDiscardSafety.length == 0) {
		return 0;
	}

	var pushValue = -1 + (lastDiscardSafety.reduce((v1, v2) => v1 + v2, 0) / (lastDiscardSafety.length * 20));
	if (pushValue > 1) {
		pushValue = 1;
	}
	return pushValue;
}

//Is the player doing any of the most common yaku?
function hasYaku(player) {
	return (isDoingHonitsu(player, 0) > 0 || isDoingHonitsu(player, 1) > 0 || isDoingHonitsu(player, 2) > 0 ||
		isDoingToiToi(player) > 0 || isDoingTanyao(player) > 0 || isDoingYakuhai(player) > 0);
}

//Return a confidence between 0 and 1 for how predictable the strategy of another player is (many calls -> very predictable)
function getConfidenceInYakuPrediction(player) {
	var confidence = Math.pow(parseInt(calls[player].length / 3), 2) / 10;
	if (confidence > 1) {
		confidence = 1;
	}
	return confidence;
}

//Returns a value between 0 and 1 for how likely the player could be doing honitsu
function isDoingHonitsu(player, type) {
	if (parseInt(calls[player].length) == 0 || calls[player].some(tile => tile.type != type && tile.type != 3)) { //Calls of different type -> false
		return 0;
	}
	if (parseInt(calls[player].length / 3) == 4) {
		return 1;
	}
	var percentageOfDiscards = discards[player].slice(0, 10).filter(tile => tile.type == type).length / discards[player].slice(0, 10).length;
	if (percentageOfDiscards > 0.2) {
		return 0;
	}
	var confidence = (Math.pow(parseInt(calls[player].length / 3), 2) / 10) - percentageOfDiscards + 0.1;
	if (confidence > 1) {
		confidence = 1;
	}
	return confidence;
}

//Returns a value between 0 and 1 for how likely the player could be doing toitoi
function isDoingToiToi(player) {
	if (parseInt(calls[player].length) > 0 && getSequences(calls[player]).length == 0) { //Only triplets called
		return getConfidenceInYakuPrediction(player) - 0.1;
	}
	return 0;
}

//Returns a value between 0 and 1 for how likely the player could be doing tanyao
function isDoingTanyao(player) {
	if (parseInt(calls[player].length) > 0 && calls[player].filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length == 0 &&
		(discards[player].slice(0, 5).filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length / discards[player].slice(0, 5).length) >= 0.6) { //only inner tiles called and lots of terminal/honor discards
		return getConfidenceInYakuPrediction(player);
	}
	return 0;
}

//Returns how many Yakuhai the player has
function isDoingYakuhai(player) {
	var yakuhai = parseInt(calls[player].filter(tile => tile.type == 3 && (tile.index > 4 || tile.index == getSeatWind(player) || tile.index == roundWind)).length / 3);
	yakuhai += parseInt(calls[player].filter(tile => tile.type == 3 && tile.index == getSeatWind(player) && tile.index == roundWind).length / 3);
	return yakuhai;
}

//Returns a score how likely this tile can form the last triple/pair for a player
//Suji, Walls and general knowledge about remaining tiles.
//If "includeOthers" parameter is set to true it will also check if other players recently discarded relevant tiles
function getWaitScoreForTileAndPlayer(player, tile, includeOthers, useKnowledgeOfOwnHand = true) {
	var tile0 = getNumberOfTilesAvailable(tile.index, tile.type);
	var tile0Public = tile0 + getNumberOfTilesInTileArray(ownHand, tile.index, tile.type);
	if (!useKnowledgeOfOwnHand) {
		tile0 = tile0Public;
	}
	var furitenFactor = getFuritenValue(player, tile, includeOthers);

	if (furitenFactor == 0) {
		return 0;
	}

	//Less priority on Ryanmen and Bridge Wait when player is doing Toitoi
	var toitoiFactor = 1 - (isDoingToiToi(player) / 3);

	var score = 0;

	//Same tile
	score += tile0 * (tile0Public + 1) * 6 * furitenFactor * (2 - toitoiFactor);

	if (getNumberOfTilesInHand(player) == 1 || tile.type == 3) {
		return score;
	}

	var tileL3Public = getNumberOfTilesAvailable(tile.index - 3, tile.type) + getNumberOfTilesInTileArray(ownHand, tile.index - 3, tile.type);
	var tileU3Public = getNumberOfTilesAvailable(tile.index + 3, tile.type) + getNumberOfTilesInTileArray(ownHand, tile.index + 3, tile.type);

	var tileL2 = getNumberOfTilesAvailable(tile.index - 2, tile.type);
	var tileL1 = getNumberOfTilesAvailable(tile.index - 1, tile.type);
	var tileU1 = getNumberOfTilesAvailable(tile.index + 1, tile.type);
	var tileU2 = getNumberOfTilesAvailable(tile.index + 2, tile.type);

	if (!useKnowledgeOfOwnHand) {
		tileL2 += getNumberOfTilesInTileArray(ownHand, tile.index - 2, tile.type);
		tileL1 += getNumberOfTilesInTileArray(ownHand, tile.index - 1, tile.type);
		tileU1 += getNumberOfTilesInTileArray(ownHand, tile.index + 1, tile.type);
		tileU2 += getNumberOfTilesInTileArray(ownHand, tile.index + 2, tile.type);
	}

	var furitenFactorL = getFuritenValue(player, { index: tile.index - 3, type: tile.type }, includeOthers);
	var furitenFactorU = getFuritenValue(player, { index: tile.index + 3, type: tile.type }, includeOthers);

	//Ryanmen Waits
	score += (tileL1 * tileL2) * (tile0Public + tileL3Public) * furitenFactorL * toitoiFactor;
	score += (tileU1 * tileU2) * (tile0Public + tileU3Public) * furitenFactorU * toitoiFactor;

	//Bridge Wait
	score += (tileL1 * tileU1 * tile0Public) * furitenFactor * toitoiFactor;

	if (score > 200) {
		score = 200 + (Math.sqrt(score)); //add "overflow" that is worth less
	}

	score /= 1.6; //Divide by this number to normalize result (more or less)

	return score;
}

//Returns 0 if tile is 100% furiten, 1 if not. Value between 0-1 is returned if furiten tile was not called some turns ago.
function getFuritenValue(player, tile, includeOthers) {
	var danger = getMostRecentDiscardDanger(tile, player, includeOthers);
	if (danger == 0) {
		return 0;
	}
	else if (danger == 1) {
		if (calls[player].length > 0) {
			return 0.5;
		}
		return 0.95;
	}
	else if (danger == 2) {
		if (calls[player].length > 0) {
			return 0.8;
		}
	}
	return 1;
}

//Sets tile safeties for discards
function updateDiscardedTilesSafety() {
	for (var k = 1; k < getNumberOfPlayers(); k++) { //For all other players
		for (var i = 0; i < getNumberOfPlayers(); i++) { //For all discard ponds
			for (var j = 0; j < discards[i].length; j++) { //For every tile in it
				if (typeof (discards[i][j].numberOfPlayerHandChanges) == 'undefined') {
					discards[i][j].numberOfPlayerHandChanges = [0, 0, 0, 0];
				}
				if (hasPlayerHandChanged(k)) {
					if (j == discards[i].length - 1 && k < i && (k <= seat2LocalPosition(getCurrentPlayer()) || seat2LocalPosition(getCurrentPlayer()) == 0)) { //Ignore tiles by players after hand change
						continue;
					}
					discards[i][j].numberOfPlayerHandChanges[k]++;
				}
			}
		}
		rememberPlayerHand(k);
	}
}

//Pretty simple (all 0), but should work in case of crash -> count intelligently upwards
function initialDiscardedTilesSafety() {
	for (var k = 1; k < getNumberOfPlayers(); k++) { //For all other players
		for (var i = 0; i < getNumberOfPlayers(); i++) { //For all discard ponds
			for (var j = 0; j < discards[i].length; j++) { //For every tile in it
				if (typeof (discards[i][j].numberOfPlayerHandChanges) == 'undefined') {
					discards[i][j].numberOfPlayerHandChanges = [0, 0, 0, 0];
				}
				var bonus = 0;
				if (k < i && (k <= seat2LocalPosition(getCurrentPlayer()) || seat2LocalPosition(getCurrentPlayer()) == 0)) {
					bonus = 1;
				}
				discards[i][j].numberOfPlayerHandChanges[k] = discards[i].length - j - bonus;
			}
		}
	}
}

//Returns a value which indicates how important it is to keep the given tile against another player (Sakigiri something else)
function shouldKeepSafeTile(player, hand, danger) {
	if (discards[player].length < 3) { // Not many discards yet (very early) => ignore Sakigiri
		return 0;
	}
	if (getExpectedDealInValue(player) > 100) { // Obviously don't sakigiri when the player could already be in tenpai
		return 0;
	}
	if (danger > 1) { // Tile is not safe, has no value for sakigiri
		return 0;
	}

	var safeTiles = 0;
	for (let tile of hand) { // How many safe tiles do we currently have?
		if (getLastTileInDiscard(player, tile) != null || getWaitScoreForTileAndPlayer(player, tile, false) < 20) {
			safeTiles++;
		}
	}

	var sakigiri = (2 - safeTiles) * (SAKIGIRI_VALUE * 5);
	if (sakigiri < 0) { // More than 2 safe tiles: Sakigiri not necessary
		return 0;
	}
	if (getSeatWind(player) == 1) { // Player is dealer
		sakigiri *= 1.5;
	}
	return sakigiri;
}

//Check if the tile is close to another tile
function isTileCloseToOtherTile(tile, otherTile) {
	if (tile.type != 3 && tile.type == otherTile.type) {
		return tile.index >= otherTile.index - 3 && tile.index <= otherTile.index + 3;
	}
}

//Check if the tile is close to dora
function isTileCloseToDora(tile) {
	for (let d of dora) {
		var doraIndex = getHigherTileIndex(d);
		if (tile.type == 3 && d.type == 3 && tile.index == doraIndex) {
			return true;
		}
		if (tile.type != 3 && tile.type == d.type && tile.index >= doraIndex - 2 && tile.index <= doraIndex + 2) {
			return true;
		}
	}
	return false;
}
//################################
// MAIN
// Main Class, starts the bot and sets up all necessary variables.
//################################

//GUI can be re-opened by pressing + on the Numpad
if (!isDebug()) {
	initGui();
	window.onkeyup = function (e) {
		var key = e.keyCode ? e.keyCode : e.which;

		if (key == 107 || key == 65) { // Numpad + Key
			toggleGui();
		}
	}

	if (AUTORUN) {
		log("Autorun start");
		run = true;
		setInterval(preventAFK, 30000);
	}

	log(`crt mode ${AIMODE_NAME[MODE]}`);

	waitForMainLobbyLoad();
}

function toggleRun() {
	clearCrtStrategyMsg();
	if (run) {
		log("AlphaJong deactivated!");
		run = false;
		startButton.innerHTML = "Start Bot";
	}
	else if (!run) {
		log("AlphaJong activated!");
		run = true;
		startButton.innerHTML = "Stop Bot";
		main();
	}
}

function waitForMainLobbyLoad() {
	if (isInGame()) { // In case game is already ongoing after reload
		refreshRoomSelection();
		main();
		return;
	}

	if (!hasFinishedMainLobbyLoading()) { //Otherwise wait for Main Lobby to load and then search for game
		log("Waiting for Main Lobby to load...");
		showCrtActionMsg("Wait for Loading.");
		setTimeout(waitForMainLobbyLoad, 2000);
		return;
	}
	log("Main Lobby loaded!");
	refreshRoomSelection();
	startGame();
	setTimeout(main, 10000);
	log("Main Loop started.");
}

//Main Loop
function main() {
	if (!run) {
		showCrtActionMsg("Bot is not running.");
		return;
	}
	if (!isInGame()) {
		checkForEnd();
		showCrtActionMsg("Waiting for Game to start.");
		log("Game is not running, sleep 2 seconds.");
		errorCounter++;
		if (errorCounter > 90 && AUTORUN) { //3 minutes no game found -> reload page
			goToLobby();
		}
		setTimeout(main, 2000); //Check every 2 seconds if ingame
		return;
	}

	if (isDisconnect()) {
		goToLobby();
	}

	injectView();

	var operations = getOperationList(); //Get possible Operations

	if (operations == null || operations.length == 0) {
		errorCounter++;
		if (getTilesLeft() == lastTilesLeft) { //1 minute no tile drawn
			if (errorCounter > 60) {
				goToLobby();
			}
		}
		else {
			lastTilesLeft = getTilesLeft();
			errorCounter = 0;
		}
		log("Waiting for own turn, sleep 1 second.");
		clearCrtStrategyMsg();
		showCrtActionMsg("Waiting for own turn.");
		setTimeout(main, 1000);

		if (MODE === AIMODE.HELP) {
			oldOps = [];
		}

		return;
	}

	showCrtActionMsg("Calculating best move...");

	setTimeout(mainOwnTurn, 500 + (Math.random() * 500));
}

var oldOps = []
function recordPlayerOps() {
	oldOps = []
	
	let ops = getOperationList();
	for (let op of ops) { 
		oldOps.push(op.type)
	}
}

function checkPlayerOpChanged() {
	let ops = getOperationList();
	if (ops.length !== oldOps.length) {
		return true;
	}

	for (let i = 0; i < ops.length; i++) {
		if (ops[i].type !== oldOps[i]) {
			return true;
		}
	}

	return false;
}

function mainOwnTurn() {
	//HELP MODE, if player not operate, just skip
	if (MODE === AIMODE.HELP) {
		if (!checkPlayerOpChanged()) {
			setTimeout(main, 1000);
			return;
		} else {
			recordPlayerOps();
		}
	}

	setData(); //Set current state of the board to local variables

	var operations = getOperationList();

	log("##### OWN TURN #####");
	log("Debug String: " + getDebugString());
	if (getNumberOfPlayers() == 3) {
		log("Right Player Tenpai Chance: " + Number(isPlayerTenpai(1) * 100).toFixed(1) + "%, Expected Hand Value: " + Number(getExpectedHandValue(1).toFixed(0)));
		log("Left Player Tenpai Chance: " + Number(isPlayerTenpai(2) * 100).toFixed(1) + "%, Expected Hand Value: " + Number(getExpectedHandValue(2).toFixed(0)));
	}
	else {
		log("Shimocha Tenpai Chance: " + Number(isPlayerTenpai(1) * 100).toFixed(1) + "%, Expected Hand Value: " + Number(getExpectedHandValue(1).toFixed(0)));
		log("Toimen Tenpai Chance: " + Number(isPlayerTenpai(2) * 100).toFixed(1) + "%, Expected Hand Value: " + Number(getExpectedHandValue(2).toFixed(0)));
		log("Kamicha Tenpai Chance: " + Number(isPlayerTenpai(3) * 100).toFixed(1) + "%, Expected Hand Value: " + Number(getExpectedHandValue(3).toFixed(0)));
	}

	determineStrategy(); //Get the Strategy for the current situation. After calls so it does not reset folds

	isConsideringCall = true;
	for (let operation of operations) { //Priority Operations: Should be done before discard on own turn
		if (getOperationList().length == 0) {
			break;
		}
		switch (operation.type) {
			case getOperations().an_gang: //From Hand
				callAnkan(operation.combination);
				break;
			case getOperations().add_gang: //Add from Hand to Pon
				callShouminkan();
				break;
			case getOperations().zimo:
				callTsumo();
				break;
			case getOperations().rong:
				callRon();
				break;
			case getOperations().babei:
				if (callKita()) {
					setTimeout(main, 1000);
					return;
				}
				break;
			case getOperations().jiuzhongjiupai:
				callAbortiveDraw();
				break;
		}
	}

	for (let operation of operations) {
		if (getOperationList().length == 0) {
			break;
		}
		switch (operation.type) {
			case getOperations().dapai:
				isConsideringCall = false;
				discard();
				break;
			case getOperations().eat:
				callTriple(operation.combination, getOperations().eat);
				break;
			case getOperations().peng:
				callTriple(operation.combination, getOperations().peng);
				break;
			case getOperations().ming_gang: //From others
				callDaiminkan();
				break;
		}
	}

	log(" ");
	if (MODE === AIMODE.AUTO) {
		showCrtActionMsg("Own turn completed.");
	}
	setTimeout(main, 1000);
}

//Set Data from real Game
function setData(mainUpdate = true) {

	dora = getDora();

	ownHand = [];
	handTilesdValue = [];
	for (let hand of getPlayerHand()) { //Get own Hand
		ownHand.push(hand.val);
	}

	discards = [];
	for (var j = 0; j < getNumberOfPlayers(); j++) { //Get Discards for all Players
		var temp_discards = [];
		for (var i = 0; i < getDiscardsOfPlayer(j).pais.length; i++) {
			temp_discards.push(getDiscardsOfPlayer(j).pais[i].val);
		}
		if (getDiscardsOfPlayer(j).last_pai != null) {
			temp_discards.push(getDiscardsOfPlayer(j).last_pai.val);
		}
		discards.push(temp_discards);
	}
	if (mainUpdate) {
		updateDiscardedTilesSafety();
	}

	calls = [];
	for (var j = 0; j < getNumberOfPlayers(); j++) { //Get Calls for all Players
		calls.push(getCallsOfPlayer(j));
	}

	isClosed = true;
	for (let tile of calls[0]) { //Is hand closed? Also consider closed Kans
		if (tile.from != localPosition2Seat(0)) {
			isClosed = false;
			break;
		}
	}
	if (tilesLeft < getTilesLeft()) { //Check if new round/reload
		if (MODE === AIMODE.AUTO) {
			setAutoCallWin(true);
		}
		strategy = STRATEGIES.GENERAL;
		strategyAllowsCalls = true;
		initialDiscardedTilesSafety();
		riichiTiles = [null, null, null, null];
		playerDiscardSafetyList = [[], [], [], []];
		extendMJSoulFunctions();
	}

	tilesLeft = getTilesLeft();

	if (!isDebug()) {
		seatWind = getSeatWind(0);
		roundWind = getRoundWind();
	}

	updateAvailableTiles();
}

//Search for Game
function startGame() {
	if (!isInGame() && run && AUTORUN) {
		log("Searching for Game in Room " + ROOM);
		showCrtActionMsg("Searching for Game...");
		searchForGame();
	}
}

//Check if End Screen is shown
function checkForEnd() {
	if (isEndscreenShown() && AUTORUN) {
		run = false;
		setTimeout(goToLobby, 25000);
	}
}

//Reload Page to get back to lobby
function goToLobby() {
	location.reload(1);
	viewInjected = false;
}

function injectView() {
	if (viewInjected) {
		return;
	}
	viewInjected = true;

	const m = view.DesktopMgr.prototype.setChoosedPai;
	view.DesktopMgr.prototype.setChoosedPai = (e, ...rest) => {
		const r = m.call(view.DesktopMgr.Inst, e, ...rest); // render normally

		try {
			if (crtSelectTile != null && e == null) {
				showCrtChoosedTileInfo("");
			}
	
			if (handTilesdValue.length > 0 && e != null && e != crtSelectTile) {
				let tileItem = handTilesdValue.find(i => i.tile.index === e.index && i.tile.type === e.type && i.tile.dora === e.dora);
				if (tileItem != 'undefined') {
					showCrtChoosedTileInfo(getTilePriorityString(tileItem));
				}
			}
	
			crtSelectTile = e;
		} catch (error) {
			console.error(error);
		}

		return r;
	}
}

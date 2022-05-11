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
		return `${getTileEmoji(tile.type, tile.index, tile.dora)}: ${name}`;
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

const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const fs = require('fs');
var mornMemory = []

client.on("ready", () => {
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
	client.user.setActivity(`++help`);
	memoryLoader();
});

client.on("guildCreate", guild => {
	console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
	client.user.setActivity(`++help`);
});

client.on("guildDelete", guild => {
	console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
	client.user.setActivity(`++help`);
});
client.on('message', msg => {
	if(msg.author.bot) return;
	if(msg.channel.type != 'text') {
		console.log('>>'+msg.author.username+'>>: '+msg.content);
	}
	wordCheck(msg);
	if(msg.content.indexOf(config.prefix) !== 0) return;
	
	const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	
	switch(command) {
		case "master":
			msg.channel.send("My master is tacosensei_");
			break
			
		case "help":
			var helpmsg = config.commandString
			msg.channel.send(helpmsg)
			break
			
		case "helpmedaddy":
			msg.reply("Perish")
			break
			
		case "mrank":
			let output = "```CURRENT STANDINGS\n\n\n"
			let rankings = calculateTotalScores()
			rankings.forEach((person) => {
				output += ("    " + person.name + "   " + person.total_score + "\n")
			})
			output += "```"
			msg.reply(output)
			break

		case "savemrank":
			mornBaseSave()
			var save = config.saveResponses
			var saveResponse =save[Math.floor(Math.random()*save.length)]
			msg.reply(saveResponse)
			break
	}
});



function wordCheck(msg) {
	goodCheck(msg);
	if(msg.channel.type == 'text') {
		var userRoles = msg.member.roles.array();
		for(i = 0; i < userRoles.length; i++) {
			if(userRoles[i].name == "Taco Waifu") {
				console.log("QUEEN DETECTED");
				return;
			}
		}
	}
	mornCheck(msg);
}

function mornCheck(msg) {
	var msgCont = msg.content.toLowerCase();
	msgCont = msgCont.replace(/(<{1}[:][\w]+[:][\w]+>)+/g, '');
	msgCont = msgCont.replace(/[^0-9a-z]/gi, '');
	var mornings = config.mornings;
	for(i = 0; i < mornings.length; i++) {
		if(msgCont == mornings[i]) {
			var datetime = new Date();
			var hour = datetime.getHours();
			var minutes = datetime.getMinutes();
			if(hour >= 12) {
				msg.reply("morning ended " + ((hour - 12) * 60 + minutes) + " minutes ago on this server.");
				var tardy = config.tardyResponses;
				var tardyResponse = tardy[Math.floor(Math.random()*tardy.length)];
				msg.channel.send(tardyResponse);
				mornBaseAdd(msg.author.username, -1);
			}
			else {
				mornBaseAdd(msg.author.username, 1);
			}
			return;
		}
	}	
}

function goodCheck(msg) {
	var msgCont = msg.content.toLowerCase();
	msgCont = msgCont.replace(/[^0-9a-z]/gi, '');
	switch(msgCont) {
		case "goodbot":
			msg.channel.send(":)");
			break;
		case "badbot":
			msg.channel.send(":(");
			break;
		case "averagebot":
			msg.channel.send(":|");
			break;
	}
}

function mornBaseAdd(user, result) {
	mornMemory.push([user, result]);
}
function mornBaseSave() {
	fs.writeFile('database.txt', '');
	for(i = 0; i < mornMemory.length; i++) {
		fs.appendFile('database.txt', mornMemory[i][0] + "," + mornMemory[i][1] + "\n");
	}
}

function getUniquePlayerNames(data) {
	let playerNames = data.map((entry) => {
		return entry[0] //["name", score] => ["name"]
	})
	return [...new Set(playerNames)] //["Dave", "Dave"] => ["Dave"]
}

function calculatePlayerScores(data, players) {
	return players.map((playerName) => {
		let playerScores = data.filter((entry) => {
			return entry[0] == playerName //["Dave", "Sally", "Chris", "Jeff", "Dave"] => ["Dave", "Dave"]
		})
		let playerScore = playerScores.reduce((acc, scoreEntry) => {
			return acc + parseInt(scoreEntry[1]) //["Dave", 1], ["Dave", 1] => ["Dave", 2]
		}, 0)
		
		return { name: playerName, total_score: playerScore } //["Dave", 2] => [name: "Dave", score: 2]
	})
}

function calculateTotalScores() {
	
	let playerNames = getUniquePlayerNames(mornMemory) //Get all unique names
	let result = calculatePlayerScores(mornMemory, playerNames) //Get all objects 
	result.sort(function(a, b) {
		return b.total_score - a.total_score;
	})
	return result
}

function getPlayerScore(name) {
	nameArray = [name]
	return calculatePlayerScores(mornMemory, nameArray).total_score
}

function memoryLoader() {

	var lineReader = require('readline').createInterface({
		input: require('fs').createReadStream('database.txt')
	})
	lineReader.on('line', function (line) {
		var incoming = line.split(",")
		mornMemory.push([incoming[0], parseInt(incoming[1])]) //Collect text data and put it into memory
	})
}

client.login(config.token);    
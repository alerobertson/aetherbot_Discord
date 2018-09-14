const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")
const fs = require('fs')

//The active database for scoring users as they say Good Morning
var mornMemory = []
var userTime = []

client.on("ready", () => {
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
	client.user.setActivity(`++help`)
	memoryLoader()
});

client.on("guildCreate", guild => {
	console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`)
	client.user.setActivity(`++help`)
});

client.on("guildDelete", guild => {
	console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`)
	client.user.setActivity(`++help`)
});

//Every time a message is sent in a place AetherBot can read
client.on('message', msg => {
	
	//Don't read messages from a bot, including AetherBot
	if(msg.author.bot) return 
	
	//Format messages outside of guilds (Direct/Group) as: >>username>>: message
	//Mainly for debugging
	if(msg.channel.type != 'text') {
		console.log('>>'+msg.author.username+'>>: '+msg.content)
	}

	wordCheck(msg)
});



function wordCheck(msg) {
	//Check for goodbot/badbot
	goodCheck(msg)
	
	//Check if someone is saying good morning and reward/punish
	mornCheck(msg)
	
	//Check for commands (++command)
	commandCheck(msg)
}

function commandCheck(msg) {
	//Message must start with our defined prefix
	if(msg.content.indexOf(config.prefix) !== 0) return
	
	//Remove prefix and case down
	const args = msg.content.slice(config.prefix.length).trim().split(/ +/g)
	const command = args.shift().toLowerCase()
	
	switch(command) {
		case "master":
		
			msg.channel.send("My master is tacosensei_")
			break
			
		case "help":
		
			var helpmsgs = config.commands
			var response = "```"
			helpmsgs.forEach((help) => {
				response += help
			})
			response += "```"
			msg.reply(response)
			break
			
		case "mrank":
			//Organize data in memory and show it in a simple table
			let output = "```CURRENT STANDINGS\n\n\n"
			let rankings = calculateTotalScores()
			rankings.forEach((person) => {
				output += ("    " + person.name + " ".repeat(18 - person.name.length) + person.total_score + "\n")
			})
			output += "```"
			
			msg.reply(output)
			break

		case "save":
		
			mornBaseSave()
			var save = config.saveResponses
			var saveResponse =save[Math.floor(Math.random()*save.length)]
			
			msg.reply(saveResponse)
			break
		case "mytimezone":
			var userTimeNames = getUniquePlayerNames(userTime)
	
			if(userTimeNames.includes(msg.author.username)) {
				var index = userTimeNames.indexOf(msg.author.username)
				msg.reply("Your current time on record is " + getModifiedDateString(userTime[index][1]))
			}
			else {
				msg.reply("Your current time on record is " + getModifiedDateString(0))
			}
	}
	if(command.substring(0, 8) == "timezone") {
		subCommand = command.slice(8)
		if(!isNaN(subCommand)) {
			var timeZone = parseInt(subCommand)
			timeZoneAdd(msg.author.username, timeZone)
			
			msg.reply("Setting your time to " + getModifiedDateString(timeZone)) 
		}
		else {
			msg.reply("I can't parse that! Do like this: ``" + config.prefix +
				"timezone+7`` or ``" + config.prefix +"timezone-5``")
		}
	}
}

function mornCheck(msg) {
//When your friends try to be cheeky and add symbols and spaces to try and trick the bot
	var msgCont = msg.content.toLowerCase()
	//This line removes Discord custom emotes
	msgCont = msgCont.replace(/(<{1}[:][\w]+[:][\w]+>)+/g, '')
	//Basically remove anything thats not 0-9, a-z
	msgCont = msgCont.replace(/[^0-9a-z]/gi, '')
	
	//Load our definitions of Good Morning
	var mornings = config.mornings;
	
	
	if(mornings.includes(msgCont)) {
		//This uses the timezone of the server the bot is running on
		//Consider changing that timezone if you and the users are from the same timezone
		var datetime = new Date()
		var hour = datetime.getHours()
		var minutes = datetime.getMinutes()
		
		//Consider userTime[] local database
		var timeDisplacement = calculateTimeDisplacement(msg.author.username)
		
		
		if(hour >= 12 + timeDisplacement) {
			msg.reply("morning ended " + ((hour - 12) * 60 + minutes) + " minutes ago.")
			var tardy = config.tardyResponses
			var tardyResponse = tardy[Math.floor(Math.random()*tardy.length)]
			msg.channel.send(tardyResponse)
			mornBaseAdd(msg.author.username, -1)
		}
		else {
			mornBaseAdd(msg.author.username, 1)
		}
		return;
	}
}

function calculateTimeDisplacement(user) {
	var userTimeNames = getUniquePlayerNames(userTime)
	
	if(userTimeNames.includes(user)) {
		var index = userTimeNames.indexOf(user)
		return userTime[index][1]
	}
	else {
		return 0
	}
}

function getModifiedDateString(modifier) {
	currentDate = new Date()
	currentMinutes = currentDate.getMinutes().toString()
	currentHour = currentDate.getHours()
	
	if(currentDate.getMinutes() < 10) {
		currentMinutes = "0" + currentMinutes
	}
	
	return (currentHour + modifier) + ":" + currentMinutes
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
	mornMemory.push([user, result])
}
function timeZoneAdd(user, result) {
	var userTimeNames = getUniquePlayerNames(userTime)
	console.log("userTimeNames.includes(user): " + userTimeNames.includes(user))
	if(userTimeNames.includes(user)) {
		var index = userTimeNames.indexOf(user)
		userTime[index][1] = result
	}
	else {
		userTime.push([user, result])
	}
}
function mornBaseSave() {
	fs.writeFile('database.txt', '');
	for(i = 0; i < mornMemory.length; i++) {
		fs.appendFile('database.txt', mornMemory[i][0] + "," + mornMemory[i][1] + "\n");
	}
	
	fs.writeFile('timezones.txt', '');
	for(i = 0; i < userTime.length; i++) {
		fs.appendFile('timezones.txt', userTime[i][0] + "," + userTime[i][1] + "\n");
	}
}


//This function doubles as a way to turn the 2-Dimensional arrays into 1-Dimensional
//Primarily it is used to get all usernames on record
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
	
	var lineReader = require('readline').createInterface({
		input: require('fs').createReadStream('timezones.txt')
	})
	lineReader.on('line', function (line) {
		var incoming = line.split(",")
		userTime.push([incoming[0], parseInt(incoming[1])]) //Collect text data and put it into memory
	})
}

client.login(config.token);    
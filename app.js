const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")
const ds = require("./datastore.js")
 
module.exports = {
	wordCheck: wordCheck
}

// skip logging in to discord api when running tests
if(!process.env.TEST) client.login(config.token) 

client.on("ready", () => {
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
	client.user.setActivity(`++help`)
	ds.load_from_disk()
	setInterval(ds.write_to_disk, 1.08e+7) // every 3 hours
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
	const args = msg.content.slice(config.prefix.length).trim()
	const command = args.toLowerCase()
	
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
		
			ds.write_to_disk()
			var save = config.saveResponses
			var saveResponse = save[Math.floor(Math.random()*save.length)]
			
			msg.reply(saveResponse)
			break
		case "load":
			if(msg.author.username != "tacosensei_") {
				return
			}
		
			ds.load_from_disk()
			msg.reply("Refreshing my memory")
			break
			
		case "mytimezone":
			var userTimeNames = getUniquePlayerNames(ds.timezones)
	
			if(userTimeNames.includes(msg.author.username)) {
				var index = userTimeNames.indexOf(msg.author.username)
				msg.reply("Your current time on record is " + getModifiedDateString(ds.timezones[index][1]))
			}
			else {
				msg.reply("Your current time on record is " + getModifiedDateString(0))
			}
			break
	}
	if(args.substring(0, 4) == "give" && msg.author.tag == "tacosensei_#3763") {
		var user = args.slice(4).slice(0, -2)
		var amount = args.slice(-2)
		ds.add_entry(user, parseInt(amount))
	
		msg.reply("Yes sir!")
	}
	if(command.substring(0, 8) == "timezone") {
		subCommand = command.slice(8)
		subCommand = subCommand.trim()
		if(!isNaN(subCommand)) {
			var timeZone = parseInt(subCommand)

			let userTimeNames = getUniquePlayerNames(ds.timezones)
			if (userTimeNames.includes(msg.author.username)) {
				let index = userTimeNames.indexOf(msg.author.username)
				ds.update_timezone_entry(timeZone, index)
			}
			else {
				ds.add_timezone_entry(msg.author.username, timeZone)
			}
			
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
		var newHour = (hour+timeDisplacement+24) % 24
		
		if(newHour >= 12) {
			msg.reply("morning ended " + ((newHour - 12) * 60 + minutes) + " minutes ago.")
			var tardy = config.tardyResponses
			var tardyResponse = tardy[Math.floor(Math.random()*tardy.length)]
			msg.channel.send(tardyResponse)
			ds.add_entry(msg.author.username, -1)
		}
		else {
			ds.add_entry(msg.author.username, 1)
		}
		return;
	}
}

function calculateTimeDisplacement(user) {
	var userTimeNames = getUniquePlayerNames(ds.timezones)
	
	if(userTimeNames.includes(user)) {
		var index = userTimeNames.indexOf(user)
		var modifier = ds.timezones[index][1]
		return modifier
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
	currentHour = (currentHour + modifier + 24) % 24
	
	return (currentHour) + ":" + currentMinutes
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
	let playerNames = getUniquePlayerNames(ds.morning_log) //Get all unique names
	let result = calculatePlayerScores(ds.morning_log, playerNames) //Get all objects 
	result.sort(function(a, b) {
		return b.total_score - a.total_score;
	})
	return result
}

function getPlayerScore(name) {
	nameArray = [name]
	return calculatePlayerScores(ds.morning_log, nameArray).total_score
} 

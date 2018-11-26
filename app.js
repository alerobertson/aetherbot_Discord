const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")
const ds = require("./datastore.js")

var howdyVar = 1
 
module.exports = {
	wordCheck: wordCheck
}

// skip logging in to discord api when running tests
if(!process.env.TEST) client.login(config.token) 

client.on("ready", () => {
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
	client.user.setActivity(`++help`)
	ds.load_from_disk()
	setInterval(ds.write_to_disk, 1.8e+6) // every 30 minutes
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

//Every time a message is edited in a place AetherBot can read
client.on('messageUpdate', (msgOld, msgNew) => {
	//Don't read messages from a bot, including AetherBot
	if(msgNew.author.bot) return 
	
	//Format messages outside of guilds (Direct/Group) as: >>username>>: message
	//Mainly for debugging
	if(msgNew.channel.type != 'text') {
		console.log('>>'+msgNew.author.username+'>>: '+msgNew.content)
	}

	wordCheck(msgNew)
});

function wordCheck(msg) {
	//Check for goodbot/badbot
	goodCheck(msg)
	
	//Check if someone is saying good morning and reward/punish
	mornCheck(msg)
	
	//Howdy
	howdy(msg)
	
	//Check for commands (++command)
	commandCheck(msg)
}

function howdy(msg) {
	var msgCont = msg.content.toLowerCase()
	msgCont = msgCont.replace(/(<{1}[:][\w]+[:][\w]+>)+/g, '')
	msgCont = msgCont.replace(/[^0-9a-z]/gi, '')
	if(msgCont == 'howdy') {
		howdyVar++
		if(howdyVar % 10 == 0) {
			msg.reply("Woah there! That's the " + howdyVar + "th howdy!")
		}
	}
}

function streakCheck(username) {
	
}

function yesterdayPoint(username) {
	let current_day = ds.day_of_year(new Date())
	
	let previous_log = ds.morning_log.find(function(entry) {
		return entry[0] == username && entry[2] == current_day - 1;
	})
	
	if(previous_log) {
		return previous_log[1]
	}
	else {
		return 0
	}
}

function commandCheck(msg) {
	//Message must start with our defined prefix
	if(msg.content.indexOf(config.prefix) !== 0) return
	
	//Remove prefix and case down
	const args = msg.content.slice(config.prefix.length).trim()
	const command = args.toLowerCase()
	
	console.log('>' + msg.author.username +'>: ' + config.prefix + args)
	
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
			output += "    Username          Score    Honor\n\n"
			let rankings = calculateTotalScores()
			rankings.forEach((person) => {
				output += ("    " + person.name + " ".repeat(18 - person.name.length) + person.total_score +
					" ".repeat(9 - person.total_score.toString().length) + countEntries(ds.morning_log, person.name) + "\n")
			})
			output += "```"
			
			msg.reply(output)
			break

		/*case "save":
		
			ds.write_to_disk()
			var save = config.saveResponses
			var saveResponse = save[Math.floor(Math.random()*save.length)]
			
			msg.reply(saveResponse)
			break
		*/
		/*case "load":
			if(msg.author.username != "tacosensei_") {
				return
			}
			ds.load_from_disk()

			msg.reply("Refreshing my memory")
			break
		*/	
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
		let current_day = ds.day_of_year(new Date())
		
		ds.add_entry(user, parseInt(amount), current_day)
	
		msg.reply("Yes sir!")
	}
	if(command.substring(0, 8) == "timezone") {
		subCommand = command.slice(8)
		subCommand = subCommand.trim()
		if(!isNaN(subCommand) && subCommand.length > 0) {
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
	
	
	if(mornings.includes(msgCont) && newDay(msg.author.username)) {
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
			ds.add_entry(msg.author.username, -1, ds.day_of_year(new Date()))
		}
		else {

			if(yesterdayPoint(msg.author.username) == -1) {
				msg.reply("good morning! I knew I could count on you!")
				ds.add_entry(msg.author.username, 2, ds.day_of_year(new Date()))
			}
			else {
				ds.add_entry(msg.author.username, 1, ds.day_of_year(new Date()))
			}
		}
		return;
	}
}

function newDay(user) {
	let current_day = ds.day_of_year(new Date())
	
	return !ds.morning_log.find((entry) => entry[0] == user && entry[2] == current_day)
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

function countEntries(data, name) {
	let count = 0
	data.forEach((entry) => {
		if(entry[0] == name) {
			count += 1
		}
	})
	return count
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

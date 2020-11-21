/* Author: Alexander Robertson 2018
 *
 * AetherBot_Discord
 *
 * Purpose: A Discord bot personal project. For use with the Discord messaging app.
 * Involves a leader board for people saying good morning at appropriate hours.
 * Uses Discord.JS
*/
const Discord = require("discord.js")
const client = new Discord.Client()
const config = require("./config.json")
const https = require('https')
var CronJob = require('cron').CronJob
console.log("Starting..")
client.login(config.token)

const api_server = require('./web/api.js')
api_server.start('/api')

// MYSQL statement wrapper
const db = require("./database.js")

const wk = require('./services/wanikani.js')

var job = new CronJob('0 9 * * *', () => {
	getMotd().then((quote) => {
		getMotdChannels().then((results) => {
			results.forEach((result) => {
				let channel = client.channels.get(result.channel)
				channel.send(quote)
			})
		})
	})
},true,'America/Toronto')

client.on("ready", () => {
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`)
	client.user.setActivity(`++help`)
	console.log(datetimeString(new Date()))
	db.createConnection()
})

client.on("guildCreate", guild => {
	console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`)
	client.user.setActivity(`++help`)
})

client.on("guildDelete", guild => {
	console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`)
	client.user.setActivity(`++help`)
})

// Every time a message is sent in a place AetherBot can read
client.on('message', msg => {
	// Don't read messages from bots
	if(msg.author.bot) return

	// Only read messages from text channels
	if(msg.channel.type != 'text') return

	wordCheck(msg)
})

// Every time a message is edited in a place AetherBot can read
client.on('messageUpdate', (msgOld, msgNew) => {
	// Don't read messages from bots
	if(msgNew.author.bot) return

	// Only read messages from text channels
	if(msgNew.channel.type != 'text') return

	wordCheck(msgNew)
})

function wordCheck(msg) {
	// Check for goodbot/badbot
	goodCheck(msg)

	// Check if someone is saying good morning and reward/punish
	mornCheck(msg)

	//Check for woke
	woke(msg)

	// Check for commands (++command)
	commandCheck(msg)

}

function commandCheck(msg) {
	// Message must start with our defined prefix
	if(msg.content.indexOf(config.prefix) !== 0) return

	// Remove prefix and case down
	const args = msg.content.slice(config.prefix.length).trim()
	const command = args.toLowerCase()

	// Log use of commands
	console.log('>' + msg.author.username +'>: ' + config.prefix + args)


	// Each simple command has a case -- Complex commands listed below
	switch(command) {
		case "master":
			msg.channel.send("My master is tacosensei_")
			break

		// Output the help messages from the config file
		case "help":
			var helpmsgs = config.commands
			var response = "```"
			helpmsgs.forEach((help) => {
				response += help
			})
			response += "```"
			msg.reply(response)
			break

		// Query for morning_log rankings
		// Only returns current year and current server
		case "mrank":
			getSumOfYear(msg.guild.id).then((result) => {
				display(msg, result)
			})
			break

		case "split":
			getSumOfSplit(msg.guild.id).then((result) => {
				display(msg, result)
			})
			break

		case "alltime":
			getSumOfAlltime(msg.guild.id).then((result) => {
				display(msg, result)
			})
			break

		case "wkreview":
			waniGetTokens().then((response) => {
				waniGetData(response).then((data) => {
					waniDisplay(msg, data)
				})
			})
			break

		// Returns a time stamp for the current time (for that user)
		case "mytimezone":
			getUserDate(msg.author.tag).then((userDate) => {
				msg.reply("Your time right now: " + datetimeString(userDate))
			})
			break
		case "motd":
			//addMotdChannel(msg.channel.id)
			break
		case "quote":
			getMotd().then((quote) => {
				msg.channel.send(quote)
			})
			break
	}

	// Complex commands

	// Adds or subtracts hours relative to UTC-5 (Eastern) depending on user preference
	// Most users are UTC-5, but will consider changing default to UTC-0
	if(command.substring(0, 8) == "timezone") {
		subCommand = command.slice(8)
		subCommand = subCommand.trim()
		if(!isNaN(subCommand) && subCommand.length > 0) {
			var timeZone = parseInt(subCommand)
			userExists(msg.author.tag, 'timezone').then((result) => {
				if(result) {
					db.query("UPDATE timezone SET offset = " + timeZone + " WHERE username = '" + msg.author.tag + "';")
				}
				else {
					db.query("INSERT INTO timezone (username, offset) VALUES ('" + msg.author.tag + "', " + timeZone + ");")
				}
			})
			let d = new Date()
			d.setHours(d.getHours() + timeZone)
			msg.reply("Setting your time to " + timeString(d))
		}
		else {
			msg.reply("I can't parse that! Do like this: ``" + config.prefix +
				"timezone+7`` or ``" + config.prefix +"timezone-5``")
		}
	}
}

function display(msg, result) {
	let output = "```CURRENT STANDINGS\n\n\n"
	output += "    Username          Score    Honor\n\n"
	result.forEach((person) => {
		output += ("    " + person.username.slice(0,-5) + " ".repeat(18 - person.username.slice(0,-5).length) + person.score +
			" ".repeat(9 - person.score.toString().length) + person.honor + "\n")
	})
	output += "```"
	msg.channel.send(output)
}

// Check for "good morning"
function mornCheck(msg) {
	let str = msg.content.toLowerCase()
	const regex = /\b(\S*morn\S*|\S*ohayo\S*|\S*ohio\S*)\b/gm;

	if(regex.exec(str) == null) {
		return
	}

	// User must not already have an entry today
	entryToday(msg.author.tag).then((result) => {
		if(!result) {

			// Consider the user's timezone
			getUserDate(msg.author.tag).then((d) => {

				// If after 12:00 relative to their timezone
				if(d.getHours() >= 12) {
					var tardy = config.tardyResponses
					var tardyResponse = tardy[Math.floor(Math.random()*tardy.length)]

					// Query INSERT INTO entries
					newEntry(msg.author.tag, msg.guild.id, datetimeString(d), '-1', '1')
					msg.channel.send(tardyResponse)
				}
				else {

					// User gets redemption if they have negative score from the previous day
					scoreYesterday(msg.author.tag).then((lastScore) => {
						if(lastScore < 0) {

							// Query INSERT INTO entries
							newEntry(msg.author.tag, msg.guild.id, datetimeString(d), '2', '1')
							var redemption = config.redemptionResponses
							var redemptionResponse = redemption[Math.floor(Math.random()*redemption.length)]
							msg.channel.send(redemptionResponse)
						}
						else {
							// Query INSERT INTO entries
							newEntry(msg.author.tag, msg.guild.id, datetimeString(d), '1', '1')
						}
					})
				}
			})
		}
	})
}

// Query INSERT INTO entries
function newEntry(username, server, datetime, score, honor) {
	console.log("Just called newEntry")
	db.query("INSERT INTO entries (username, server, datetime, score, honor) VALUES ('" + username +
		"', '" + server + "', '" + datetime + "', " + score + ", " + honor + ");")
}

// Query SELECT * FROM table WHERE username = 'username'
function userExists(username, table) {
	return new Promise((resolve, reject) => {
		db.query("SELECT * FROM " + table + " WHERE username = '" + username + "';").then((result) => {
			console.log(result)
			resolve(result.length != 0)
		})
	})
}

// Query SELECT * FROM entries WHERE username = 'username' AND CONVERT(datetime, date) = '(today)'
// Return true if user has an entry today
function entryToday(username) {
	return new Promise((resolve, reject) => {
		getUserDate(username).then((userDate) => {
			db.query("SELECT * FROM entries WHERE username = '" + username + "' AND CONVERT(datetime, date) = '" +
				dateString(userDate) + "';").then((result) => {
				resolve(result.length != 0)
			})
		})
	})
}

// Query SELECT SUM(score) AS num FROM entries WHERE username = 'username' AND CONVERT(datetime, date) = '(yesterday)'
// Return the score from previous day
function scoreYesterday(username) {
	return new Promise((resolve, reject) => {
		getUserDate(username).then((userDate) => {
			userDate.setDate(userDate.getDate() - 1)
			db.query("SELECT SUM(score) AS num FROM entries WHERE username = '" + username + "' AND CONVERT(datetime, date) = '" +
				dateString(userDate) + "';").then((result) => {
					if(result[0].num) {
						resolve(result[0].num)
					}
					else {
						resolve(0)
					}
			})
		})
	})
}

// Query SELECT offset FROM timezone WHERE username = 'username'
// Return the offset INT
function getTimezoneOffset(username) {
	return new Promise((resolve, reject) => {
		db.query("SELECT offset FROM timezone WHERE username = '" + username + "';").then((result) => {
			if(result.length != 0) {
				console.log(result[0].offset)
				resolve(result[0].offset)
			}
			else {
				console.log("User " + username + " has no offset recorded!")
				resolve(0)
			}
		})
	})
}

function getCurrentSplit() {
	let m = getMonth()
	let month_one
	let month_two
	if(m < 3) {
		month_one = 1
		month_two = 3
	}
	else if(m < 6) {
		month_one = 4
		month_two = 6
	}
	else if(m < 9) {
		month_one = 7
		month_two = 9
	}
	else {
		month_one = 10
		month_two = 12
	}

	return ('month(datetime) >= ' + month_one + ' AND month(datetime) <= ' + month_two)

}

// Query SELECT SUM(column) AS num FROM table WHERE username = 'username'
// Returns the sum of a column for a user from a table

// Function currently not in use
function getSumOfUser(username, column, table) {
	return new Promise((resolve, reject) => {
		db.query("SELECT SUM(" + column + ") AS num FROM " + table + " WHERE username = '" + username + "';").then((result) => {
			resolve(result[0].num)
		})
	})
}

// Returns an array of results, based on which quarter of the year is now
function getSumOfSplit(server) {
	return new Promise((resolve, reject) => {
		db.query("SELECT username, SUM(score) AS 'score', SUM(honor) AS 'honor' FROM entries WHERE server = '" + server + "'" +
			" AND year(datetime) = '" + getYear() + "' AND " + getCurrentSplit() + " GROUP BY username ORDER BY score DESC, honor DESC, username ASC;").then((result) => {
				resolve(result)
			})
	})
}

// Query SELECT username, SUM(score) AS 'score', SUM(honor) AS 'honor' FROM entries WHERE server = 'server' AND
// year(datetime) = 'current_year' GROUP BY username

// Returns an array of results
function getSumOfAlltime(server) {
	return new Promise((resolve, reject) => {
		db.query("SELECT username, SUM(score) AS 'score', SUM(honor) AS 'honor' FROM entries WHERE server = '" + server + "'" +
			" GROUP BY username ORDER BY score DESC, honor DESC, username ASC;").then((result) => {
				resolve(result)
			})
	})
}

// Returns an array of results, based on current year
function getSumOfYear(server) {
	return new Promise((resolve, reject) => {
		db.query("SELECT username, SUM(score) AS 'score', SUM(honor) AS 'honor' FROM entries WHERE server = '" + server + "'" +
			" AND year(datetime) = '" + getYear() + "' GROUP BY username ORDER BY score DESC, honor DESC, username ASC;").then((result) => {
				resolve(result)
			})
	})
}

// Creates a Date object based on the user's timezone on record
function getUserDate(username) {
	return new Promise((resolve, reject) => {
		getTimezoneOffset(username).then((offset) => {
			let d = new Date()
			d.setHours(d.getHours() + offset)
			resolve(d)
		})
	})

}
// Creates a relevant string for the Date object
// YYYY-MM-DD HH-MM-SS
function datetimeString(d) {
	return dateString(d) + ' ' + timeString(d)
}

// Creates a relevant string for the Date object
// YYYY-MM-DD
function dateString(d) {
	let mm = d.getMonth() + 1
	if(mm < 10) { mm = "0" + mm }
	let dd = d.getDate()
	if(dd < 10) { dd = "0" + dd }
	return d.getFullYear() + "-" + mm + "-" + dd
}

// Creates a relevant string for the Date object
// HH-MM-SS
function timeString(d) {
	let hh = d.getHours()
	if(hh < 10) { hh = "0" + hh }
	let mm = d.getMinutes()
	if(mm < 10) { mm = "0" + mm }
	let ss = d.getSeconds()
	if(ss < 10) { ss = "0" + ss }
	return hh + ':' + mm + ':' + ss
}

// Current year UTC-5
function getYear() {
	let d = new Date()
	return d.getFullYear()
}

function getMonth() {
	let d = new Date()
	return d.getMonth()
}

// No real use, just for fun
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

function addMotdChannel(channel_id) {
	db.query(`INSERT INTO motd (channel) VALUES (${channel_id})`)
}

function getMotdChannels() {
	return new Promise((resolve, reject) => {
		db.query(`SELECT channel FROM motd`).then((response) => {
			resolve(response)
		})
	})
}

function getMotd() {
	return new Promise((resolve, reject) => {
		let day_one = new Date("December 18, 2019")
		let day = Math.floor((new Date().getTime() - day_one.getTime()) / (1000 * 3600 * 24))
		let options = {
			hostname: 'api.paperquotes.com',
			path: `/apiv1/quotes/?language=en&limit=1&offset=${day}&tags=motivation`,
			headers: {
				Authorization: `Token ${config.paperquotesToken}`
			}
		}
		https.get(options, (response) => {
			var result = ''
			response.on('data', (chunk) => {
				result += chunk;
			});

			response.on('end', () => {
				let paperquote = JSON.parse(result)
				let quote = paperquote.results[0].quote
				resolve(quote)
			});
		})
	})
}

function woke(msg){
	msgCont = msg.content.toLowerCase()
	var response = ["Well done my child! Now grasp the day by the horns and hold on.", "Very Good, be sure to stretch today, it will make the stairs much easier.", "Incredible, be sure to eat some yummy food before enduring the rest of your day. Food is fuel"];

	if (msgCont == "i am woke" || msgCont == "i am up" || msgCont == "i am out of bed"){
		msg.channel.send(response[Math.floor(Math.random() * response.length)])
	}
	return;
}

// WaniKani

async function waniAddToken(username, api_token) {
	return db.query(`INSERT INTO wanikani (username, api_token) VALUES (${username}, ${api_token})`)
}

async function waniGetTokens() {
	return db.query(`SELECT * FROM wanikani`).then((response) => {
		return response
	})
}

function waniDisplay(msg, result) {
	let output = "```\n"
	output += "Username          To Do    Completed\n\n"
	result.forEach((person) => {
		output += ("" + person.username.slice(0,-5) + " ".repeat(18 - person.username.slice(0,-5).length) + person.to_do +
			" ".repeat(9 - person.to_do.toString().length) + person.completed + "\n")
	})
	output += "```"
	msg.channel.send(output)
}

function waniGetData(users) {
	let promises = []
	let d = new Date()
	let updated_after = dateString(d) + 'T00:00:00-03:00'

	users.forEach((user) => {
		promises.push(new Promise((resolve, reject) => {
			wk.fetchSummary(user.api_token).then((summary) => {
				wk.fetchReviews(user.api_token, updated_after).then((reviews) => {
					resolve({
						username: user.username,
						to_do: summary.data.reviews[0].subject_ids.length,
						completed: reviews.total_count
					})
				})
			})
		}))
	})
	return Promise.all(promises).then((data) => {
		return data
	})
}

module.exports = {
	wanikani: {
		getTokens: waniGetTokens,
		getData: waniGetData
	}
}
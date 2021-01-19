const db = require('../../mysql')
const paperquotes = require('../../paperquotes')
var CronJob = require('cron').CronJob

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

module.exports = {
    fetchChannels: getMotdChannels,
    addChannel: addMotdChannel,
    init: () => {
        var job = new CronJob('0 9 * * *', () => {
            paperquotes.fetchQuote(1, 'motivation').then((result) => {
                let quote = result[0].quote
                getMotdChannels().then((results) => {
                    results.forEach((result) => {
                        let channel = client.channels.get(result.channel)
                        channel.send(quote)
                    })
                })
            })
        },true,'America/Toronto')
    }
}
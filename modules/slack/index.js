const axios = require('axios')
const config = require('./config.json')
const paperquotes = require('../paperquotes')

var CronJob = require('cron').CronJob

async function postRequest(url, message) {
    let options = {
        method: 'post',
        url: url,
        data: {
            'motd': message
        }
    }

    return axios(options).then((response) => {
        return
    }).catch((error) => {
        return {}
    })
}

module.exports = {
    postMessage: postRequest,
    init: () => {
        var webhooks = config.webhooks
        webhooks.forEach((webhook) => {
        	var job = new CronJob('0 9 * * *', () => {
           		paperquotes.fetchQuote(1, 'motivation').then((result) => {
               	 		let quote = result[0].quote
                		postRequest(webhook, quote)
            		})
        	},true,'America/Toronto')
	})
    }
}

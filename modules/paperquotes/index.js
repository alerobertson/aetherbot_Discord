const axios = require('axios')
const db = require("../mysql/index.js")
const config = require('./config.json')

async function getRequest(url, api_token) {
    var headers = {
        'Authorization': 'Token ' + api_token
    }
    return axios.get(url, { headers: headers }).then((response) => {
        return response.data.results
    }).catch((error) => {
		console.log(error)
        return {}
    })
}

module.exports = {
	fetchQuote: async (limit, tag, start_date = config.start_date) => {
		var day_one = new Date(start_date)
		var day = Math.floor((new Date().getTime() - day_one.getTime()) / (1000 * 3600 * 24))
		var url = `https://api.paperquotes.com/apiv1/quotes/?lang=en&limit=${limit}&offset=${day}&tags=${tag}&curated=1`
		return getRequest(url, config.token)
    }
}
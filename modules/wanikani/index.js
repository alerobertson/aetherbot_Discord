const axios = require('axios')
const db = require('../mysql')

function dateString(d) {
	let mm = d.getMonth() + 1
	if(mm < 10) { mm = "0" + mm }
	let dd = d.getDate()
	if(dd < 10) { dd = "0" + dd }
	return d.getFullYear() + "-" + mm + "-" + dd
}

async function getRequest(url, api_token) {
    var headers = {
        'Authorization': 'Bearer ' + api_token
    }
    return axios.get(url, { headers: headers }).then((response) => {
        return response.data
    }).catch((error) => {
        return {}
    })
}

async function fetchSummary(api_token) {
    if(!api_token) { return {} }
    return getRequest('https://api.wanikani.com/v2/summary', api_token)
}

async function fetchReviews(api_token, updated_after) {
    var url = 'https://api.wanikani.com/v2/reviews?'
    if(updated_after) { url += `updated_after=${updated_after}` }
    return getRequest(url, api_token)
}

async function addToken(username, api_token) {
	return db.query(`INSERT INTO wanikani (username, api_token) VALUES (${username}, ${api_token})`)
}

async function getTokens() {
	return db.query(`SELECT * FROM wanikani`).then((response) => {
		return response
	})
}

function assembleData(users) {
	let promises = []
	let d = new Date()
	let updated_after = dateString(d) + 'T00:00:00-03:00'

	users.forEach((user) => {
		promises.push(new Promise((resolve, reject) => {
			fetchSummary(user.api_token).then((summary) => {
				fetchReviews(user.api_token, updated_after).then((reviews) => {
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
    getSummary: async () => {
        var tokens = await getTokens()
        return assembleData(tokens)
    },
    addToken: addToken
}
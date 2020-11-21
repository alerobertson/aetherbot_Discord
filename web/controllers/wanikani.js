
const express = require('express')
const router = express.Router();
const wk = require('../../services/wanikani.js')

// TODO: refactor this out! /////////////////////
const db = require("../../database.js")
function dateString(d) {
	let mm = d.getMonth() + 1
	if(mm < 10) { mm = "0" + mm }
	let dd = d.getDate()
	if(dd < 10) { dd = "0" + dd }
	return d.getFullYear() + "-" + mm + "-" + dd
}
async function waniGetTokens() {
	return db.query(`SELECT * FROM wanikani`).then((response) => {
		return response
  })
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

/////////////////////////////////////////////////

router.get('/wanikani', (req, res) => {
  res.json({
    message: 'いらっしゃいませ！'
  })
});

router.get('/wanikani/reviews', (req, res) => {
  waniGetTokens().then((response) => {
    waniGetData(response).then((data) => {
      res.json(data)
    })
  })
})

module.exports = router
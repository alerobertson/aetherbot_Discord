const express = require('express')
const router = express.Router();
const wanikani = require('../../modules/wanikani')

router.get('/wanikani', (req, res) => {
	res.json({
		message: 'いらっしゃいませ！'
	})
});

router.get('/wanikani/reviews', (req, res) => {
	wanikani.getSummary().then((data) => {
		res.json(data)
	})
})

module.exports = router
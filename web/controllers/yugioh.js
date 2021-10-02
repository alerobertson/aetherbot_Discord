const express = require('express')
const router = express.Router();
const path = require('path');
const yugioh = require('../../modules/yugioh')

router.get('/yugioh/card/:code', (req, res) => {
	let code = req.params.code
	res.sendFile(path.resolve(__dirname + '../../../assets/cards/' + code + '.jpg'));
});

module.exports = router
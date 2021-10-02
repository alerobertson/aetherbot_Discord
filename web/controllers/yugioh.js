const express = require('express')
const router = express.Router();
const path = require('path');
const yugioh = require('../../modules/yugioh')

router.get('/yugioh/booster/:code', (req, res) => {
	res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/booster.html'));
});

router.get('/yugioh/card/:code', (req, res) => {
	let code = req.params.code
	res.sendFile(path.resolve(__dirname + '../../../assets/cards/' + code + '.jpg'));
});

router.get('/yugioh/booster.js', (req, res) => {
	res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/booster.js'));
});

router.get('/yugioh/box/:owner', (req, res) => {
	res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/box.html'));
});

router.get('/yugioh/box.js', (req, res) => {
	res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/box.js'));
});

router.get('/yugioh/cards.css', (req, res) => {
	res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/cards.css'));
});

router.get('/yugioh/open/:code', async (req, res) => {
	let code = req.params.code
	let booster = await yugioh.openPack(code)
	if(booster) {
		res.send(booster)
	}
	else {
		res.sendStatus(404)
	}
});

router.get('/yugioh/get-cards/:owner', async (req, res) => {
	let owner = req.params.owner
	let cards = await yugioh.getCards(owner)
	if(cards) {
		res.send(cards)
	}
	else {
		res.sendStatus(404)
	}
});

router.get

module.exports = router
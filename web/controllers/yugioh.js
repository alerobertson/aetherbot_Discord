const express = require('express')
const axios = require('axios')
const router = express.Router();
const path = require('path');
const yugioh = require('../../modules/yugioh')
const discordApi = require('../../modules/discord/api')
const config = require('../../modules/discord/config.json')
const {
    v1: uuidv1, // Time Based
    v4: uuidv4, // Random
} = require('uuid');

router.get('/yugioh/booster/:code', (req, res) => {
    res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/booster.html'));
});

router.get('/yugioh/card/:code', (req, res) => {
    let code = req.params.code
    res.sendFile(path.resolve(__dirname + '../../../assets/cards/' + code + '.jpg'));
});

router.get('/yugioh/box/:owner', (req, res) => {
    res.sendFile(path.resolve(__dirname + '../../../assets/site/yugioh/box.html'));
});

router.get('/yugioh/open/:code', async(req, res) => {
    let code = req.params.code
    let booster = await yugioh.openPack(code)
    if (booster) {
        res.send(booster)
    } else {
        res.sendStatus(404)
    }
});

router.get('/yugioh/my-cards/', async(req, res) => {
    if(req.headers.auth_token) {
        let auth_token = req.headers.auth_token
        let user = await yugioh.getUserBySiteToken(auth_token)
        if(!user) {
            res.sendStatus(404)
        }
        else {
            let cards = await yugioh.getCards(user.id)
            res.send(cards)
        }
    }
    else {
        res.sendStatus(404)
    }
});

router.get('/yugioh/get-cards/:owner', async(req, res) => {
    let owner = req.params.owner
    let cards = await yugioh.getCards(owner)
    if (cards) {
        res.send(cards)
    } else {
        res.sendStatus(404)
    }
});

router.get('/yugioh/check-code/:code', async(req, res) => {
    let code = req.params.code
    let valid = await yugioh.packIsValid(code)
    res.send({ valid })
});

// Discord OAuth2
async function getToken(code) {
	headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
	body = new URLSearchParams({
		client_id: config.application.client_id,
		client_secret: config.application.client_secret,
		code: code,
		grant_type: 'authorization_code',
		redirect_uri: config.domain + '/yugioh/auth'
	})

	return axios.post(`https://discord.com/api/oauth2/token`, body, { headers: headers } )
		.then((response) => {
			return response.data
		}, (error) => {
			console.log("Authentication Error: cannot authenticate with code: " + code)
			console.log(error.response.data)
		})
}

router.get('/yugioh/auth/', async(req, res) => {
    let code = req.query.code
	if(req.query.code) {
		let token_data = await getToken(req.query.code)
		if(token_data.access_token) {
			let me = await discordApi.getMe(token_data.access_token)
			token_data.id = me.id
			let site_token = await yugioh.addTokens(token_data)
			res.redirect(config.application.yugioh_domain + '/authorized?token=' + site_token)
		}
		else {
			res.sendStatus(400)
		}
		console.log(token_data)
	}
    
})

router.get('/yugioh/test/', async(req, res) => {
    console.log(req.query)
})

module.exports = router
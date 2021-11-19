const express = require('express')
const axios = require('axios')
const router = express.Router();
const sharp = require('sharp')
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

router.get('/yugioh/card/:code', async (req, res) => {
    let code = req.params.code
    if(req.query.fe == 1) {
        let file = await sharp(path.resolve(__dirname + '../../../assets/cards/' + code + '.jpg'))
            .composite([{ 
                input: path.resolve(__dirname + '../../../assets/cards/FE.png')
            }])
            .toFormat('jpg')
            .toBuffer()
    
        res.end(file, 'binary');
    }
    else {
        res.sendFile(path.resolve(__dirname + '../../../assets/cards/' + code + '.jpg'));
    }
});

/*router.get('/yugioh/coupons/', async (req, res) => {
    let coupons = await yugioh.getCoupons()
    res.send(coupons)
});*/

router.get('/yugioh/booster-art/:code', (req, res) => {
    let code = req.params.code
    res.sendFile(path.resolve(__dirname + '../../../assets/boosters/' + code + '.png'));
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
            res.sendStatus(401)
        }
        else {
            let cards = await yugioh.getCards(user.id)
            res.send(cards)
        }
    }
    else {
        res.sendStatus(401)
    }
});

router.get('/yugioh/my-packs/', async(req, res) => {
    if(req.headers.auth_token) {
        let auth_token = req.headers.auth_token
        let user = await yugioh.getUserBySiteToken(auth_token)
        if(!user) {
            res.sendStatus(401)
        }
        else {
            let packs = await yugioh.getPacks(user.id)
            packs = packs.filter(pack => !pack.opened)
            res.send(packs)
        }
    }
    else {
        res.sendStatus(401)
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

router.post('/yugioh/send-offer/', async(req, res) => {
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user || !req.body) {
        res.sendStatus(401)
    }
    else {
        // let cards_in_offer = await yugioh.cardsInOffer(req.body.offer.concat(req.body.partner_offer))
        let offer_valid = await yugioh.validateOwnership(req.body.offer, user.id)
        let partner_valid = await yugioh.validateOwnership(req.body.partner_offer, req.body.partner)
        if(offer_valid && partner_valid) {
            let success = await yugioh.addOffer(req.body.offer, user.id, req.body.partner_offer, req.body.partner)
            if(success) {
                res.sendStatus(201)
            }
            else {
                res.sendStatus(403)
            }
        }
        else {
            res.sendStatus(403)
        }
    }
});

router.get('/yugioh/check-code/:code', async(req, res) => {
    let code = req.params.code
    let valid = await yugioh.packIsValid(code)
    res.send({ valid })
});

router.get('/yugioh/duelists/', async(req, res) => {
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        let duelists = await yugioh.getDuelists()
        duelists = duelists.filter(duelist => duelist.id != user.id)
        res.send(duelists)
    }
});

router.get('/yugioh/me/', async(req, res) => {
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        res.send({
            id: user.id,
            site_token: user.site_token
        })
    }
});

router.get('/yugioh/my-offers/', async(req, res) => {
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        let offers = await yugioh.getOffers(user.id)
        res.send(offers)
    }
});

router.get('/yugioh/cancel-offer/:id', async(req, res) => {
    let trade_id = req.params.id
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        let offer = await yugioh.getOffer(trade_id)
        if(offer.owner.user.id == user.id) {
            await yugioh.setOfferState(trade_id, 'cancelled')
            res.sendStatus(201)
        }
        else {
            res.sendStatus(401)
        }
    }
});

router.get('/yugioh/decline-offer/:id', async(req, res) => {
    let trade_id = req.params.id
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        let offer = await yugioh.getOffer(trade_id)
        if(offer.target.user.id == user.id) {
            await yugioh.setOfferState(trade_id, 'declined')
            res.sendStatus(201)
        }
        else {
            res.sendStatus(401)
        }
    }
});

router.get('/yugioh/accept-offer/:id', async(req, res) => {
    let trade_id = req.params.id
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    if(!user) {
        res.sendStatus(401)
    }
    else {
        let offer = await yugioh.getOffer(trade_id)
        if(offer.target.user.id == user.id) {
            let target_id = offer.target.user.id
            let owner_id = offer.owner.user.id

            await offer.owner.offer.forEach(async (card) => {
                await yugioh.setCardOwner(card.id, target_id)
            })
            await offer.target.offer.forEach(async (card) => {
                await yugioh.setCardOwner(card.id, owner_id)
            })
            await yugioh.setOfferState(trade_id, 'accepted')
            res.sendStatus(201)
        }
        else {
            res.sendStatus(401)
        }
    }
});

router.get('/yugioh/pack/:code', async(req, res) => {
    let code = req.params.code
    let pack = await yugioh.getPack(code)
    if(pack) {
        res.send({ pack })
    }
    else {
        res.sendStatus(404)
    }
});

router.get('/yugioh/redeem/:code', async(req, res) => {
    let code = req.params.code.toLowerCase()
    let auth_token = req.headers.auth_token
    let user = await yugioh.getUserBySiteToken(auth_token)
    let code_expression = /^[0-9a-zA-Z]{4}[\-][0-9a-zA-Z]{4}[\-][0-9a-zA-Z]{4}$/
    if(!user || !code.match(code_expression)) {
        res.sendStatus(401)
    }
    else {
        let pack = await yugioh.findPack(code)
        if(pack && pack.owner == "unowned") {
            yugioh.setPackOwner(pack.code, user.id).then((response) => {
                if(response) {
                    res.sendStatus(201)
                }
                else {
                    res.sendStatus(401)
                }
            })
        }
        else {
            res.sendStatus(404)
        }
    }
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
	}
    
})

module.exports = router
const config = require('./config.json')
const db = require('../mysql')
const discordApi = require('../discord/api.js')
const importFunctions = require('./import.js')
var CronJob = require('cron').CronJob
const { 
    v1: uuidv1, // Time Based
    v4: uuidv4, // Random
} = require('uuid');
var discordClient = {};
const discordConfig = require('../discord/config.json')
const discord = require('../discord')

const rarities = {
    COMMON: 'common',
    RARE: 'rare',
    SUPER_RARE: 'super_rare',
    ULTRA_RARE: 'ultra_rare',
    SECRET_RARE: 'secret_rare'
}

function sortCards(cards) {
    var new_cards = {
        common: [],
        rare: [],
        super_rare: [],
        ultra_rare: [],
        secret_rare: []
    }
    cards.forEach((card) => {
        if(new_cards[card.rarity]) {
            new_cards[card.rarity].push(card)
        }
    })
    return new_cards
}

function determineRarity(odds, value) {
    var rarity = rarities.COMMON
    let calculated_odds = []
    let starting_value = 100.0
    let rarity_keys = Object.keys(odds)


    for(let x = 0; x < rarity_keys.length; x++) {
        let key = rarity_keys[x]
        starting_value -= odds[key]
        calculated_odds.push({
            rarity: key,
            value: starting_value
        })
    }

    for(let x = 0; x < calculated_odds.length; x++) {
        let o = calculated_odds[x]
        if(value >= o.value) {
            rarity = o.rarity
            break
        }
    }

    return rarity
}

function pull(cards, rarity) {
    var chosen_stack = cards[rarity]
    if(chosen_stack) {
        var card = chosen_stack[Math.floor(Math.random()*chosen_stack.length)];
        return card
    }
    else {
        console.error(`Rarity '${rarity}' not found`)
        return null
    }
}

async function getBoosterSet(set_name) {
    let query = `SELECT card_info.*, card_value.* FROM card_info INNER JOIN card_value ON card_info.rarity=card_value.rarity WHERE code LIKE "${set_name}-%";`
    return db.query(query)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function assembleBooster(set_name = config.current_set_code) {
    const set_info = config.sets[set_name]
    const cards = sortCards(await getBoosterSet(set_name))
    let booster = []

    if(set_info.custom) {
        set_info.markup.forEach((code) => {
            let card = cards.find(c => c.code == code)
            booster.push(card)
        })
    }
    else {
        set_info.markup.forEach((markup_item) => {
            let rarity = markup_item.rarity
            let number_of_cards = markup_item.amount
    
            if(rarity == "random") {
                for(let x = 0; x < number_of_cards; x++) {
                    let random_value = Math.random() * 100
                    let rarity = determineRarity(set_info.rarities, random_value)
                    let card = pull(cards, rarity)
                    booster.push(card)
                }
            }
            else {
                for(let x = 0; x < number_of_cards; x++) {
                    let card = pull(cards, rarity)
                    booster.push(card)
                }
            }
        })
    }

    return booster
}

async function getPack(pack_code) {
    let pack = await db.query(`SELECT * FROM packs WHERE code="${pack_code}";`)
        .then((result) => {
            if(result[0]) {
                let pack = result[0]
                return pack
            }
            else {
                console.error('No pack with code "' + pack_code + "' found!")
                return null
            }
        },
        (err) => {
            console.error(err)
            return null
        })

    return pack
}

async function findPack(pack_code) {
    let pack = await db.query(`SELECT * FROM packs WHERE code LIKE "%${pack_code}%";`)
        .then((result) => {
            if(result[0]) {
                let pack = result[0]
                return pack
            }
            else {
                console.error('No pack with code like "' + pack_code + '" found!')
                return null
            }
        },
        (err) => {
            console.error(err)
            return null
        })

    return pack
}

async function getCard(card_id) {
    return db.query(`SELECT cards.*, card_info.*, card_value.* FROM cards INNER JOIN card_info ON cards.code=card_info.code INNER JOIN card_value ON card_info.rarity=card_value.rarity WHERE id=${card_id};`)
        .then((result) => {
            if(result[0]) {
                return result[0]
            }
            else {
                return false
            }
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getCardInfo(code) {
    return db.query(`SELECT card_info.*, card_value.* FROM card_info INNER JOIN card_value ON card_info.rarity=card_value.rarity WHERE code="${code}";`)
        .then((result) => {
            if(result[0]) {
                return result[0]
            }
            else {
                return false
            }
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getCards(owner) {
    return db.query(`SELECT card_info.*, cards.owner, cards.id, cards.first_edition, card_value.* FROM cards INNER JOIN card_info ON cards.code=card_info.code INNER JOIN card_value ON card_info.rarity=card_value.rarity WHERE cards.owner="${owner}";`)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getCardSets() {
    let card_sets = config.sets
    let card_set_ids = Object.keys(card_sets)
    let card_sets_array = []
    card_set_ids.forEach(key => {
        let value = card_sets[key]
        card_sets_array.push({
            set_name: key,
            craftable: value.craftable
        })
    })

    card_sets_array = await Promise.all(card_sets_array.map(async (set) => {
        let cards = await getBoosterSet(set.set_name)
        set.cards = cards
        return set
    }));

    return card_sets_array
}

async function getPacks(owner) {
    let query = `SELECT * FROM packs;`
    if(owner) {
        query = `SELECT * FROM packs WHERE owner="${owner}";`
    }
    return db.query(query)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getCoupons() {
    let query = `SELECT * FROM packs WHERE owner="unowned" && opened=false;`
    return db.query(query)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getPackOwners() {
    let query = `SELECT DISTINCT owner FROM packs;`
    return db.query(query)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function setPackOwner(pack_code, new_owner) {
    let query = `UPDATE packs SET owner="${new_owner}" WHERE code="${pack_code}"`
    return db.query(query)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function packIsValid(pack_code) {
    let pack = await getPack(pack_code)
    return pack != null && !pack.opened && pack.owner != "unowned"
}

async function packOwner(pack_code) {
    let pack = await getPack(pack_code)
    if(pack) { return pack.owner }
    else { return null }
}

async function addCardsToCollection(owner, cards, first_edition = false) {
    let query = 'INSERT INTO cards (code, name, owner, first_edition) VALUES '
    for(i = 0; i < cards.length; i++) {
        let card = cards[i]
        query += `("${card.code}", "${card.name}", "${owner}", ${first_edition})`
        if(i != cards.length - 1) { query += ',' }
        else { query += ';' }
    }

    return db.query(query)
        .then((result) => {
            return true
        },
        (err) => {
            console.error(err)
            return false
        })
    
}

async function openPack(pack_code) {
    let pack_is_valid = await packIsValid(pack_code)

    if(!pack_is_valid) {
        return null
    }
    else {
        let pack = await getPack(pack_code)
        let owner = pack.owner
        let booster = await assembleBooster(pack.set_name)
        let success = await addCardsToCollection(owner, booster, pack.first_edition)

        if(success) {
            return db.query(`UPDATE packs SET opened=true WHERE code="${pack_code}";`)
                .then((result) => {
                    booster = booster.map(card => {
                        card.first_edition = pack.first_edition ? 1 : 0
                        return card
                    })
                    return {owner, booster}
                },
                (err) => {
                    console.error(err)
                    return null
                })
        }
        else {
            return null
        }  
    }
}

async function generatePackCode(user_id, set_name = config.current_set_code, first_edition = false) {
    const pack_code = uuidv4()

    var result = await db.query(`INSERT INTO packs (code, owner, opened, set_name, first_edition) VALUES ("${pack_code}", "${user_id}", false, "${set_name}", ${first_edition})`)
        .then((result) => {
            updateLatestPack(user_id, new Date())
            return pack_code
        },
        (err) => {
            console.error(err)
            return null
        })
    return result
}

async function updateLatestPack(owner, d) {
    let datetime = datetimeString(d)


    return db.query(`INSERT INTO duelists (id, last_pack) VALUES("${owner}", "${datetime}") ON DUPLICATE KEY UPDATE last_pack="${datetime}"`)
        .then((result) => {
            return true
        },
        (err) => {
            console.error(err)
            return false
        })

}

// Creates a relevant string for the Date object
// YYYY-MM-DD HH-MM-SS
function datetimeString(d) {
	return dateString(d) + ' ' + timeString(d)
}

// Creates a relevant string for the Date object
// YYYY-MM-DD
function dateString(d) {
	let mm = d.getMonth() + 1
	if(mm < 10) { mm = "0" + mm }
	let dd = d.getDate()
	if(dd < 10) { dd = "0" + dd }
	return d.getFullYear() + "-" + mm + "-" + dd
}

// Creates a relevant string for the Date object
// HH-MM-SS
function timeString(d) {
	let hh = d.getHours()
	if(hh < 10) { hh = "0" + hh }
	let mm = d.getMinutes()
	if(mm < 10) { mm = "0" + mm }
	let ss = d.getSeconds()
	if(ss < 10) { ss = "0" + ss }
	return hh + ':' + mm + ':' + ss
}

async function scoreLastWeek(username) {
    return db.query(`SELECT SUM(honor) AS honor, SUM(score) AS score FROM entries WHERE username="${username}" AND DATE(datetime) > ADDDATE(CURRENT_DATE, -7);`).then((result) => {
        if (result[0]) {
            return result[0]
        }
        else {
            return null
        }
    })
}

async function addTokens(token_data) {
    let site_token = uuidv4()
    await db.query(`UPDATE duelists SET discord_token="${token_data.access_token}", site_token="${site_token}", refresh_token="${token_data.refresh_token}" WHERE id="${token_data.id}";`)
    return site_token
}

async function getUserBySiteToken(site_token) {
    return db.query(`SELECT * FROM duelists where site_token="${site_token}"`).then((result) => {
        if (result[0]) {
            return result[0]
        }
        else {
            return null
        }
    })
}

async function getDuelists() {
    return db.query(`SELECT id FROM duelists WHERE discord_token IS NOT NULL;`).then((response) => {
        let duelist_ids = response.map(duelist => duelist.id)
        return discordApi.getUsers(duelist_ids)
    })
}

async function validateOwnership(cards, owner) {
    if(!cards.length) {
        return true
    }
    let count = await db.query(`SELECT COUNT(*) AS count FROM cards WHERE id in (${cards.toString()}) AND owner="${owner}";`).then((response) => {
        return response[0].count
    })
    return cards.length == count
}

async function cardsInOffer(cards) {
    let count = await db.query(`SELECT COUNT(*) AS count FROM offer_cards WHERE id in (${cards.toString()});`).then((response) => {
        return response[0].count
    }) 
    return count > 0
}

// [], "12319827541897", [], "12319827541897"
async function addOffer(offer, id, partner_offer, partner_id) {
    let card_ids = offer.concat(partner_offer)
    if(!card_ids.length) {
        return false
    }

    let trade_id = await db.query(`INSERT INTO offers (owner, target, state) VALUES ("${id}", "${partner_id}", "open")`).then((response) => {
        return response.insertId
    })

    let query = 'INSERT INTO offer_cards (id, trade_id) VALUES '
    for(i = 0; i < card_ids.length; i++) {
        let card_id = card_ids[i]
        query += `("${card_id}", "${trade_id}")`
        if(i != card_ids.length - 1) { query += ',' }
        else { query += ';' }
    }

    return db.query(query)
        .then((result) => {
            return trade_id
        },
        (err) => {
            console.error(err)
            return false
        })
    
}

async function sanitizeOffers(offers) {
    let offers_by_trade_id = {}
    offers.forEach((offer) => {
        if(!offers_by_trade_id[offer.trade_id]) {
            offers_by_trade_id[offer.trade_id] = [offer]
        }
        else {
            offers_by_trade_id[offer.trade_id].push(offer)
        }
    })

    let compiled_offers = []
    Object.keys(offers_by_trade_id).forEach((trade_id) => {
        let offer_cards = offers_by_trade_id[trade_id]
        let offer_owner = offer_cards[0].offer_owner
        let offer_target = offer_cards[0].offer_target
        let state = offer_cards[0].state
        let owner_offer = offer_cards.filter(c => c.owner == c.offer_owner)
        let target_offer = offer_cards.filter(c => c.owner == c.offer_target)

        compiled_offers.push({
            owner: { offer: owner_offer, user: offer_owner },
            target: { offer: target_offer, user: offer_target },
            id: trade_id,
            state: state
        })
    })

    let guild_members = await discordApi.getUsers()

    // Add discord data
    compiled_offers = compiled_offers.map((offer) => {
        let owner = guild_members.find(member => offer.owner.user == member.id)
        let target = guild_members.find(member => offer.target.user == member.id)
        offer.owner.user = owner
        offer.target.user = target
        return offer
    })

    return compiled_offers
}

async function getOffers(user_id) {
    let offers = await db.query(`SELECT card_info.*, cards.code, cards.first_edition, cards.owner, offers.owner AS offer_owner, offers.target AS offer_target, offers.state, offer_cards.* FROM offers INNER JOIN offer_cards ON offer_cards.trade_id=offers.id INNER JOIN cards ON offer_cards.id=cards.id INNER JOIN card_info ON cards.code=card_info.code WHERE (offers.owner="${user_id}" OR offers.target="${user_id}");`)
    let compiled_offers = await sanitizeOffers(offers)
    return compiled_offers
}

async function getOffer(offer_id) {
    let offers = await db.query(`SELECT card_info.*, cards.code, cards.first_edition, cards.owner, offers.owner AS offer_owner, offers.target AS offer_target, offers.state, offer_cards.* FROM offers INNER JOIN offer_cards ON offer_cards.trade_id=offers.id INNER JOIN cards ON offer_cards.id=cards.id INNER JOIN card_info ON cards.code=card_info.code WHERE (offers.id="${offer_id}");`)
    let compiled_offers = await sanitizeOffers(offers)
    return compiled_offers[0]
}

async function setOfferState(offer_id, state) {
    let query = `UPDATE offers SET state="${state}" WHERE id=${offer_id};`
    return db.query(query)
}

async function setCardOwner(card_id, new_owner) {
    let query = `UPDATE cards SET owner="${new_owner}" WHERE id=${card_id};`
    return db.query(query)
}

async function disenchant(card_id) {
    let card = await getCard(card_id)
    let owner = card.owner
    return db.query(`DELETE FROM cards WHERE id=${card_id}`).then((response) => {
        return db.query(`UPDATE duelists SET gems=gems+${card.disenchant} WHERE id="${owner}";`)
    }, (error) => {
        return false
    })
}

async function enchant(code, owner) {
    let card = await getCardInfo(code)
    return addCardsToCollection(owner, [card]).then((success) => {
        if(success) {
            return db.query(`UPDATE duelists SET gems=gems-${card.enchant} WHERE id="${owner}";`)
        }
        else {
            return false
        }
    })
}

async function saveDeck(deck_id, owner, name, cards) {
    let deck = await getDeck(deck_id)
    if(deck && deck.owner != owner) {
        return false
    }
    if(deck) {
        await db.query(`UPDATE decks SET name="${name}" WHERE id=${deck_id};`)
        await db.query(`DELETE FROM deck_cards WHERE deck_id="${deck_id}";`)
    }
    else {
        await db.query(`INSERT INTO decks (owner, name) VALUES ("${owner}", "${name}");`)
    }
    let insert_query = `INSERT INTO deck_cards (deck_id, code, first_edition, side) VALUES `
    cards.forEach((card) => {
        insert_query += `(${deck_id}, "${card.code}", ${card.first_edition}, ${card.side}),`
    })
    // Replace last comma with a semi-colon
    insert_query = insert_query.replace(/.$/,";")
    return await db.query(insert_query).then((response) => {
        return true
    , (error) => {
        return false
    }})
}

async function newDeck(owner, name) {
    let query = `INSERT INTO decks (owner, name) VALUES ("${owner}", "${name}");`
    return db.query(query).then((response) => {
        return response.insertId
    })
}

async function renameDeck(deck_id, new_name) {
    let query = `UPDATE decks SET name="${new_name}" WHERE id=${deck_id};`
    return db.query(query)
}

async function getDeck(deck_id) {
    let query = `SELECT deck_id, side, decks.name AS deck_name, first_edition, owner, card_info.*, card_value.* FROM deck_cards LEFT JOIN decks ON deck_cards.deck_id = decks.id LEFT JOIN card_info ON deck_cards.code = card_info.code LEFT JOIN card_value ON card_info.rarity = card_value.rarity WHERE deck_id=${deck_id};`
    return db.query(query).then(async (response) => {
        if(response.length > 0) {
            let deck = {
                id: deck_id,
                name: response[0].name,
                owner: response[0].owner,
                cards: []
            }
            deck.cards = response.map(card => {
                return {
                    code: card.code,
                    first_edition: card.first_edition
                }
            })
            return deck
        }
        // No cards with that deck_id
        else {
            let decks = await db.query(`SELECT * FROM decks WHERE id=${deck_id};`)
            if(decks.length > 0) {
                return {
                    id: deck_id,
                    name: decks[0].name,
                    owner: decks[0].owner,
                    cards: []
                }
            }
            // No decks with that deck_id
            else {
                return {}
            }
        }
    })
}

async function getDecks(owner) {
    let decks = await db.query(`SELECT * FROM decks WHERE owner="${owner}"`).then((response) => {
        return response.map(d => {
            return {
                id: d.id,
                name: d.name,
                owner: d.owner,
                cards: []
            }
        })
    })
    let query = `SELECT deck_id, side, decks.name AS deck_name, first_edition, owner, card_info.*, card_value.* FROM deck_cards LEFT JOIN decks ON deck_cards.deck_id = decks.id LEFT JOIN card_info ON deck_cards.code = card_info.code RIGHT JOIN card_value ON card_info.rarity = card_value.rarity WHERE owner="${owner}";`
    return db.query(query).then((response) => {
        response.forEach((card) => {
            for(let i = 0; i < decks.length; i++) {
                if(decks[i].id == card.deck_id) {
                    decks[i].cards.push(card)
                }
            }
        })
        return decks
    })
}

async function deleteDeck(deck_id) {
    await db.query(`DELETE FROM deck_cards WHERE deck_id=${deck_id};`)
    await db.query(`DELETE FROM decks WHERE id="${deck_id}";`)
    return true
}

async function getStarterDeckPurchases(code) {
    return db.query(`SELECT owner FROM starter_deck_purchases WHERE code="${code}";`)
        .then((result) => {
            if(result[0]) {
                return result
            }
            else {
                return false
            }
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function getStarterDeckInfo(code) {
    let purchases = await getStarterDeckPurchases(code)
    return db.query(`SELECT * FROM starter_decks WHERE code="${code}";`)
        .then((result) => {
            if(result[0]) {
                let starter_deck = result[0]
                starter_deck.owners = purchases ? purchases : []
                return starter_deck
            }
            else {
                return false
            }
        },
        (err) => {
            console.error(err)
            return false
        })
}

async function purchaseDeck(code, user_id) {
    let starter_deck_info = await getStarterDeckInfo(code)
    let cards = await getBoosterSet(code).then((set) => {
        return set.map(card => {
            return {
                code: card.code,
                name: card.name
            }
        })
    })
    return addCardsToCollection(user_id, cards, true).then((success) => {
        if(success) {
            return Promise.all([
                db.query(`UPDATE duelists SET gems=gems-${starter_deck_info.price} WHERE id="${user_id}";`),
                db.query(`INSERT INTO starter_deck_purchases (code, owner) VALUES ("${code}", "${user_id}");`)
            ])
        }
        else {
            return false
        }
    })
}

async function getStarterDecks() {
    let purchases = await db.query(`SELECT * FROM starter_deck_purchases;`)
    return db.query(`SELECT * FROM starter_decks;`)
        .then((result) => {
            if(result[0]) {
                let starter_decks = result.map((starter_deck) => {
                    starter_deck.owners = purchases.filter(purchase => purchase.code == starter_deck.code).map(purchase => purchase.owner)
                    return starter_deck
                })
                return starter_decks
            }
            else {
                return false
            }
        },
        (err) => {
            console.error(err)
            return false
        })
}

module.exports = {
    assembleBooster,
    generatePackCode,
    getBoosterSet,
    openPack,
    packIsValid,
    packOwner,
    getPack,
    findPack,
    getCards,
    getCardSets,
    getCard,
    getCardInfo,
    getPacks,
    getCoupons,
    setPackOwner,
    addTokens,
    getUserBySiteToken,
    getDuelists,
    validateOwnership,
    addOffer: async (offer, id, partner_offer, partner_id) => {
        return addOffer(offer, id, partner_offer, partner_id).then(async (trade_id) => {
            if(trade_id) {
                let creator = await discordApi.getUser(id)
                let bot_channel = discordClient.channels.get(discordConfig.main_bot_channel)
                bot_channel.send(`<@${partner_id}>,\n${creator.username} sent you a new trade offer!\n${discordConfig.application.yugioh_domain}/trade/${trade_id}`)
            }
            return trade_id
        })
    },
    cardsInOffer,
    getOffers,
    getOffer,
    setOfferState: async (trade_id, new_state) => {
        return setOfferState(trade_id, new_state).then(async (response) => {
            let offer = await getOffer(trade_id)
            let bot_channel = discordClient.channels.get(discordConfig.main_bot_channel)
            switch(new_state) {
                case "cancelled":
                    bot_channel.send(`${offer.owner.user.username} cancelled trade offer #${offer.id} with ${offer.target.user.username} ❌`)
                    break
                case "accepted":
                    bot_channel.send(`<@${offer.owner.user.id}>,\n${offer.target.user.username} accepted trade offer #${offer.id} ✅`)
                    break
                case "declined":
                    bot_channel.send(`<@${offer.owner.user.id}>,\n${offer.target.user.username} declined trade offer #${offer.id} ❌`)
                    break
            }
            return response
        })
    },
    setCardOwner,
    disenchant,
    enchant,
    saveDeck,
    newDeck,
    renameDeck,
    getDeck,
    getDecks,
    deleteDeck,
    getStarterDeckInfo,
    getStarterDecks,
    purchaseDeck,
    init: () => {
        var job = new CronJob('0 21 * * 5', () => {
            getPackOwners().then((packs) => {
                let promises = []
                let users = []
                packs.forEach((pack) => {
                    promises.push(
                        discordApi.getUser(pack.owner).then((user) => {
                            if(user.id) {
                                users.push(user)
                            }
                        })
                    )
                })
                Promise.all(promises).then(() => {
                    users.forEach((user) => {
                        scoreLastWeek(user.username + "#" + user.discriminator).then((results) => {
                            let number_of_packs = 2
                            if(results.honor >= 5) {
                                number_of_packs++
                            }
                            for(let i = 0; i < number_of_packs; i++) {
                                generatePackCode(user.id, config.current_set_code, true)
                            }
                        })
                    })
                })
            })
        }, true,'America/Toronto')
        
    },
    initDiscordClient: (client) => {
        discordClient = client;
    }
}

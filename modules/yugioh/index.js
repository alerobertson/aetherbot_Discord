const config = require('./config.json')
const db = require('../mysql')
const discordApi = require('../discord/api.js')
const importFunctions = require('./import.js')
var CronJob = require('cron').CronJob
const { 
    v1: uuidv1, // Time Based
    v4: uuidv4, // Random
} = require('uuid');

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
    let query = `SELECT * FROM card_info WHERE code LIKE "${set_name}-%";`
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

async function getCards(owner) {
    return db.query(`SELECT card_info.*, cards.id, cards.first_edition FROM cards INNER JOIN card_info ON cards.code=card_info.code WHERE cards.owner="${owner}";`)
        .then((result) => {
            return result
        },
        (err) => {
            console.error(err)
            return false
        })
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

async function packIsValid(pack_code) {
    let pack = await getPack(pack_code)
    return pack != null && !pack.opened
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

module.exports = {
    assembleBooster,
    generatePackCode,
    openPack,
    packIsValid,
    packOwner,
    getPack,
    getCards,
    getPacks,
    addTokens,
    getUserBySiteToken,
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
        },true,'America/Toronto')
    }
}

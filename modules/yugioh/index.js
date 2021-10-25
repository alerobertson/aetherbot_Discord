const config = require('./config.json')
const db = require('../mysql')
const discordApi = require('../discord/api.js')
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

// 1:31 - Secret Rare - 3.225%
// 1:24 - Ultra Rare - 4.1667&
// 1:5 - Super Rare - 20%

const super_rarity = config.super_rarity
const ultra_rarity = config.ultra_rarity
const secret_rarity = config.secret_rarity

function determineRarity(value) {
    var rarity = rarities.COMMON

    let super_odds = 100.0 - super_rarity
    if(value >= super_odds) {
        rarity = rarities.SUPER_RARE
    }

    let ultra_odds = super_odds - ultra_rarity
    if(value < super_odds && value >= ultra_odds) {
        rarity = rarities.ULTRA_RARE
    }

    let secret_odds = ultra_odds - secret_rarity
    if(value < ultra_odds && value >= secret_odds) {
        rarity = rarities.SECRET_RARE
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

function assembleBooster() {
    const code = config.current_set_code
    const booster_set = require(`./boosters/${code}/${code}.json`);
    const cards = sortCards(booster_set)

    let booster = []

    // Commons, 7
    for(let x = 0; x < 7; x++) {
        let card = pull(cards, rarities.COMMON)
        booster.push(card)
    }
    // Rare, 1
    for(let x = 0; x < 1; x++) {
        let card = pull(cards, rarities.RARE)
        booster.push(card)
    }
    // Random Card (Common / Super Rare+), 1
    for(let x = 0; x < 1; x++) {
        let random_value = Math.random() * 100
        let rarity = determineRarity(random_value)
        let card = pull(cards, rarity)
        booster.push(card)
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

async function getCards(owner) {
    return db.query(`SELECT card_info.*, cards.id  FROM cards INNER JOIN card_info ON cards.code=card_info.code WHERE cards.owner="${owner}";`)
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

async function addCardsToCollection(owner, cards) {
    let query = 'INSERT INTO cards (code, name, owner) VALUES '
    for(i = 0; i < cards.length; i++) {
        let card = cards[i]
        query += `("${card.code}", "${card.name}", "${owner}")`
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
        let owner = await packOwner(pack_code)
        let booster = await assembleBooster()
        let success = await addCardsToCollection(owner, booster)
        if(success) {
            return db.query(`UPDATE packs SET opened=true WHERE code="${pack_code}";`)
            .then((result) => {
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

async function generatePackCode(user_id) {
    const pack_code = uuidv4()

    var result = await db.query(`INSERT INTO packs (code, owner, opened) VALUES ("${pack_code}", "${user_id}", false)`)
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

async function importSetInfo(set_name) {
    let booster_set = require(`./boosters/${set_name}/${set_name}.json`);
    let monsters = booster_set.filter(element => element.type == "monster")
    let spells_and_traps = booster_set.filter(element => element.type == "spell" || element.type == "trap")

    let monsters_query = 'INSERT INTO card_info (code, name, level, attribute, type, attack, defense, monster_type, description, rarity) VALUES '
    for(i = 0; i < monsters.length; i++) {
        let card = monsters[i]
        
        // Parse numbers
        card.level = parseInt(card.level)

        Object.keys(card).forEach((key) => {
            if(typeof card[key] === 'string' || card[key] instanceof String) {
                card[key] = card[key].replace(/"/g, '""')
            }
        })

        monsters_query += `("${card.code}", "${card.name}", ${card.level}, "${card.attribute}", "${card.type}", "${card.attack}", "${card.defense}", "${card.monster_type}", "${card.description}", "${card.rarity}")`
        if(i != monsters.length - 1) { monsters_query += ',' }
        else { monsters_query += ';' }
    }

    let spells_and_traps_query = 'INSERT INTO card_info (code, name, `spell_trap_type`, attribute, type, description, rarity) VALUES '
    for(i = 0; i < spells_and_traps.length; i++) {
        let card = spells_and_traps[i]

        Object.keys(card).forEach((key) => {
            if(typeof card[key] === 'string' || card[key] instanceof String) {
                card[key] = card[key].replace(/"/g, '""')
            }
        })
        console.log(card.spell_trap_type)

        spells_and_traps_query += `("${card.code}", "${card.name}", "${card.spell_trap_type}", "${card.attribute}", "${card.type}", "${card.description}", "${card.rarity}")`
        if(i != spells_and_traps.length - 1) { spells_and_traps_query += ',' }
        else { spells_and_traps_query += ';' }
    }

    let promises = []
    promises.push(db.query(monsters_query)
        .then((result) => {
            return true
        },
        (err) => {
            console.error(err)
            return false
        })
    )

    promises.push(db.query(spells_and_traps_query)
        .then((result) => {
            return true
        },
        (err) => {
            console.error(err)
            return false
        })
    )

    return Promise.all(promises)
    
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
    importSetInfo,
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
                            users.push(user)
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
                                generatePackCode(user.id)
                            }
                        })
                    })
                })
            })
        },true,'America/Toronto')
    }
}

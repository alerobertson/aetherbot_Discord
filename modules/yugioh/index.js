const config = require('./config.json')
const db = require('../mysql')
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
    return db.query(`SELECT * FROM cards WHERE owner="${owner}"`)
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
    const pack_code = uuidv1()

    var result = await db.query(`INSERT INTO packs (code, owner, opened) VALUES ("${pack_code}", "${user_id}", false)`)
        .then((result) => {
            return pack_code
        },
        (err) => {
            console.error(err)
            return null
        })
    return result
}

module.exports = {
    assembleBooster,
    generatePackCode,
    openPack,
    packIsValid,
    packOwner,
    getPack,
    getCards
}

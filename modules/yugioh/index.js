const lob = require('./boosters/LOB/LOB.json');
const lob_cards = sortCards(lob)

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

const super_rarity = 20.0
const ultra_rarity = 4.1667
const secret_rarity = 3.225

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

function assembleBooster(cards) {
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

module.exports = {
    assembleBooster
}

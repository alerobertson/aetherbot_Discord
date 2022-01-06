const axios = require('axios')
const db = require('../mysql')
const fs = require('fs')
const path = require('path')

const rarity_mapping = {
    "Secret Rare": "secret_rare",
    "Ultra Rare": "ultra_rare",
    "Super Rare": "super_rare",
    "Super Short Print": "super_rare",
    "Rare": "rare",
    "Short Print": "common",
    "Common": "common"
}
const type_mapping = {
    "Normal Monster": "Normal",
    "Flip Effect Monster": "Flip/Effect",
    "Fusion Monster": "Fusion",
    "Effect Monster": "Effect",
    "Toon Monster": "Toon",
    "Ritual Monster": "Ritual",
    "Ritual Effect Monster": "Ritual"
}
const card_type_mapping = {
    "Normal Monster": "monster",
    "Flip Effect Monster": "monster",
    "Fusion Monster": "monster",
    "Effect Monster": "monster",
    "Trap Card": "trap",
    "Spell Card": "spell",
    "Toon Monster": "monster",
    "Ritual Monster": "monster",
    "Ritual Effect Monster": "monster"
}

async function downloadImage(url, file_name) {
    const new_path = path.resolve(__dirname, '../../assets/cards/', file_name)
    const writer = fs.createWriteStream(new_path)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

async function insertCards(cards) {
    let monsters = cards.filter(card => card.type == "monster")
    let spells_and_traps = cards.filter(card => card.type == "spell" || card.type == "trap")

    let monsters_query = 'INSERT INTO card_info (code, name, level, attribute, type, attack, defense, monster_type, description, rarity, ygopro_id) VALUES '
    for(i = 0; i < monsters.length; i++) {
        let card = monsters[i]
        
        // Parse numbers
        card.level = parseInt(card.level)

        Object.keys(card).forEach((key) => {
            if(typeof card[key] === 'string' || card[key] instanceof String) {
                card[key] = card[key].replace(/"/g, '""')
            }
        })

        monsters_query += `("${card.code}", "${card.name}", ${card.level}, "${card.attribute}", "${card.type}", "${card.attack}", "${card.defense}", "${card.monster_type}", "${card.description}", "${card.rarity}", "${card.ygopro_id}")`
        if(i != monsters.length - 1) { monsters_query += ',' }
        else { monsters_query += ';' }
    }

    let spells_and_traps_query = 'INSERT INTO card_info (code, name, `spell_trap_type`, type, description, rarity, ygopro_id) VALUES '
    for(i = 0; i < spells_and_traps.length; i++) {
        let card = spells_and_traps[i]

        Object.keys(card).forEach((key) => {
            if(typeof card[key] === 'string' || card[key] instanceof String) {
                card[key] = card[key].replace(/"/g, '""')
            }
        })

        spells_and_traps_query += `("${card.code}", "${card.name}", "${card.spell_trap_type}", "${card.type}", "${card.description}", "${card.rarity}", "${card.ygopro_id}")`
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

async function getCardSet(set_name) {
    return axios.get('https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=' + set_name).then((response) => {
        let cards = response.data.data

        // Check card distribution by logging this
        var card_list = {
            secret_rare: 0,
            ultra_rare: 0,
            super_rare: 0,
            rare: 0,
            common: 0
        }

        cards = cards.map(card => {
            card.card_sets = card.card_sets.filter(set => set.set_name == set_name)
            card.card_sets = card.card_sets.filter(set => !set.set_code.includes('-E'))
            card.set = card.card_sets[0]
            if (!card.set) {
                console.error("No appropriate set found")
            } else {
                card.rarity = rarity_mapping[card.set.set_rarity]
                card_list[card.rarity]++
            }
            if (card.type.includes('Monster')) {
                card.monster_type = `${card.race}/${type_mapping[card.type]}`
            }
            let new_card = {
                code: card.set.set_code,
                name: card.name,
                type: card_type_mapping[card.type],
                description: card.desc,
                ygopro_id: card.id,
                image: card.card_images[0].image_url,
                rarity: card.rarity
            }
            switch (new_card.type) {
                case "monster":
                    new_card.level = card.level
                    new_card.attribute = card.attribute
                    new_card.monster_type = card.monster_type
                    new_card.attack = card.atk
                    new_card.defense = card.def
                    break
                case "trap", "spell":
                    new_card.spell_trap_type = card.race
                    break
            }
            return new_card

        });

        return cards
    })
}

module.exports = {
    getCardSet,
    importCardImages: async (card_set) => {
        let cards = await getCardSet(card_set)
        cards.forEach(card => {
            downloadImage(card.image, card.code + '.jpg')
        })
    },
    importCardData: async (card_set) => {
        let cards = await getCardSet(card_set)
        return insertCards(cards)
    }
}
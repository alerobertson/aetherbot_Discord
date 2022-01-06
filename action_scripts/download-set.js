const importFuncs = require('../modules/yugioh/import.js')

let set = process.env.SET

async function start() {
    await importFuncs.importCardData('Spell Ruler')
}

start()
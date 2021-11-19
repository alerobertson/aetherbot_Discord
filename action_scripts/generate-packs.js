const yugioh = require('../modules/yugioh/index.js')
const yugiohConfig = require('../modules/yugioh/config.json')

let set = process.env.SET || yugiohConfig.current_set_code
let number_of_packs = process.env.PACKS || 1
let first_edition = process.env.FIRST == undefined ? true : process.env.FIRST == "1"
let owner = process.env.OWNER || "unowned"

async function start() {
    console.log(`Generating ${number_of_packs} pack(s) of ${set} under "${owner}" (${first_edition ? "" : "Not "}1st Edition)`)

    let csv_string = 'index,code,set_name'

    for (let i = 0; i < number_of_packs; i++) {
        let pack_code = await yugioh.generatePackCode(owner, set, first_edition)
        let pack_segments = pack_code.split('-')
        pack_code = `${pack_segments[1]}-${pack_segments[2]}-${pack_segments[3]}`
        csv_string += `\n${i},${pack_code},${set}`
    }

    console.log("Done")

    return
}

start()
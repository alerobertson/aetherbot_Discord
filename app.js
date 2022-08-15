/* Author: Alexander Robertson 2018
 *
 * AetherBot_Discord
 *
 * Purpose: A Discord bot personal project. For use with the Discord messaging app.
 * Involves a leader board for people saying good morning at appropriate hours.
 * Uses Discord.JS
*/
(async () => {
    const discord = require('./modules/discord')
    var discordClient = await discord.init()
    
    const slack = require('./modules/slack')
    slack.init()
    
    const yugioh = require('./modules/yugioh')
    yugioh.initDiscordClient(discordClient)
    yugioh.init()
    
    const api_server = require('./web/api.js')
    api_server.start('/')
})()
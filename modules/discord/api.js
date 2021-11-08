const axios = require('axios')
const config = require('./config.json')

async function get(url) {
    let headers = {
        "Authorization": "Bot " + config.token 
    }
    return axios.get('https://discord.com/api' + url, { headers: headers }).then((response) => {
        return response.data
    }).catch((error) => {
        console.log(error.data)
        return {}
    })
}

async function getMe(access_token) {
    let headers = {
        "Authorization": "Bearer " + access_token
    }
    return axios.get('https://discord.com/api/users/@me', { headers: headers }).then((response) => {
        return response.data
    }).catch((error) => {
        console.log(error.data)
        return {}
    })
}

async function getGuildMembers(guild_id) {
    let headers = {
        "Authorization": "Bot " + config.token 
    }
    let url = `https://discord.com/api/guilds/${guild_id}/members?limit=1000`
    return axios.get(url, { headers: headers }).then((response) => {
        return response.data.map((member) => { 
            let user = member.user
            if(!user.avatar) {
                user.avatar = `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png?size=64`
            }
            else {
                user.avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=64`
            }
            return user
        })
    }).catch((error) => {
        console.log(error.data)
        return {}
    })
}

module.exports = {
    getUser: async (id) => {
        return get('/users/' + id)
    },
    getUsers: async (ids) => {
        let guild_members = await getGuildMembers(config.main_guild)
        if(ids) {
            guild_members = guild_members.filter(member => ids.includes(member.id))
        }
        return guild_members
    },
    getMe
}
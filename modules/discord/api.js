const axios = require('axios')
const config = require('./config.json')

async function get(url) {
    headers = {
        "Authorization": "Bot " + config.token 
    }
    return axios.get('https://discord.com/api' + url, { headers: headers }).then((response) => {
        return response.data
    }).catch((error) => {
        return {}
    })
}

module.exports = {
    getUser: async (id) => {
        return get('/users/' + id)
    }
}
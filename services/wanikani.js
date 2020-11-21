const axios = require('axios')

async function getRequest(url, api_token) {
    var headers = {
        'Authorization': 'Bearer ' + api_token
    }
    return axios.get(url, { headers: headers }).then((response) => {
        return response.data
    }).catch((error) => {
        return {}
    })
}


module.exports = {
    fetchSummary: async (api_token) => {
        if(!api_token) { return {} }
        return getRequest('https://api.wanikani.com/v2/summary', api_token)
    },
    fetchReviews: async (api_token, updated_after) => {
        var url = 'https://api.wanikani.com/v2/reviews?'
        if(updated_after) { url += `updated_after=${updated_after}` }
        return getRequest(url, api_token)
    }
}
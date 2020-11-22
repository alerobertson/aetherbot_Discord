const express = require('express')

const app = express()
const port = 4001

const waniKaniController = require('./controllers/wanikani.js')

const start = function(namespace) {
  app.set('port', port)
  app.use(namespace, [
    waniKaniController
  ])

  app.listen(port, () => {
    console.log('REST API active at ' + namespace + ' on port ' + port)
  })
}

module.exports = {
  start
}

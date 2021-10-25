const express = require('express')
var cors = require('cors')
const app = express()
app.use(cors())
const port = 4001

const waniKaniController = require('./controllers/wanikani.js')
const yugiohController = require('./controllers/yugioh.js')

const start = function (namespace) {
	app.set('port', port)
	app.use(namespace, [
		waniKaniController
	])
	app.use(namespace, [
		yugiohController
	])
	app.use('/yugioh/assets/boosters', express.static('assets/boosters'))
	app.use('/api/yugioh', express.static('assets/site/yugioh'))

	app.listen(port, () => {
		console.log('REST API active at ' + namespace + ' on port ' + port)
	})
}

module.exports = {
	start
}

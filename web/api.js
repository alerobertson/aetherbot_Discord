const express = require('express')

const app = express()
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

	app.listen(port, () => {
		console.log('REST API active at ' + namespace + ' on port ' + port)
	})
}

module.exports = {
	start
}

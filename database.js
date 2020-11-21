/*
 * Author: Alexander Robertson 2018
 * Purpose: Wraps simple MYSQL management statements for efficiency
 * Wraps query statements in promises
 *
*/
const mysql = require('mysql')
const config = require('./database_config.json')
let connection

module.exports = {
	createConnection: () => {
		connection =  mysql.createConnection({
			host: config.host,
			user: config.user,
			password: config.password,
			database: config.database
		})
		connection.connect( (err) => {
			if(err) throw err
		})
		return
	},
	query: (sql) => {
		return new Promise((resolve, reject) => {
			if(!connection) {
				createConnection()
			}
			connection.query(sql, (err, result) => {
				if(err) {
					console.log(err)
					reject(err)
				}
				console.log("SQL> " + sql + "... " + result)
				resolve(result)
			})
		})
	}
}

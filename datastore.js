const fs = require('fs')
const lineReader = require('readline')

let morning_log = []
let custom_timezones = []

module.exports = {
	morning_log: morning_log,
	timezones: custom_timezones,
	add_entry: (user, result) => {
		morning_log.push([user, result])
	},
	add_timezone_entry: (user, result) => {
		custom_timezones.push([user, result])
	},
	update_timezone_entry: (result, index) => {
		custom_timezones[index][1] = result
	},
	write_to_disk: () => {
		fs.writeFileSync('database.txt', '');
		morning_log.forEach((morning, i) => {
			fs.appendFile('database.txt', morning_log[i][0] + "," + morning_log[i][1] + "\n", (err) => {
				if(err) throw err
			})
		})
		
		fs.writeFileSync('timezones.txt', '');
		custom_timezones.forEach((timezone, i) => {
			fs.appendFile('timezones.txt', custom_timezones[i][0] + "," + custom_timezones[i][1] + "\n", (err) => {
				if(err) throw err
			})
		})
	},
	load_from_disk: () => {
		let lr = null
		lr = lineReader.createInterface({
			input: require('fs').createReadStream('database.txt')
		})
		lr.on('line', function (line) {
			let incoming = line.split(",")
			morning_log.push([incoming[0], parseInt(incoming[1])]) //Collect text data and put it into memory
		})
		
		lr = lineReader.createInterface({
			input: require('fs').createReadStream('timezones.txt')
		})
		lr.on('line', function (line) {
			let incoming = line.split(",")
			custom_timezones.push([incoming[0], parseInt(incoming[1])]) //Collect text data and put it into memory
		})
	}
}
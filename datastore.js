const fs = require('fs')
const lineReader = require('readline')

var morning_log = []
var custom_timezones = []

module.exports = {
	morning_log: morning_log,
	timezones: custom_timezones,
	add_entry: (user, result, day) => {
		morning_log.push([user, result, day])
	},
	add_timezone_entry: (user, result) => {
		custom_timezones.push([user, result])
	},
	update_timezone_entry: (result, index) => {
		custom_timezones[index][1] = result
	},
	day_of_year: (dateObject) => {
		let current_year = new Date().getFullYear()
		let start = new Date('January 1, ' + current_year)

		let day_of_the_year = (Math.floor((dateObject - start)/1000/60/60/24)) + 1
		return day_of_the_year
	},
	write_to_disk: () => {
		console.log('Writing to file')
		fs.writeFileSync('database.txt', '');
		morning_log.forEach((morning, i) => {
			fs.appendFile('database.txt', morning_log[i][0] + "," + morning_log[i][1] +
				"," + morning_log[i][2] + "\n", (err) => {
				if(err) throw err
			})
		})
		
		fs.writeFileSync('timezones.txt', '');
		custom_timezones.forEach((timezone, i) => {
			fs.appendFile('timezones.txt', custom_timezones[i][0] + "," + custom_timezones[i][1] + "\n", (err) => {
				if(err) throw err
			})
		})
		console.log('Writing done')
	},
	load_from_disk: () => {
		if(!morning_log == null) {
			return
		}
		console.log('Loading from file')
		let lr = null
		lr = lineReader.createInterface({
			input: require('fs').createReadStream('database.txt')
		})
		lr.on('line', function (line, i) {
			let incoming = line.split(",")
			let name = incoming[0]
			let score = parseInt(incoming[1])
			let date = parseInt(incoming[2])
			morning_log.push([incoming[0], parseInt(incoming[1]), date]) //Collect text data and put it into memory
		})

		lr = lineReader.createInterface({
			input: require('fs').createReadStream('timezones.txt')
		})
		lr.on('line', function (line) {
			let incoming = line.split(",")
			custom_timezones.push([incoming[0], parseInt(incoming[1])]) //Collect text data and put it into memory
		})
		console.log('Loading done')
	}
}
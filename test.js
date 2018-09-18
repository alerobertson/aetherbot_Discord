app = require('./app.js')

const test_helpers = {
	build_message: (content, username = 'lyninx') => {
		return { 
			author: { username: username }, 
			content: content, 
			channel: { send: () => true },
			reply: () => true 
		}
	}
}


try {
	// test successful good morning 
	app.wordCheck(test_helpers.build_message('morning'))

	// test random message being sent
	app.wordCheck(test_helpers.build_message('meow'))

	// test commands
	app.wordCheck(test_helpers.build_message('++mrank'))
	app.wordCheck(test_helpers.build_message('++save', 'tacosensei_'))
	app.wordCheck(test_helpers.build_message('++load', 'tacosensei_'))

	console.log('Tests passed!')
} catch(err) {
	console.log('Tests failed... :(')
	console.error(err)
}
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/mean-app', function () {
	console.log('Nawiązano połączenie z mongodb.');
});

module.exports = mongoose;
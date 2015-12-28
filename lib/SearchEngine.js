(function() {
	'use strict';

	var
		  google = require('google')
		, Q = require('q');

	function SearchEngine() {
		google.lang = 'pt';
		google.tld = 'com.br';
		google.resultsPerPage = 25;
		google.nextText = 'Mais';

		var lastSearchNextButton;

		this.search = function(data) {
			return Q.Promise(function(resolve, reject) {
				// google(data.searchTerms, function(err, next, links) {
				// 	resolve(links);
				// });
				setTimeout(function() {
					data.links = require('../mock-google');
					resolve(data)
				}, 2000);
			});
		};
	}

	module.exports = SearchEngine;
	
})();

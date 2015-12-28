(function() {
	var
		  fs = require('fs')
		, Q = require('q')
		, TFIDF = require('./TFIDF')
		, Util = require('./Util');

	function DocumentRepository(source) {
		this.initializationComplete = Q.defer();

		this.repository = {
			urls: [],
			trains: [],
			documents: []
		};

		fs.stat(source, function(err, stats) {
			if (err && err.errno == -2) {
				this.initializationComplete.resolve();
			} else if (!err) {
				fs.readFile(source, function(err, data) {
					this.repository = JSON.parse(data);
					this.initializationComplete.resolve();
				}.bind(this))
			} else {
				throw "Unexpected exception";
			}
		}.bind(this));


		this.ready = function() {
			return this.initializationComplete.promise;
		}

		this.getTrains = function() {
			return this.repository.trains;
		}

		/**
		 * @brief Adds a file to the repository.
		 *
		 * @param 
		 */
		this.addDocument = function(url, blob) {
			var index = this.repository.urls.indexOf(url);

			if (index === -1) {
				this.repository.urls.push(url);
				this.repository.documents.push(blob);
			} else {
				this.repository.documents[index] = blob;
			}
		}

		this.persist =  function() {
			fs.writeFile(source, JSON.stringify(this.repository));
		}

		this.getDocumentKeywords = function(blob, n) {
			var wordRelevancy = Util.arrayUnique(blob)
				.map(function(word) {
					return {
						word: word,
						relevancy: TFIDF.tfidf(word, blob, this.repository.documents)
					};
				}.bind(this))
				.sort(function(a,b) {
					if (a.relevancy > b.relevancy) {
						return -1;
					} else if (a.relevancy < b.relevancy) {
						return 1;
					} else {
						return 0;
					}
				});

			return (n ? wordRelevancy.splice(0, n) : wordRelevancy);
		}

		this.getKeywords = function(n) {
			var words = [].concat.apply([], this.repository.documents);
			return this.getDocumentKeywords(words, n);
		}

		this.registerTrain = function(trainParameters, score) {
			this.repository.trains.push({input: trainParameters, output: score});
		}
	}

	module.exports = DocumentRepository;
	
})();

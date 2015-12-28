(function() {
	'use strict';

	var
		  Q = require('q')
		, opener = require('opener');
		
	function LinkAnalyzerPipeline(presenter, documentReaderInst, documentRepoInst, documentClassifier) {

		/**
		 * @brief Resolve the deferred object with the pipeline data
		 *
		 * @param Q.defer The deferred object
		 * @return Function The function which resolves the object
		 */
		function resolveDeferred(deferred) {
			return function(data) {
				deferred.resolve(data);
			}
		}

		function openLink(data) {
			return Q.Promise(function(resolve, reject) {
				opener(data.link.href);
				resolve(data);
			});
		}

		function analyzeLink(data) {
			return Q.Promise(function(resolve, reject) {
				presenter.wait(function() {
					return Q.Promise(function(_resolve, _reject) {
						documentReaderInst.read(data.link.href).then(function(_data) {
							documentRepoInst.addDocument(data.link.href, _data.tokens);
							documentRepoInst.persist();

							data.keywords = documentRepoInst.getDocumentKeywords(_data.tokens, 10);
							_resolve(data);
						});
					})
				})()
				.then(presenter.show('FOUND-KEYWORDS'))
				.then(function(_data) {
					console.log(
						data.keywords
							.map(function(keyword) { return keyword.word })
							.join(", ")
					);

					resolve(data);
				});
			});
		}

		function parseSelectedLinkOption(data) {
			return Q.Promise(function(resolve, reject) {
				if (data.linkOption == 1) {
					this.analyzePipe = this.analyzePipe
						.then(openLink)
						.then(presenter.showDocumentOptions.bind(presenter))
						.then(parseSelectedDocumentOption.bind(this))
				} else {
					this.analyzePipe
						.then(resolveDeferred(this.analyzeDeferred));
				}
				
				resolve(data);
			}.bind(this))
		}

		function parseSelectedDocumentOption(data) {
			return Q.Promise(function(resolve, reject) {
				if (data.documentOption == 1) {
					this.analyzePipe = this.analyzePipe
						.then(analyzeLink)
						.then(presenter.showAnalyzeOptions.bind(presenter))
						.then(parseSelectedAnalyzeOption.bind(this))
				} else {
					this.analyzePipe = this.analyzePipe
						.then(resolveDeferred(this.analyzeDeferred));
				}

				resolve(data);
			}.bind(this))
		}

		function parseSelectedAnalyzeOption(data) {
			return Q.Promise(function(resolve, reject) {
				var trainParameters = {};

				var documentsKeywords = documentRepoInst.getKeywords(10);

				documentsKeywords.forEach(function(keyword) {
					trainParameters[keyword.word] = -keyword.relevancy;
				});

				data.keywords.forEach(function(keyword) {
					if (!trainParameters[keyword.word]) {
						trainParameters[keyword.word] = 0;
					}

					trainParameters[keyword.word] += keyword.relevancy;
				});

				if (data.analyzeOption == 3) {
					try {
						data.guess = parseInt(documentClassifier.classify(trainParameters));
						
						this.analyzePipe = this.analyzePipe
							.then(presenter.show(data.guess === 1 ? 'GUESS-GOOD' : 'GUESS-BAD'))
					} catch(e) {
						data.guess = undefined;
						this.analyzePipe = this.analyzePipe
							.then(presenter.show('GUESS-NOTHING'))
					}

					this.analyzePipe = this.analyzePipe
						.then(presenter.showAnalyzeOptions.bind(presenter))
						.then(parseSelectedAnalyzeOption.bind(this));
				} else {
					var score = (data.analyzeOption == 1 ? 1 : 0);

					documentClassifier.trainOnline(trainParameters, score);
					documentRepoInst.registerTrain(trainParameters, score);
					documentRepoInst.persist();

					this.analyzePipe = this.analyzePipe
						.then(resolveDeferred(this.analyzeDeferred));
				}

				resolve(data);
			}.bind(this));
		}

		/**
		 */
		this.analyze = function(link) {
			this.analyzeDeferred = Q.defer();
	 		
	 		this.analyzePipe = presenter.showLink({link: link})
				.then(presenter.showLinkOptions.bind(presenter))
				.then(parseSelectedLinkOption.bind(this));
	 		
	 		return this.analyzeDeferred.promise;
		}
	}

	module.exports = LinkAnalyzerPipeline;
	
})();

(function() {
	'use strict';

	/**
	 * Dependencies
	 */
	var 
		  http 		= require('http')
		, Q 		= require('q')
		, unfluff 	= require('unfluff')
		, openNLP	= require("opennlp");


	/**
	 * DocumentReaderPipeline
	 *
	 * @brief Represents the pipeline for reading web pages and
	 *		  parsing its contents. The input it the url, the
	 *		  output is the parsed content (only body text, 
	 *		  without the unwanted parts).
	 *
	 * @since 1.0.0
	 *
	 * @param boolean verbose If true, will log pipeline progress
	 */
	var DocumentReaderPipeline = function(verbose) {
		// Creates a new OpenNLP instance
		var opennlp = new openNLP({
		    models : {
		        tokenizer: __dirname + '/../models/pt-token.bin',
		        posTagger: __dirname + '/../models/pt-pos-maxent.bin',
		    }
		});

		/**
		 * @brief Download content from an URL
		 *
		 * @param String url The URL
		 * @return Q.Promise which resolves to a object {data: "URL Content"}
		 */
		function download(url) {
			return Q.Promise(function(resolve, reject) {
				if (verbose) {
					console.log("Reading URL...");
				}

				http.get(url, function(res) {
		    		var data = '';
		    
		    		res.on('data', function (chunk) {
		      			data += chunk;
		    		});

		    		res.on("end", function() {
		      			resolve({data: data})
		    		});

				}).on("error", function() {
		    		reject();
		  		});
			});
		}

		/**
		 * @brief Read the document body (relevant part)
		 *
		 * @param Object data Data from the pipeline. This must have the "data" key, with the raw document
		 * @return Q.Promise which, when resolved, adds the "text" key to the pipeline data, containing the 
		 *		   relevant part of the body.
		 */
		function parseDocumentBody(data) {
			return Q.Promise(function(resolve, reject) {
				if (verbose) {
					console.log("Extracting document body...");
				}
				
				var parsedData = unfluff(data.data);
				resolve({text: parsedData.text});
			});
		}

		/**
		 * @brief Divides the text into tokens
		 *
		 * @param Object data Data from the pipeline. This must have the "text" key, with the parsed document body
		 * @return Q.Promise which, when resolved, adds the "tokens" key to the pipeline data, containing the 
		 *		   tokens from the parsed document.
		 */
		function tokenizeText(data) {
			return Q.Promise(function(resolve, reject) {
				if (verbose) {
					console.log("Tokenizing text...");
				}

				opennlp.tokenizer.tokenize(data.text, function(err, tokens_arr) {
					if (err === undefined) {
						data.tokens = tokens_arr;
						resolve(data);
					} else {
						reject({err: err});
					}
				});
			});
		}

		/**
		 * @brief Classifies the tokens with Part-of-Speech tags
		 *
		 * @param Object data Data from the pipeline. This must have the "tokens" key, with the tokenized text
		 * @return Q.Promise which, when resolved, adds the "tags" key to the pipeline data, containing the
		 *		   classification of the tokens in the "tokens" key.
		 */
		function tagText(data) {
			return Q.Promise(function(resolve, reject) {
				if (verbose) {
					console.log("Tagging text...");
				}
			
				opennlp.posTagger.topKSequences(data.tokens, function(err, tagger) {
					if (err === undefined) {
						var tmpTags = {
							score: tagger.getScore(),
							probs: tagger.getProbs(),
							outcomes: tagger.getOutcomes()
						};

						var index = tmpTags.score.indexOf(tmpTags.score.sort()[0]);

						data.tags = {
							probs: tmpTags.probs[index],
							outcomes: tmpTags.outcomes[index]
						};

						resolve(data);
					} else {
						reject({err: err});
					}
				});
			});	
		}

		/**
		 * @brief Remove tokens that aren't relevant to the analysis
		 *
		 * @param Object data Data from the pipeline. This must have the "tokens" and "tags" keys
		 * @return Q.Promise which parses the tokens and tokens and remove unwanted ones
		 */
		function removeUnwantedParts(data) {
			return Q.Promise(function(resolve, reject) {
				if (verbose) {
					console.log("Removing unwanted parts");
				}

				var tokens = data.tokens;
				var tags = data.tags;

				for (var i = 0 ; i < tokens.length; i++) {
					// Drop unwanted word types
					switch(tags.outcomes[i]) {
						case 'art':
						case 'prp':
						case 'prop':
						case 'punc':
						case 'conj-c':
						case 'pron-det':
						case 'pron-indp':
						case 'pron-pers':
						case 'prp':
						case 'adv':
						case 'v-pnp':
						case 'conj-s':
							tokens.splice(i, 1);
							tags.outcomes.splice(i, 1);
							tags.probs.splice(i, 1);
							i--;
					}

					// Drop words that opennlp is unsure
					if (tags.probs[i] < 0.95) {
						tokens.splice(i, 1);
						tags.outcomes.splice(i, 1);
						tags.probs.splice(i, 1);
						i--;

						if (tokens[i + 1] === '%') {
							tokens.splice(i+1, 1);
							tags.outcomes.splice(i+1, 1);
							tags.probs.splice(i+1, 1);
						}
					}

					// Join percentages
					if (i + 1 != tokens.length) {
						if ((tags.outcomes[i] === 'num') && (tokens[i + 1] === '%')) {
							tokens[i] = tokens[i] + tokens[i+1];
							tokens.splice(i+1, 1);
							tags.outcomes.splice(i+1, 1);
							tags.probs.splice(i+1, 1);
						}
					}
				}
				
				resolve(data);
			});
		}

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

		/**
		 * @brief Bootstraps the document read pipeline
		 *
		 * @param String url The url to read and parse
		 * @return Q.Promise The promise of the parsed content
		 */
		this.read = function(url) {
			var deferred = Q.defer();

			download(url)
				.then(parseDocumentBody)
				.then(tokenizeText)
				.then(tagText)
				.then(removeUnwantedParts)
				.then(resolveDeferred(deferred))

			return deferred.promise;
		}
	}


	/**
	 * Exports
	 */
	module.exports = DocumentReaderPipeline;
})();
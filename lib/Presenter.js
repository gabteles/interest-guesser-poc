(function() {
	var 
		  chalk = require('chalk')
		, Q = require('q')
		, Util = require('./Util');

	/**
	 * Presenter
	 *
	 * @brief Handles the input and output.
	 *
	 * @since 1.0.0
	 */
	function Presenter() {
		/**
		 * Constants
		 */
		var terms = {
			  'SEARCH-WHAT': "Search for what?"
			, 'SEARCHING' : "Searching..."
			, 'ANALYZE-PHASE' : 'Found! Now it\'s time to analyze the links...'
			, 'LINK-OPTIONS-TEXT': 'What should I do with this link?'
			, 'LINK-OPTIONS-OPEN': 'Open the link on browser'
			, 'LINK-OPTIONS-PASS': 'Discart this link'
			, 'DOCUMENT-OPTIONS-TEXT': 'What should I do with this document?'
			, 'DOCUMENT-OPTIONS-OPEN': 'Analyze'
			, 'DOCUMENT-OPTIONS-PASS': 'Discart this document'
			, 'FOUND-KEYWORDS': 'Top keywords to this document, according to our document database:'
			, 'ANALYZE-OPTIONS-TEXT': 'Is this a interesting document?'
			, 'ANALYZE-OPTIONS-GOOD': 'Of course yes!'
			, 'ANALYZE-OPTIONS-BAD': 'Hell No!'
			, 'ANALYZE-OPTIONS-GUESS': 'I doubt you can guess it!'
			, 'GUESS-GOOD': 'I guess it\' a interesting document'
			, 'GUESS-BAD': 'I guess this document is so boring'
			, 'GUESS-NOTHING': 'Me too. I haven\'t sufficient data to guess!'
		};

		/**
		 * @brief Print the application banner
		 */
		this.banner = function() {
			var banner = [
				"      ___   __    _  _______  _______  ______    _______  _______  _______      ",
				"     |   | |  |  | ||       ||       ||    _ |  |       ||       ||       |     ",
				"     |   | |   |_| ||_     _||    ___||   | ||  |    ___||  _____||_     _|     ",
				"     |   | |       |  |   |  |   |___ |   |_||_ |   |___ | |_____   |   |       ",
				"     |   | |  _    |  |   |  |    ___||    __  ||    ___||_____  |  |   |       ",
				"     |   | | | |   |  |   |  |   |___ |   |  | ||   |___  _____| |  |   |       ",
				"     |___| |_|  |__|  |___|  |_______||___|  |_||_______||_______|  |___|       ",
				"        _______  __   __  _______  _______  _______  _______  ______            ",
				"       |       ||  | |  ||       ||       ||       ||       ||    _ |           ",
				"       |    ___||  | |  ||    ___||  _____||  _____||    ___||   | ||           ",
				"       |   | __ |  |_|  ||   |___ | |_____ | |_____ |   |___ |   |_||_          ",
				"       |   ||  ||       ||    ___||_____  ||_____  ||    ___||    __  |         ",
				"       |   |_| ||       ||   |___  _____| | _____| ||   |___ |   |  | |         ",
				"       |_______||_______||_______||_______||_______||_______||___|  |_|         ",
				"                                                                                "
			];

			console.log(chalk.inverse(banner.join("\n")));
		}

		/**
		 * @brief Read one line from stdin
		 *
		 * @return Q.Promise Which resolves to an object {input: "User input"}.
		 */
		this.readLine = function() {
			this.inputDeferred = Q.defer();
			
			process.stdin.resume();
			process.stdin.setEncoding('utf8');
			
			if (!this.addedInputDataListener) {		
				process.stdin.on('data', function (text) {
					process.stdin.pause();
					this.inputDeferred.resolve({input: text});
				}.bind(this));
				this.addedInputDataListener = true;
			}
			return this.inputDeferred.promise;
		};

		/**
		 * @brief Show the input text using the Presenter terms
		 *
		 * @param String term The Presenter term to show
		 * @return Function with Q.Promise which bypasses data
		 */
		this.show = function(term) {
			return function(data) {
				console.log("");
				console.log(chalk.bold(terms[term]));
				
				return Q.Promise(function(resolve, reject) {
					resolve(data);
				});
		 	}
		};

		/**
		 * @brief Waits to a task to complete. Until there, shows loading
		 *
		 * @param Function task The task to wait
		 * @return Function with Q.Promise resolved together with the argument
		 *		   and which bypasses data,
		 */
		this.wait = function(task) {
			var waitSignals = ['-', '\\', '|', '/'];

			return function(data) {
				return Q.promise(function(resolve, reject) {
					var index = 0;
					
					var loadingInterval = setInterval(function() {
						process.stdout.write(waitSignals[index] + "\r");
						index = (index + 1) % waitSignals.length;
					}, 100);

					var promise = task(data);
					promise.then(function(data) {
						clearInterval(loadingInterval);
						process.stdout.write("\r ");
						resolve(data);
					}, function(err) {
						reject(err);
					});
				});
			}
		};

		/**
		 * @brief Asks the user for which terms search
		 *
		 * @return Q.Promise Which resolves to an object {searchTerms: "The search terms"}.
		 */
		this.askSearchTerms = function() {
			return Q.Promise(function(resolve, reject) {
				this.show('SEARCH-WHAT')();
			
				this.readLine().then(function(data) {
					resolve({searchTerms: data.input});
				});
			}.bind(this));
		};

		/**
		 * @brief Shows link information
		 *
		 * @param Object data Data from the pipeline. Expects the key "link" to be present, to
		 *					  represent the link from the search engine.
		 * @return Q.Promise Resolved when the output finishes (bypasses data)
		 */
		this.showLink = function(data) {
			return Q.Promise(function(resolve, reject) {
				var link = data.link;
				console.log("");
				console.log("=".repeat(80) + "\n");
				console.log(chalk.red(link.title));
				console.log(Util.ellipsis(link.href, 80));
				console.log("");
				resolve(data);
			});
		};

		/**
		 * @brief Shows link options (Open, Pass)
		 *
		 * @param Object data Data from pipeline.
		 * @return Q.Promise which, when resolved, adds the "linkOption" key to the pipeline data, containing the 
		 *		   option selected.
		 */
		this.showLinkOptions = function(data) {
			return Q.Promise(function(resolve, reject) {
				function askWhatToDo() {
					this.show('LINK-OPTIONS-TEXT')();
					console.log(chalk.bold(" 1) " + terms['LINK-OPTIONS-OPEN']));
					console.log(chalk.bold(" 2) " + terms['LINK-OPTIONS-PASS']));
					process.stdout.write(": ");
				}

				askWhatToDo.apply(this);

				this.readLine().then(function callback(_data) {
					var opt = parseInt(_data.input);

					if (opt === 1 || opt === 2) {
						data.linkOption = opt;
						resolve(data);
					} else {
						askWhatToDo.apply(this);
						this.readLine().then(callback.bind(this))	
					}
				}.bind(this));
			}.bind(this));
		};

		/**
		 * @brief Shows document options (Analyze, Pass)
		 *
		 * @param Object data Data from pipeline.
		 * @return Q.Promise which, when resolved, adds the "documentOptions" key to the pipeline data, containing the 
		 *		   option selected.
		 */
		this.showDocumentOptions = function(data) {
			return Q.Promise(function(resolve, reject) {
				function askWhatToDo() {
					this.show('DOCUMENT-OPTIONS-TEXT')();
					console.log(chalk.bold(" 1) " + terms['DOCUMENT-OPTIONS-OPEN']));
					console.log(chalk.bold(" 2) " + terms['DOCUMENT-OPTIONS-PASS']));
					process.stdout.write(": ");
				}

				askWhatToDo.apply(this);
				
				var x = this.readLine().then(function callback(_data) {
					var opt = parseInt(_data.input);

					if (opt === 1 || opt === 2) {
						data.documentOption = opt;
						resolve(data);
					} else {
						askWhatToDo.apply(this);
						this.readLine().then(callback.bind(this))	
					}
				}.bind(this));
			}.bind(this));
		};

		/**
		 * @brief Shows analyze options (Interesting, Not Interesting)
		 *
		 * @param Object data Data from pipeline.
		 * @return Q.Promise which, when resolved, adds the "analyzeOptions" key to the pipeline data, containing the 
		 *		   option selected.
		 */
		this.showAnalyzeOptions = function(data) {
			return Q.Promise(function(resolve, reject) {
				function askWhatToDo() {
					this.show('ANALYZE-OPTIONS-TEXT')();
					console.log(chalk.bold(" 1) " + terms['ANALYZE-OPTIONS-GOOD']));
					console.log(chalk.bold(" 2) " + terms['ANALYZE-OPTIONS-BAD']));
					
					if (data.guess === undefined) {
						console.log(chalk.bold(" 3) " + terms['ANALYZE-OPTIONS-GUESS']));
					}

					process.stdout.write(": ");
				}

				askWhatToDo.apply(this);
				
				var x = this.readLine().then(function callback(_data) {
					var opt = parseInt(_data.input);

					if (opt === 1 || opt === 2 || ((data.guess === undefined) && (opt === 3))) {
						data.analyzeOption = opt;
						resolve(data);
					} else {
						askWhatToDo.apply(this);
						this.readLine().then(callback.bind(this))	
					}
				}.bind(this));
			}.bind(this));
		};

		/**
		 * @brief Given a list of links, will start the analyze pipeline for each of them
		 *
		 * @param Object data Data from the pipeline until here. Must contain the "links" key.
		 * @return 
		 */
		this.startAnalyzeLinksPipeline = function(analyzer, documentReaderInst, documentRepoInst, documentClassifier) {
		 	return function(data) {
		 		try {
			 		var pipe = Q.when(null);

				 	for (var i = 0; i < data.links.length; i++) {
				 		var link = data.links[i];

				 		if (link.href === null) {
				 			continue;
				 		}
				 		
				 		pipe = pipe.then(function(_link) {
				 			var analyzerInst = new analyzer(this, documentReaderInst, documentRepoInst, documentClassifier);
				 			return analyzerInst.analyze(_link);
				 		}.bind(this, link));

			 		}
			 	} catch (e) {
			 		console.log(e);
			 	}
			 	return pipe;
			}.bind(this);
		};
	}

	module.exports = Presenter;
})();
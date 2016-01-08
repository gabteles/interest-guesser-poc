'use strict';

/**
 * Dependencies
 */
var 
	  DocumentReaderPipeline = require('./lib/DocumentReaderPipeline')
	, DocumentRepository = require('./lib/DocumentRepository')
	, LinkAnalyzerPipeline = require('./lib/LinkAnalyzerPipeline')
	, Presenter = require('./lib/Presenter')
	, SearchEngine = require('./lib/SearchEngine')
	, limdu	= require('limdu')
	, Q = require('q')
	;

var presenter = new Presenter();
var searchEngine = new SearchEngine();
var documentReaderInst = new DocumentReaderPipeline();
var documentRepoInst = new DocumentRepository(__dirname + "/repository.json");
var documentClassifier = new limdu.classifiers.Winnow();

presenter.banner();

var pipeline = Q.Promise(function(resolve, reject) {
	presenter
		.wait(documentRepoInst.ready.bind(documentRepoInst))()
		.then(presenter.wait(function() {
			return Q.Promise(function(_resolve, _reject) {
				documentClassifier.trainBatch(documentRepoInst.getTrains());
				_resolve();
			});
		}))
		.then(function() {
			resolve();
		});	
});

pipeline
	.then(presenter.askSearchTerms.bind(presenter))
	.then(presenter.show('SEARCHING'))
	.then(presenter.wait(searchEngine.search))
	.then(presenter.show('ANALYZE-PHASE'))
	.then(presenter.startAnalyzeLinksPipeline(LinkAnalyzerPipeline, documentReaderInst, documentRepoInst, documentClassifier))
	.then(function(data) {
		//console.log(data)
	});
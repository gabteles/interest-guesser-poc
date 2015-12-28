(function() {
	'use strict';

	function TFIDF() {
		function tf(word, words) {
			var count = 0.0;
			for (var i = 0; i < words.length; i++) {
				if (word === words[i]) {
					count++;
				}
			}

			return (count / words.length);
		}

		function n_containing(word, bloblist) {
			var count = 0;
			for (var i = 0; i < bloblist.length; i++) {
				var blob = bloblist[i];

				for (var j = 0; j < blob.length; j++) {
					if (word === blob[j]) {
						count++;
						break;
					}
				}
			}

			return count;
		}

		function idf(word, bloblist) {
			return Math.log(parseFloat(bloblist.length) / n_containing(word, bloblist));
		}

		this.tfidf = function(word, blob, bloblist) {
			return tf(word, blob) * idf(word, bloblist);
		}
	}

	module.exports = new TFIDF();
})();
(function() {
	'use strict';

	function Util() {
		this.ellipsis = function(text, length) {
			
			if ((length <= 3) || (text.length <= length)) {
				return text;
			}

			return text.substring(0, length - 3) + "...";
		}

		this.arrayUnique = function(array) {
			return array.filter(function(elem, pos) {
				return array.indexOf(elem) == pos;
			});
		}
	}

	module.exports = new Util();
})();
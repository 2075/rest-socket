
(function(global, RESTsocket) {

	/*
	 * IMPLEMENTATION
	 */

	RESTsocket.codec.JSON = {

		encode: function(data) {

			var blob = null;
			try {
				blob = JSON.stringify(data);
			} catch(e) {
			}

			return blob;

		},

		decode: function(blob) {

			var data = null;
			try {
				data = JSON.parse(blob);
			} catch(e) {
			}

			return data;

		}

	}

})(typeof global !== 'undefined' ? global : this, RESTsocket);



(function(global) {

	/*
	 * HELPERS
	 */

	var _bind = function(type, callback, scope, once) {

		var passAction = false;
		var passSelf   = false;

		if (type.charAt(0) === '@') {
			type = type.substr(1, type.length - 1);
			passAction = true;
		} else if (type.charAt(0) === '#') {
			type = type.substr(1, type.length - 1);
			passSelf = true;
		}


		if (this.___events[type] === undefined) {
			this.___events[type] = [];
		}


		this.___events[type].push({
			passAction: passAction,
			passSelf:   passSelf,
			callback:   callback,
			scope:      scope,
			once:       once
		});


		return true;

	};

	var _trigger = function(type, data) {

		if (this.___events[type] !== undefined) {

			var value = undefined;

			for (var e = 0; e < this.___events[type].length; e++) {

				var args  = [];
				var entry = this.___events[type][e];

				if (entry.passAction === true) {

					args.push(type);
					args.push(this);

				} else if (entry.passSelf === true) {

					args.push(this);

				}


				if (data !== null) {
					args.push.apply(args, data);
				}


				var result = entry.callback.apply(entry.scope, args);
				if (result !== undefined) {
					value = result;
				}


				if (entry.once === true) {

					if (this.unbind(type, entry.callback, entry.scope) === true) {
						e--;
					}

				}

			}


			if (value !== undefined) {
				return value;
			} else {
				return true;
			}

		}


		return false;

	};

	var _unbind = function(type, callback, scope) {

		if (this.___events[type] !== undefined) {

			var found = false;

			for (var e = 0, el = this.___events[type].length; e < el; e++) {

				var entry = this.___events[type][e];

				if ((callback === null || entry.callback === callback) && (scope === null || entry.scope === scope)) {

					found = true;

					this.___events[type].splice(e, 1);
					el--;

				}

			}


			return found;

		}


		return false;

	};



	/*
	 * EVENT INTERFACE
	 */

	var _event_interface = {

		bind: function(type, callback, scope, once) {

			type     = typeof type === 'string'     ? type     : null;
			callback = callback instanceof Function ? callback : null;
			scope    = scope !== undefined          ? scope    : this;
			once     = once === true;


			if (type === null || callback === null) {
				return false;
			}


			return _bind.call(this, type, callback, scope, once);

		},

		trigger: function(type, data) {

			type = typeof type === 'string' ? type : null;
			data = data instanceof Array    ? data : null;


			return _trigger.call(this, type, data);

		},

		unbind: function(type, callback, scope) {

			type     = typeof type === 'string'     ? type     : null;
			callback = callback instanceof Function ? callback : null;
			scope    = scope !== undefined          ? scope    : null;


			var found = false;

			if (type !== null) {

				found = _unbind.call(this, type, callback, scope);

			} else {

				for (type in this.___events) {

					var result = _unbind.call(this, type, callback, scope);
					if (result === true) {
						found = true;
					}

				}

			}


			return found;

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var restsocket = {

		debug:   false,
		event:   function(proto) {

			for (var prop in _event_interface) {
				proto[prop] = _event_interface[prop];
			}

		},

		Client:  null,
		Server:  null,
		Service: null

	};


	if (typeof module !== 'undefined') {
		module.exports = restsocket;
	}

})(typeof global !== 'undefined' ? global : this);




(function(global, resocket) {

	/*
	 * FEATURE DETECTION
	 */

	(function() {

		if (typeof XMLHttpRequest === 'function') {

			if (typeof XMLHttpRequest.prototype.sendAsBinary !== 'function') {

				XMLHttpRequest.prototype.sendAsBinary = function(data) {

					var array = new Uint8Array(data.length);
					for (var d = 0, dl = data.length; d < dl; d++) {
						array[d] = (data.charCodeAt(d) & 0xff);
					}

					this.send(array.buffer);

				};

			}

		}

	})();



	/*
	 * HELPERS
	 */

	var _GET_encoder = function(parameters) {

		var count = 0;
		var str   = '';

		for (var key in parameters) {

			var value = parameters[key];
			if (value instanceof Object) {
				value = JSON.stringify(parameters[key]);
			}

			if (count === 0) {
				str += '?' + key + '=' + value;
			} else {
				str += '&' + key + '=' + value;
			}

			count++;

		}


		return str;

	};

	var _socket_handler = function(url, method, target) {

		var that = this;


		this.__socket = new XMLHttpRequest();
		this.__socket.open(method, url, true);


		if (this.__socket.responseType && typeof this.__socket.sendAsBinary === 'function') {
			this.__socket.responseType = 'arraybuffer';
			this.__isBinary = true;
		}


		this.__socket.setRequestHeader('Content-Type', 'application/json; charset=utf8');
		this.__socket.withCredentials = true;

		this.__socket.onload = function() {

			var blob = null;
			if (that.__isBinary === true) {

				var bytes = new Uint8Array(this.response);
				blob = String.fromCharCode.apply(null, bytes);

				_receive_handler.call(that, blob, true, target);

			} else {

				blob = this.response;

				_receive_handler.call(that, blob, false, target);

			}

		};

		this.__socket.onerror = function() {
			that.trigger('disconnect', [ 1002, '' ]);
		};

		this.__socket.ontimeout = function() {
			that.trigger('disconnect', [ 1001, '' ]);
		};

	};

	var _receive_handler = function(blob, isBinary, data) {

		var payload = null;
		try {
			payload = this.__decoder(blob);
		} catch(e) {
			// Unsupported data encoding
			return false;
		}


		if (data instanceof Object && typeof data._serviceId === 'string') {

			var service = this.getService(data._serviceId);
			var event   = data._serviceEvent  || null;
			var method  = data._serviceMethod || null;


			if (method !== null) {

				if (service !== null && typeof service[method] === 'function') {

					// Remove data frame service header
					delete data._serviceId;
					delete data._serviceMethod;

					service[method](payload);

				}

			} else if (event !== null) {

				if (service !== null && typeof service.trigger === 'function') {

					// Remove data frame service header
					delete data._serviceId;
					delete data._serviceEvent;

					service.trigger(event, [ payload ]);

				}

			}

		} else {

			this.trigger('receive', [ payload ]);

		}


		return true;

	};

	var _is_service = function(service) {

		if (service instanceof Object && typeof service.trigger === 'function') {
			return true;
		}


		return false;

	};

	var _is_service_active = function(service) {

		for (var s = 0, sl = this.__services.length; s < sl; s++) {

			if (this.__services[s] === service) {
				return true;
			}

		}


		return false;

	};

	var _plug_service = function(id, service) {

		this.__services.push(service);

		service.trigger('plug', []);

	};

	var _unplug_service = function(id, service) {

		var found = false;

		for (var s = 0, sl = this.__services.length; s < sl; s++) {

			if (this.__services[s] === service) {
				this.__services.splice(s, 1);
				found = true;
				sl--;
				s--;
			}

		}


		if (found === true) {
			service.trigger('unplug', []);
		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var Client = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.port       = 80;
		this.host       = 'localhost';
		this.reconnect  = 0;

		this.__encoder  = settings.encoder instanceof Function ? settings.encoder : JSON.stringify;
		this.__decoder  = settings.decoder instanceof Function ? settings.decoder : JSON.parse;
		this.__services = [];

		this.__isBinary  = false;
		this.__isRunning = false;

		this.___events   = {};

		settings = null;

	};


	Class.prototype = {

		/*
		 * CUSTOM API
		 */

		listen: function(port, host) {

			this.port = typeof port === 'number' ? port : this.port;
			this.host = typeof host === 'string' ? host : this.host;


			if (this.__isRunning === true) {
				return false;
			}


			if (resocket.debug === true) {
				console.log('sorbet.api.Client: Listening on ' + this.host + ':' + this.port);
			}


			// No Socket, so we are running constantly
			this.__isRunning = true;


			// Simulate Socket connection behaviour
			var that = this;
			setTimeout(function() {
				that.trigger('connect', []);
			}, 0);

		},

		send: function(data, service) {

			data    = data instanceof Object    ? data    : null;
			service = service instanceof Object ? service : null;


			if (data === null || this.__isRunning === false) {
				return false;
			}


			if (service !== null) {

				if (typeof service.id     === 'string') data._serviceId      = service.id;
				if (typeof service.event  === 'string') data._serviceEvent   = service.event;
				if (typeof service.method === 'string') data._serviceMethod  = service.method;

			}


			data._serviceMethod = data._serviceMethod.toUpperCase().match(/GET|PUT|POST|OPTIONS/) ? data._serviceMethod.toLowerCase() : 'get';
			data._serviceRandom = '' + Date.now() + ('' + Math.random()).substr(3);


			// First, I want to rage about Microsoft. You did the shittiest job designing this API. Seriously, Thumbs Down!

			var url = 'http://' + this.host + ':' + this.port + '/api/' + data._serviceId;
			if (data._serviceMethod === 'get') {
				url += _GET_encoder(data);
			}

			var target = {
				_serviceId:    data._serviceId,
				_serviceEvent: data._serviceMethod
			};

			_socket_handler.call(this, url, data._serviceMethod.toUpperCase(), target);


			if (data._serviceMethod === 'get') {

				this.__socket.send(null);

			} else {

				var blob = this.__encoder(data);
				if (this.__isBinary === true) {
					this.__socket.sendAsBinary(blob);
				} else {
					this.__socket.send(blob);
				}

			}


			return true;

		},

		connect: function() {

			if (this.__isRunning === false) {
				return this.listen(this.port, this.host);
			}


			return false;

		},

		disconnect: function() {

			if (this.__isRunning === true) {

				this.__isRunning = false;
				this.trigger('disconnect', []);

				return true;

			}


			return false;

		},

		setReconnect: function(reconnect) {

			reconnect = typeof reconnect === 'number' ? (reconnect | 0) : null;


			if (reconnect !== null) {

				this.reconnect = reconnect;

				return true;

			}


			return false;

		},

		addService: function(service) {

			service = _is_service(service) ? service : null;


			if (service !== null) {

				if (_is_service_active.call(this, service) === false) {

					_plug_service.call(this, service.id, service);

					return true;

				}

			}


			return false;

		},

		getService: function(id) {

			id = typeof id === 'string' ? id : null;


			if (id !== null) {

				var found = null;

				for (var s = 0, sl = this.__services.length; s < sl; s++) {

					var service = this.__services[s];
					if (service.id === id) {
						found = service;
						break;
					}

				}

				return found;

			}


			return null;

		},

		removeService: function(service) {

			service = _is_service(service) ? service : null;


			if (service !== null) {

				if (_is_service_active.call(this, service) === true) {

					_unplug_service.call(this, service.id, service);

					return true;

				}

			}


			return false;

		}

	};


	resocket.event(Client.prototype);
	resocket.Client = Client;

})(global, resocket);


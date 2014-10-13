
(function(global, RESTsocket) {

	/*
	 * FEATURE DETECTION
	 */

	var _listen_handler = function() {};
	var _send_handler   = function() {};

	(function() {

		if (typeof WebSocket === 'function' && false) {

			_listen_handler = function() {

				var that = this;

				var url = 'ws://' + this.host + ':' + this.port;

				this.__socket = new WebSocket(url);


				if (typeof ArrayBuffer !== 'undefined' && typeof this.__socket.binaryType !== 'undefined') {
					this.__socket.binaryType = 'arraybuffer';
					this.__isBinary = true;
				}


				this.__socket.onopen = function() {

					that.__isRunning = true;
					that.trigger('connect', []);

				};

				this.__socket.onmessage = function(event) {

					var blob = null;
					if (that.__isBinary === true && event.data instanceof ArrayBuffer) {

						var bytes = new Uint8Array(event.data);
						blob = String.fromCharCode.apply(null, bytes);

						_receive_handler.call(that, blob, true);

					} else {

						blob = event.data;

						_receive_handler.call(that, blob, false);

					}

				};

				this.__socket.onclose = function(event) {

					that.__socket    = null;
					that.__isRunning = false;
					_cleanup_services.call(that);

					that.trigger('disconnect', [ event.code, Client.STATUS[event.code] || null ]);


					if (that.reconnect > 0) {

						setTimeout(function() {
							that.listen(that.port, that.host);
						}, that.reconnect);

					}

				};

			};


			_send_handler = function(data) {

				var blob = this.__encoder(data);
				if (this.__isBinary === true) {

					var bl    = blob.length;
					var bytes = new Uint8Array(bl);

					for (var b = 0; b < bl; b++) {
						bytes[b] = blob.charCodeAt(b);
					}

					blob = bytes.buffer;

				}


				this.__socket.send(blob);

			};

		} else if (typeof XMLHttpRequest === 'function') {

			if (typeof XMLHttpRequest.prototype.sendAsBinary !== 'function') {

				XMLHttpRequest.prototype.sendAsBinary = function(data) {

					var array = new Uint8Array(data.length);
					for (var d = 0, dl = data.length; d < dl; d++) {
						array[d] = (data.charCodeAt(d) & 0xff);
					}

					this.send(array.buffer);

				};

			}


			var _GET_encoder = function(data) {

				var count = 0;
				var str   = '';

				for (var key in parameters) {

					var value = parameters[key];
					if (value instanceof Object) {
						value = this.__encoder(parameters[key]);
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


			_listen_handler = function() {

				var that = this;


				this.__isRunning = true;

				setTimeout(function() {
					that.trigger('connect', []);
				}, 0);

			};


			_send_handler = function(data) {

				var that = this;

// TODO: This might be unnecessary if Keep-Alive works
				data.__random = '' + Date.now() + ('' + Math.random()).substr(3);

				var url    = 'http://' + this.host + ':' + this.port + '/api/' + data._serviceId;
				var method = data._serviceMethod || 'POST';
				if (method === 'GET') {
					url += _GET_encoder(data);
				}

				this.__socket = new XMLHttpRequest();
				this.__socket.open(method, url, true);


				if (this.__socket.responseType && typeof this.__socket.sendAsBinary === 'function') {
					this.__socket.responseType = 'arraybuffer';
					this.__isBinary = true;
				}


				this.__socket.setRequestHeader('Content-Type', 'application/json; charset=utf8');
				this.__socket.withCredentials = this.credentials === true;


// TODO: Integrate HTTP status codes to simulate Client.STATUS behaviour and disconnect events

				this.__socket.onload = function() {

console.log('HTTP socket load event!', this.response);

					var blob = null;
					if (that.__isBinary === true) {

						var bytes = new Uint8Array(this.response);
						blob = String.fromCharCode.apply(null, bytes);

						_receive_handler.call(that, blob, true);

					} else {

						blob = this.response;

						_receive_handler.call(that, blob, false);

					}

				};

				this.__socket.onerror = function() {

					that.__socket    = null;
					that.__isRunning = false;
					_cleanup_services.call(that);

					that.trigger('disconnect', [ 1002, Client.STATUS[1002] || null ]);


					if (that.reconnect > 0) {

						setTimeout(function() {
							that.listen(that.port, that.host);
						}, that.reconnect);

					}

				};

				this.__socket.ontimeout = function() {

					that.__socket    = null;
					that.__isRunning = false;
					_cleanup_services.call(that);

					that.trigger('disconnect', [ 1001, Client.STATUS[1001] || null ]);


					if (that.reconnect > 0) {

						setTimeout(function() {
							that.listen(that.port, that.host);
						}, that.reconnect);

					}

				};


				if (method === 'GET') {

					this.__socket.send(null);

				} else {

					var blob = this.__encoder(data);
					if (this.__isBinary === true) {
						this.__socket.sendAsBinary(blob);
					} else {
						this.__socket.send(blob);
					}

				}

			}

		}

	})();



	/*
	 * HELPERS
	 */


	var _receive_handler = function(blob, isBinary) {

		var data = null;
		try {
			data = this.__decoder(blob);
		} catch(e) {
			// Unsupported data encoding
			return false;
		}


		if (data instanceof Object && typeof data._serviceId === 'string') {

			var service = this.getService(data._serviceId);
			var event   = data._serviceEvent  || null;
			var method  = data._serviceMethod || null;


			if (method !== null) {

				if (method.charAt(0) === '@') {

					if (method === '@plug') {
						_plug_service.call(this, data._serviceId, service);
					} else if (method === '@unplug') {
						_unplug_service.call(this, data._serviceId, service);
					}

				} else if (service !== null && typeof service[method] === 'function') {

					// Remove data frame service header
					delete data._serviceId;
					delete data._serviceMethod;

					service[method](data);

				}

			} else if (event !== null) {

				if (service !== null && typeof service.trigger === 'function') {

					// Remove data frame service header
					delete data._serviceId;
					delete data._serviceEvent;

					service.trigger(event, [ data ]);

				}

			}

		} else {

			this.trigger('receive', [ data ]);

		}


		return true;

	};

	var _is_service_waiting = function(service) {

		for (var w = 0, wl = this.__services.waiting.length; w < wl; w++) {

			if (this.__services.waiting[w] === service) {
				return true;
			}

		}

		return false;

	};

	var _is_service_active = function(service) {

		for (var a = 0, al = this.__services.active.length; a < al; a++) {

			if (this.__services.active[a] === service) {
				return true;
			}

		}

		return false;

	};

	var _plug_service = function(id, service) {

		id = typeof id === 'string' ? id : null;

		if (id === null || service === null) {
			return;
		}


		var found = false;

		for (var w = 0, wl = this.__services.waiting.length; w < wl; w++) {

			if (this.__services.waiting[w] === service) {
				this.__services.waiting.splice(w, 1);
				found = true;
				wl--;
				w--;
			}

		}


		if (found === true) {

			this.__services.active.push(service);

			service.trigger('plug', []);

			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Client: Remote plugged Service (' + id + ')');
			}

		}

	};

	var _unplug_service = function(id, service) {

		id = typeof id === 'string' ? id : null;

		if (id === null || service === null) {
			return;
		}


		var found = false;

		for (var a = 0, al = this.__services.active.length; a < al; a++) {

			if (this.__services.active[a] === service) {
				this.__services.active.splice(a, 1);
				found = true;
				al--;
				a--;
			}

		}


		if (found === true) {

			service.trigger('unplug', []);

			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Client: Remote unplugged Service (' + id + ')');
			}

		}

	};

	var _cleanup_services = function() {

		for (var a = 0, al = this.__services.active.length; a < al; a++) {
			this.__services[a].trigger('unplug', []);
		}

		if (RESTsocket.debug === true) {
			console.log('RESTsocket.io.Client: Remote disconnected');
		}


		this.__services.waiting = [];
		this.__services.active  = [];

	};



	/*
	 * IMPLEMENTATION
	 */

	var Client = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.port        = 8080;
		this.host        = 'localhost';
		this.credentials = settings.credentials === true;
		this.reconnect   = 0;

		this.__encoder   = settings.codec instanceof Object ? settings.codec.encode : JSON.stringify;
		this.__decoder   = settings.codec instanceof Object ? settings.codec.decode : JSON.parse;
		this.__socket    = null;
		this.__services  = {
			waiting: [],
			active:  []
		};

		this.__isBinary  = false;
		this.__isRunning = false;

		this.___events   = {};

		settings = null;

	};


	Client.STATUS = {
		1000: 'Normal Closure',
		1001: 'Going Away',
		1002: 'Protocol Error',
		1003: 'Unsupported Data',
		1005: 'No Status Received',
		1006: 'Abnormal Closure',
		1008: 'Policy Violation',
		1009: 'Message Too Big',
		1011: 'Internal Error',
		1012: 'Service Restart',
		1013: 'Try Again Later'
	};


	Client.prototype = {

		/*
		 * CUSTOM API
		 */

		listen: function(port, host) {

			if (this.__socket !== null) return false;


			this.port = typeof port === 'number' ? port : this.port;
			this.host = typeof host === 'string' ? host : this.host;


			if (this.__isRunning === true) {
				return false;
			}


			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Client: Listening on ' + this.host + ':' + this.port);
			}


			_listen_handler.call(this);

			return true;

		},

		send: function(data, service) {

			data    = data instanceof Object    ? data    : null;
			service = service instanceof Object ? service : null;


			if (data === null || this.__isRunning === false) {
				return false;
			}


			if (service !== null) {

				if (typeof service.id     === 'string') data._serviceId    = service.id;
				if (typeof service.event  === 'string') data._serviceEvent = service.event;

				if (typeof service.method === 'string') {

					if (service.method.toUpperCase().match(/OPTIONS|GET|PUT|POST|DELETE/)) {
						data._serviceMethod = service.method.toUpperCase();
					} else {
						data._serviceMethod = null;
					}

				}

			}


			_send_handler.call(this, data);

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

			service = service instanceof RESTsocket.io.Service ? service : null;


			if (service !== null) {

				if (_is_service_waiting.call(this, service) === false && _is_service_active.call(this, service) === false) {

					this.__services.waiting.push(service);

					// Please, Remote, plug Service!
					this.send({}, {
						id:     service.id,
						method: '@plug'
					});

					return true;

				}

			}


			return false;

		},

		getService: function(id) {

			id = typeof id === 'string' ? id : null;


			if (id !== null) {

				for (var w = 0, wl = this.__services.waiting.length; w < wl; w++) {

					var wservice = this.__services.waiting[w];
					if (wservice.id === id) {
						return wservice;
					}

				}

				for (var a = 0, al = this.__services.active.length; a < al; a++) {

					var aservice = this.__services.active[a];
					if (aservice.id === id) {
						return aservice;
					}

				}

			}


			return null;

		},

		removeService: function(service) {

			service = service instanceof RESTsocket.io.Service ? service : null;


			if (service !== null) {

				if (_is_service_waiting.call(this, service) === true || _is_service_active.call(this, service) === true) {

					// Please, Remote, unplug Service!
					this.send({}, {
						id:     service.id,
						method: '@unplug'
					});

					return true;

				}

			}


			return false;

		}

	};


	RESTsocket.extend(Client.prototype);
	RESTsocket.io.Client = Client;

})(typeof global !== 'undefined' ? global : this, RESTsocket);



var RESTsocket;

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

	var RS = {

		debug:  false,
		extend: function(proto) {

			for (var prop in _event_interface) {
				proto[prop] = _event_interface[prop];
			}

		},

		codec: {

			BitON: null,
			JSON:  null

		},

		io: {

			Client:  null,
			Server:  null,
			Service: null

		}

	};


	if (typeof module !== 'undefined') {
		module.exports    = RS;
	} else {
		global.RESTsocket = RS;
	}


	RESTsocket = RS;

})(typeof global !== 'undefined' ? global : this);


(function(global, RESTsocket) {

	/*
	 * HELPERS
	 */

	var CHAR_TABLE = new Array(256);
	for (var c = 0; c < 256; c++) {
		CHAR_TABLE[c] = String.fromCharCode(c);
	}


	var MASK_TABLE = new Array(9);
	var POW_TABLE  = new Array(9);
	var RPOW_TABLE = new Array(9);
	for (var m = 0; m < 9; m++) {
		POW_TABLE[m]  = Math.pow(2, m) - 1;
		MASK_TABLE[m] = ~(POW_TABLE[m] ^ 0xff);
		RPOW_TABLE[m] = Math.pow(10, m);
	}


	var _resolve_constructor = function(identifier, scope) {

		var pointer = scope;

		var ns = identifier.split('.');
		for (var n = 0, l = ns.length; n < l; n++) {

			var name = ns[n];

			if (pointer[name] !== undefined) {
				pointer = pointer[name];
			} else {
				pointer = null;
				break;
			}

		}


		return pointer;

	};



	var _stream = function(buffer, mode) {

		this.__buffer    = typeof buffer === 'string' ? buffer : '';
		this.__mode      = typeof mode === 'number' ? mode : null;

		this.__pointer   = 0;
		this.__value     = 0;
		this.__remaining = 8;
		this.__index     = 0;

		if (this.__mode === _stream.MODE.read) {
			this.__value = this.__buffer.charCodeAt(this.__index);
		}

	};

	_stream.MODE = {
		read:  0,
		write: 1
	};

	_stream.prototype = {

		buffer: function() {
			return this.__buffer;
		},

		pointer: function() {
			return this.__pointer;
		},

		length: function() {
			return this.__buffer.length * 8;
		},

		read: function(bits) {

			var overflow = bits - this.__remaining;
			var captured = this.__remaining < bits ? this.__remaining : bits;
			var shift    = this.__remaining - captured;


			var buffer = (this.__value & MASK_TABLE[this.__remaining]) >> shift;


			this.__pointer   += captured;
			this.__remaining -= captured;


			if (this.__remaining === 0) {

				this.__value      = this.__buffer.charCodeAt(++this.__index);
				this.__remaining  = 8;

				if (overflow > 0) {
					buffer = buffer << overflow | ((this.__value & MASK_TABLE[this.__remaining]) >> (8 - overflow));
					this.__remaining -= overflow;
				}

			}


			return buffer;

		},

		readRAW: function(bytes) {

			if (this.__remaining !== 8) {

				this.__index++;
				this.__value     = 0;
				this.__remaining = 8;

			}


			var buffer = '';

			if (this.__remaining === 8) {

				buffer        += this.__buffer.substr(this.__index, bytes);
				this.__index  += bytes;
				this.__value   = this.__buffer.charCodeAt(this.__index);

			}


			return buffer;

		},

		write: function(buffer, bits) {

			var overflow = bits - this.__remaining;
			var captured = this.__remaining < bits ? this.__remaining : bits;
			var shift    = this.__remaining - captured;


			if (overflow > 0) {
				this.__value += buffer >> overflow << shift;
			} else {
				this.__value += buffer << shift;
			}


			this.__pointer   += captured;
			this.__remaining -= captured;


			if (this.__remaining === 0) {

				this.__buffer    += CHAR_TABLE[this.__value];
				this.__remaining  = 8;
				this.__value      = 0;

				if (overflow > 0) {
					this.__value     += (buffer & POW_TABLE[overflow]) << (8 - overflow);
					this.__remaining -= overflow;
				}

			}

		},

		writeRAW: function(buffer) {

			if (this.__remaining !== 8) {

				this.__buffer   += CHAR_TABLE[this.__value];
				this.__value     = 0;
				this.__remaining = 8;

			}

			if (this.__remaining === 8) {

				this.__buffer  += buffer;
				this.__pointer += buffer.length * 8;

			}

		},

		close: function() {

			if (this.__mode === _stream.MODE.write) {

				if (this.__value > 0) {
					this.__buffer += CHAR_TABLE[this.__value];
					this.__value   = 0;
				}


				// 0: Boolean or Null or EOS
				this.write(0, 3);
				// 00: EOS
				this.write(0, 2);

			}

		}

	};



	/*
	 * ENCODER and DECODER
	 */

	var _encode = function(stream, data) {

		// 0: Boolean or Null or EOS
		if (typeof data === 'boolean' || data === null) {

			stream.write(0, 3);

			if (data === null) {
				stream.write(1, 2);
			} else if (data === false) {
				stream.write(2, 2);
			} else if (data === true) {
				stream.write(3, 2);
			}


		// 1: Integer, 2: Float
		} else if (typeof data === 'number') {

			var type = 1;
			if (data < 268435456 && data !== (data | 0)) {
				type = 2;
			}


			stream.write(type, 3);


			// Negative value
			var sign = 0;
			if (data < 0) {
				data = -data;
				sign = 1;
			}


			// Float only: Calculate the integer value and remember the shift
			var shift = 0;

			if (type === 2) {

				var step = 10;
				var m    = data;
				var tmp  = 0;


				// Calculate the exponent and shift
				do {

					m     = data * step;
					step *= 10;
					tmp   = m | 0;
					shift++;

				} while (m - tmp > 1 / step && shift < 8);


				step = tmp / 10;

				// Recorrect shift if we are > 0.5
				// and shift is too high
				if (step === (step | 0)) {
					tmp = step;
					shift--;
				}

				data = tmp;

			}



			if (data < 2) {

				stream.write(0, 4);
				stream.write(data, 1);

			} else if (data < 16) {

				stream.write(1, 4);
				stream.write(data, 4);

			} else if (data < 256) {

				stream.write(2, 4);
				stream.write(data, 8);

			} else if (data < 4096) {

				stream.write(3, 4);
				stream.write(data >>  8 & 0xff, 4);
				stream.write(data       & 0xff, 8);

			} else if (data < 65536) {

				stream.write(4, 4);
				stream.write(data >>  8 & 0xff, 8);
				stream.write(data       & 0xff, 8);

			} else if (data < 1048576) {

				stream.write(5, 4);
				stream.write(data >> 16 & 0xff, 4);
				stream.write(data >>  8 & 0xff, 8);
				stream.write(data       & 0xff, 8);

			} else if (data < 16777216) {

				stream.write(6, 4);
				stream.write(data >> 16 & 0xff, 8);
				stream.write(data >>  8 & 0xff, 8);
				stream.write(data       & 0xff, 8);

			} else if (data < 268435456) {

				stream.write(7, 4);
				stream.write(data >> 24 & 0xff, 8);
				stream.write(data >> 16 & 0xff, 8);
				stream.write(data >>  8 & 0xff, 8);
				stream.write(data       & 0xff, 8);

			} else {

				stream.write(8, 4);

				_encode(stream, data.toString());

			}



			stream.write(sign, 1);


			// Float only: Remember the shift for precision
			if (type === 2) {
				stream.write(shift, 4);
			}


		// 3: String
		} else if (typeof data === 'string') {

			stream.write(3, 3);


			var l = data.length;

			// Write Size Field
			if (l > 65535) {

				stream.write(31, 5);

				stream.write(l >> 24 & 0xff, 8);
				stream.write(l >> 16 & 0xff, 8);
				stream.write(l >>  8 & 0xff, 8);
				stream.write(l       & 0xff, 8);

			} else if (l > 255) {

				stream.write(30, 5);

				stream.write(l >>  8 & 0xff, 8);
				stream.write(l       & 0xff, 8);

			} else if (l > 28) {

				stream.write(29, 5);

				stream.write(l, 8);

			} else {

				stream.write(l, 5);

			}


			stream.writeRAW(data);


		// 4: Start of Array
		} else if (data instanceof Array) {

			stream.write(4, 3);


			for (var d = 0, dl = data.length; d < dl; d++) {
				stream.write(0, 3);
				_encode(stream, data[d]);
			}

			// Write EOO marker
			stream.write(7, 3);


		// 5: Start of Object
		} else if (data instanceof Object && typeof data.serialize !== 'function') {

			stream.write(5, 3);

			for (var prop in data) {

				if (data.hasOwnProperty(prop)) {
					stream.write(0, 3);
					_encode(stream, prop);
					_encode(stream, data[prop]);
				}

			}

			// Write EOO marker
			stream.write(7, 3);


		// 6: Custom High-Level Implementation
		} else if (data instanceof Object && typeof data.serialize === 'function') {

			stream.write(6, 3);

			var blob = lychee.serialize(data);

			_encode(stream, blob);

			// Write EOO marker
			stream.write(7, 3);

		}

	};


	var _decode = function(stream) {

		var value  = undefined;
		var tmp    = 0;
		var errors = 0;
		var check  = 0;

		if (stream.pointer() < stream.length()) {

			var type = stream.read(3);


			// 0: Boolean or Null (or EOS)
			if (type === 0) {

				tmp = stream.read(2);

				if (tmp === 1) {
					value = null;
				} else if (tmp === 2) {
					value = false;
				} else if (tmp === 3) {
					value = true;
				}


			// 1: Integer, 2: Float
			} else if (type === 1 || type === 2) {

				tmp = stream.read(4);


				if (tmp === 0) {

					value = stream.read(1);

				} else if (tmp === 1) {

					value = stream.read(4);

				} else if (tmp === 2) {

					value = stream.read(8);

				} else if (tmp === 3) {

					value = (stream.read(4) <<  8) + stream.read(8);

				} else if (tmp === 4) {

					value = (stream.read(8) <<  8) + stream.read(8);

				} else if (tmp === 5) {

					value = (stream.read(4) << 16) + (stream.read(8) <<  8) + stream.read(8);

				} else if (tmp === 6) {

					value = (stream.read(8) << 16) + (stream.read(8) <<  8) + stream.read(8);

				} else if (tmp === 7) {

					value = (stream.read(8) << 24) + (stream.read(8) << 16) + (stream.read(8) <<  8) + stream.read(8);

				} else if (tmp === 8) {

					var str = _decode(stream);

					value = parseInt(str, 10);

				}


				// Negative value
				var sign = stream.read(1);
				if (sign === 1) {
					value = -1 * value;
				}


				// Float only: Shift it back by the precision
				if (type === 2) {
					var shift = stream.read(4);
					value /= RPOW_TABLE[shift];
				}


			// 3: String
			} else if (type === 3) {

				var size = stream.read(5);

				if (size === 31) {

					size = (stream.read(8) << 24) + (stream.read(8) << 16) + (stream.read(8) <<  8) + stream.read(8);

				} else if (size === 30) {

					size = (stream.read(8) <<  8) + stream.read(8);

				} else if (size === 29) {

					size = stream.read(8);

				}


				value = stream.readRAW(size);


			// 4: Array
			} else if (type === 4) {

				value = [];


				while (errors === 0) {

					check = stream.read(3);

					if (check === 0) {
						value.push(_decode(stream));
					} else if (check === 7) {
						break;
					} else {
						errors++;
					}

				}


			// 5: Object
			} else if (type === 5) {

				value = {};


				while (errors === 0) {

					check = stream.read(3);

					if (check === 0) {
						value[_decode(stream)] = _decode(stream);
					} else if (check === 7) {
						break;
					} else {
						errors++;
					}

				}

			// 6: Custom High-Level Implementation
			} else if (type === 6) {

				var blob = _decode(stream);

				value = lychee.deserialize(blob);
				check = stream.read(3);

				if (check !== 7) {
					value = undefined;
				}

			}

		}


		return value;

	};



	/*
	 * IMPLEMENTATION
	 */

	RESTsocket.codec.BitON = {

		encode: function(data) {

			var stream = new _stream('', _stream.MODE.write);

			_encode(stream, data);

			stream.close();


			var value = stream.buffer();
			if (value !== '') {
				return value;
			}

			return null;

		},

		decode: function(blob) {

			var stream = new _stream(blob, _stream.MODE.read);

			var value = _decode(stream);
			if (value !== undefined) {
				return value;
			}

			return null;

		}

	};

})(typeof global !== 'undefined' ? global : this, RESTsocket);


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


(function(global, RESTsocket) {

	var _id = 0;

	var Service = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.id          = typeof settings.id === 'string' ? settings.id : ('service-' + _id++);
		this.credentials = settings.credentials === true;
		this.tunnel      = null;

		this.___events   = {};

	};


	Service.prototype = {

		setTunnel: function(tunnel) {

			if (tunnel instanceof RESTsocket.io.Client || tunnel instanceof RESTsocket.io.Remote) {

				this.tunnel = tunnel;

				return true;

			}


			return false;

		}

	};


	RESTsocket.extend(Service.prototype);
	RESTsocket.io.Service = Service;

})(typeof global !== 'undefined' ? global : this, RESTsocket);


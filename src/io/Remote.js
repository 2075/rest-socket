
(function(global, RESTsocket) {

	/*
	 * HELPERS
	 */

	var _receive_handler = function(data) {

		if (data instanceof Object && typeof data._serviceId === 'string') {

			var service = _get_service_by_id.call(this, data._serviceId);
			var event   = data._serviceEvent  || null;
			var method  = data._serviceMethod || null;

			if (method !== null) {

				if (method.charAt(0) === '@') {

					if (method === '@plug') {
						_plug_service.call(this,   data._serviceId, service);
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

	};

	var _get_service_by_id = function(id) {

		for (var s = 0, sl = this.__services.length; s < sl; s++) {

			var service = this.__services[s];
			if (service.id === id) {
				return service;
			}

		}


		return null;

	};

	var _plug_service = function(id, service) {

		id = typeof id === 'string' ? id : null;


		if (id === null || service !== null) {
			return;
		}


		var construct = this.__servicesmap[id] || null;
		if (typeof construct === 'function') {

			service = new construct(this);
			this.__services.push(service);

			service.trigger('plug', []);

			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Remote: Plugged service (' + service.id + ')');
			}


			// Okay, Client, plugged Service! PONG
			this.send({}, {
				id:     service.id,
				method: '@plug'
			});

		} else {

			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Remote: Unplugged service (' + id + ')');
			}


			// Nope, Client, unplug invalid Service! PONG
			this.send({}, {
				id:     id,
				method: '@unplug'
			});

		}

	};

	var _unplug_service = function(id, service) {

		id = typeof id === 'string' ? id : null;


		if (id === null || service === null) {
			return;
		}


		var found = false;

		for (var s = 0, sl = this.__services.length; s < sl; s++) {

			if (this.__services[s].id === id) {
				this.__services.splice(s, 1);
				found = true;
				sl--;
				s--;
			}

		}


		if (found === true) {

			service.trigger('unplug', []);

			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Remote: Unplugged service (' + id + ')');
			}


			this.send({}, {
				id:     id,
				method: '@unplug'
			});

		}

	};

	var _cleanup_services = function() {

		var services = this.__services;

		for (var s = 0; s < services.length; s++) {
			services[s].trigger('unplug', []);
		}

		this.__services = [];

	};



	/*
	 * IMPLEMENTATION
	 */

	var Remote = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.waiting       = true;

		this.__codec       = settings.codec instanceof Object ? settings.codec : RESTsocket.codec.JSON;
		this.__socket      = null;

		this.__services    = [];
		this.__servicesmap = {};

		this.___events     = {};

		settings = null;

	};


	Remote.STATUS = {
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


	Remote.prototype = {

		/*
		 * PUBLIC API
		 */

		accept: function() {

			if (this.waiting === true) {

				this.waiting = false;

				return true;

			}


			return false;

		},

		reject: function() {

			if (this.waiting === true) {

				this.disconnect();
				this.waiting = false;

				return true;

			}


			return false;

		},

		setService: function(id, construct) {

			id = typeof id === 'string' ? id : null;


			// TODO: Other way to validate service templates
			if (construct instanceof Function) {

				if (id !== null) {

					this.__servicesmap[id] = construct;

					return true;

				}

			}


			return false;

		},

		send: function(data, service) {

			data    = data instanceof Object    ? data    : null;
			service = service instanceof Object ? service : null;


			if (data === null || this.__protocol.isConnected() === false) {
				return false;
			}


			if (service !== null) {

				if (typeof service.id     === 'string') data._serviceId     = service.id;
				if (typeof service.event  === 'string') data._serviceEvent  = service.event;
				if (typeof service.method === 'string') data._serviceMethod = service.method;

			}


			var blob = this.__codec.encode(data);
			if (blob !== null) {
				return this.trigger('send', [ blob ]);
			}


			return false;

		},

		receive: function(blob) {

			var data = this.__codec.decode(blob);
			if (data !== null) {

				_receive_handler.call(this, blob);

				return true;

			}


			return false;

		},

		disconnect: function() {
			return this.trigger('disconnect', []);
		}

	};


	RESTsocket.extend(Remote.prototype);
	RESTsocket.io.Remote = Remote;

})(typeof global !== 'undefined' ? global : this, RESTsocket);


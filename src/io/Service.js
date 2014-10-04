
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


	RESTsocket.event(Service.prototype);
	RESTsocket.io.Service = Service;

})(typeof global !== 'undefined' ? global : this, RESTsocket);


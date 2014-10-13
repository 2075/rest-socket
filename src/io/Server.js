
(function(global, RESTsocket) {

	var crypto = require('crypto');
	var http   = require('http');
	var zlib   = require('zlib');



	/*
	 * HELPERS
	 */

	var _get_websocket_headers = function(httpheaders) {

		var wsheaders = {
			host:    httpheaders.host,
			origin:  httpheaders.origin || null,
			version: +httpheaders.version || 0
		};


		for (var prop in httpheaders) {

			if (prop.substr(0, 14) === 'sec-websocket-') {
				wsheaders[prop.substr(14)] = httpheaders[prop];
			}

		}


		if (wsheaders.version) {
			return wsheaders;
		}


		return null;

	};

	var _get_websocket_handshake = function(request) {

		var headers = _get_websocket_headers(request.headers);
		if (headers !== null && headers.origin !== null) {

			var handshake = '';
			var sha1      = crypto.createHash('sha1');


			sha1.update(headers.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');


			handshake += 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n';
			handshake += 'Upgrade: WebSocket\r\n';
			handshake += 'Connection: Upgrade\r\n';

			handshake += 'Sec-WebSocket-Version: ' + headers.version       + '\r\n';
			handshake += 'Sec-WebSocket-Origin: '  + headers.origin        + '\r\n';
			handshake += 'Sec-WebSocket-Accept: '  + sha1.digest('base64') + '\r\n';

			handshake += '\r\n';


			return handshake;

		}


		return null;

	};

	var _write_rest_response = function(socket, blob, gzipped) {

		var status = 200;
		if (blob === null) {
			status = 500;
			blob   = 'null';
		}


		if (gzipped === true) {

			zlib.gzip(blob, function(err, buffer) {

				if (err) {

					socket.writeHead(status, {
						'Content-Type':                'application/json',
						'Content-Length':              blob.length,
						'Access-Control-Allow-Origin': '*'
					});

					socket.write(blob);

				} else {

					socket.writeHead(status, {
						'Content-Type':                'application/json',
						'Content-Encoding':            'gzip',
						'Content-Length':              buffer.length,
						'Access-Control-Allow-Origin': '*'
					});

					socket.write(buffer);

				}

				socket.end();

			});

		} else {

			socket.writeHead(status, {
				'Content-Type':                'application/json',
				'Content-Length':              blob.length,
				'Access-Control-Allow-Origin': '*'
			});

			socket.write(blob);

			socket.end();

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var Server = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.port        = 8080;
		this.host        = 'localhost';
		this.credentials = settings.credentials === true;

		this.__encoder   = settings.codec instanceof Object ? settings.codec.encode : JSON.stringify;
		this.__decoder   = settings.codec instanceof Object ? settings.codec.decode : JSON.parse;
		this.__socket    = null;
		this.__remotes   = [];
		this.__services  = [];

		this.___events   = {};

		settings = null;

	};


	Server.prototype = {

		listen: function(port, host) {

			if (this.__socket !== null) return false;


			port = typeof port === 'number' ? port : 1337;
			host = typeof host === 'string' ? host : null;


			if (RESTsocket.debug === true) {
				console.log('RESTsocket.io.Server: Listening on ' + host + ':' + port);
			}


			var that = this;


			this.__socket = new http.Server();

			this.__socket.on('upgrade', function(request, socket) {

				var upgrade = ('' + request.headers.upgrade).toLowerCase();
				if (upgrade === 'websocket') {

					var connection = ('' + request.headers.connection).toLowerCase();
					if (connection.indexOf('upgrade') !== -1) {

						var handshake = _get_websocket_handshake(request);
						if (handshake !== null) {

							socket.write(handshake, 'ascii');
							socket.setTimeout(0);
							socket.setNoDelay(true);
							socket.setKeepAlive(true, 0);
							socket.removeAllListeners('timeout');


							socket.end();

/*


							var remote = new RESTsocket.io.Remote();

							remote.bind('send', function(senddata) {

								var sendblob = null;
								try {
									sendblob = JSON.stringify(senddata);
								} catch(e) {
								}

								_write_websocket_response(socket, sendblob);

							}, this);

console.log('SPAWNING WEBSOCKET REMOTE NAO');

// TODO: Spawn Remote in WebSocket Mode


*/

						}

					}

				}

			});


			this.__socket.on('request', function(request, socket) {

// TODO: Reuse socket for further requests
// socket.setTimeout(0);

				if (request.method === 'OPTIONS') {

					var credentials = that.credentials ? 'true' : 'false';
					var origin      = request.headers['origin'];


					socket.writeHead(200, {
						'Content-Type':                     'application/json',
						'Vary':                             'Origin',
						'Access-Control-Allow-Headers':     'Origin, Content-Type',
						'Access-Control-Allow-Credentials': '' + credentials,
						'Access-Control-Allow-Origin':      '*',
						'Access-Control-Allow-Methods':     'GET,PUT,POST,DELETE',
						'Access-Control-Max-Age':           60 * 60
					});

					socket.write('{}');
					socket.end();

				} else {

					var gzipped     = !!((request.headers['accept-encoding'] || '').match(/\bgzip\b/));
					var receiveblob = '';

					request.on('data', function(chunk) {
						receiveblob += chunk;
					});

					request.on('end', function() {

						var remote = new RESTsocket.io.Remote();

						remote.bind('send', function(senddata) {

							var sendblob = null;
							try {
								sendblob = JSON.stringify(senddata);
							} catch(e) {
							}

							_write_rest_response(socket, sendblob, gzipped);

						});


						that.trigger('connect', [ remote ]);


						var receivedata = null;
						try {
							receivedata = JSON.parse(receiveblob);
						} catch(e) {
						}


						if (receivedata !== null) {

							remote.trigger('receive', [ receivedata ]);

						} else {

							_write_rest_response(socket, null, gzipped);

						}

					});

				}

			});

			this.__socket.on('error', function(err) {

				if (RESTsocket.debug === true) {
					console.error('RESTsocket.io.Server: Error "' + err + '" on ' + host + ':' + port);
				}

				try {
					that.__socket.close();
				} catch(e) {
				}

			});

			this.__socket.on('close', function() {
				that.__socket = null;
			});

			this.__socket.listen(port, host);

		}

	};


	RESTsocket.extend(Server.prototype);
	RESTsocket.io.Server = Server;

})(typeof global !== 'undefined' ? global : this, RESTsocket);


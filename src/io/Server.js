
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



	/*
	 * IMPLEMENTATION
	 */

	var Server = function(settings) {

		settings = settings instanceof Object ? settings : {};


		this.port      = 8080;
		this.host      = 'localhost';

		this.__encoder = settings.codec instanceof Object ? settings.codec.encode : JSON.stringify;
		this.__decoder = settings.codec instanceof Object ? settings.codec.decode : JSON.parse;
		this.__socket  = null;
		this.__remotes = [];

		this.___events = {};

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

console.log('SPAWNING WEBSOCKET REMOTE NAO');

// TODO: Spawn Remote in WebSocket Mode

/*
							var remote = new _Remote(
								socket,
								this.__encoder,
								this.__decoder
							);

							this.connect(remote);
*/

						}

					}

				}

			});


// TODO: Spawn temporary Remote_HTTP on each request
// TODO: Evaluate if socket can be reused for further requests

			this.__socket.on('request', function(request, socket) {

console.log('NEW REQUEST');

				var body = '';

				request.on('data', function(chunk) {

console.log('REQUEST DATA', chunk);

					body += chunk;
				});

				request.on('end', function() {

console.log('REQUEST END', body);

socket.end();

/*

					var response = {
						async:   false,
						status:  0,
						header:  {},
						content: '',
						ready:   function() {

							var data = this;

							if (data.status === 304) {

								socket.writeHead(304);
								socket.end();

							} else {

								var gzipped = !!((request.headers['accept-encoding'] || '').match(/\bgzip\b/));
								if (gzipped === true) {

									zlib.gzip(data.content, function(err, buffer) {

										if (err) {

											data.header['Content-Length'] = data.content.length;

											socket.writeHead(data.status, data.header);
											socket.write(data.content);

										} else {

											data.header['Content-Encoding'] = 'gzip';
											data.header['Content-Length']   = buffer.length;

											socket.writeHead(data.status, data.header);
											socket.write(buffer);

										}

										socket.end();

									});

								} else {

									data.header['Content-Length'] = data.content.length;

									socket.writeHead(data.status, data.header);
									socket.write(data.content);

									socket.end();

								}

							}

						}

					};


// TODO: Process API Modules and services


					if (response.async === false) {
						response.ready();
					}

*/

				});

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


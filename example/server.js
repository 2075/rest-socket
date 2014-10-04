
var RESTsocket = require('../build/node/RESTsocket.io.js');



/*
 * EXAMPLE SERVICE
 */

var service = new RESTsocket.io.Service({
	id:          'example',
	credentials: true
});

service.refresh = function(data) {

	console.log('Service.refresh() called.');
	console.log(data);


	var tunnel = this.tunnel;
	if (tunnel !== null) {

		tunnel.send({
			bar:   'qux'
		}, {
			id:    this.id,
			event: 'reply'
		});

	}

};



/*
 * EXAMPLE SERVER
 */

var server = new RESTsocket.io.Server({
	codec: RESTsocket.data.JSON
});

server.bind('connect', function(remote) {

	console.log('Remote connected.');

	remote.addService(service);
	remote.accept();

}, server);

server.bind('disconnect', function(remote) {

	console.log('Remote disconnected.');

	remote.removeService(service);

}, server);

server.listen(1337, 'localhost');



/*
 * ASSET SERVER
 */

var http = require('http');
var path = require('path');
var url  = require('url');
var fs   = require('fs');

http.createServer(function(request, response) {

	var uri      = url.parse(request.url).pathname;
	var filename = path.join(process.cwd(), uri);

	path.exists(filename, function(exists) {

		if (!exists) {

			response.writeHead(404, { "Content-Type": "text/plain" });
			response.write('404 Not Found\n');
			response.end();

		} else {

			if (fs.statSync(filename).isDirectory()) filename += '/index.html';

			fs.readFile(filename, 'binary', function(err, buffer) {

				if (err) {

					response.writeHead(500, { "Content-Type": "text/plain" });
					response.write(err + '\n');
					response.end();

				} else {

					response.writeHead(200);
					response.write(buffer, 'binary');
					response.end();

				}

			});

		}

	});


}).listen(8080);


console.log('Static file server running at\n => http://localhost:8080');



# RESTsocket.io

RESTsocket.io is a JavaScript library that offers a centralized
event-oriented service-based API for having either an HTTP socket
or Websocket REST service.

The (optional) binary encoding layer BitON allows better compression
compared to JSON. It is around 50% smaller and faster in all tested
cases, up to 200% speed of JSON.stringify and JSON.parse. String
serialization is around 100x the speed of JSON.


## Usage (client-side)

- Install RESTsocket.io via bower.

```bash
bower i https://github.com/LazerUnicorns/rest-socket/archive/master.tar.gz
```


- After you've installed the library, you are ready to use it.

```javascript
// Two ways for inclusion

// 1. CDNJS method (recommended):
// <script src="//cdnjs.cloudflare.com/ajax/libs/RESTsocket.io/0.0.1/RESTsocket.io.min.js"></script>

// 2. Local method:
// <script src="./components/restsocket.io/build/html/RESTsocket.io.min.js"></script>


var rs     = RESTsocket;
var client = new rs.io.Client({
	endpoint: '/api',
	codec:    rs.codec.BitON
});


// SERVICE API

var service = new rs.io.Service({
	id:          'myservice', // unique identifier
	credentials: true         // cookies allowed?
});

service.sync = function() {

	var tunnel = this.tunnel;
	if (tunnel !== null) {

		tunnel.send({
			foo:    'bar'
		}, {
			id:     this.id, // 'myservice'
			method: 'GET'    // get event
		});

	}

};

service.bind('plug', function() {
	console.log('myservice plugged, synchronizing nao ...');
	this.sync();
}, service);

service.bind('unplug', function() {
	console.log('myservice unplugged!');
}, this);


// CLIENT API

client.bind('connect', function() {
	console.log('Client connected, adding service ...');
	this.addService(service);
}, client);

client.bind('disconnect', function() {
	console.log('Client disconnected, removing service...');
	this.removeService(service);
}, client);

client.listen(1337, 'localhost');
```


## Usage (server-side)

- Install RESTsocket.io via npm.

```bash
npm i https://github.com/LazerUnicorns/rest-socket/archive/master.tar.gz -s
```


- After you've installed the library, you are ready to use it.

```javascript
var rs     = require('restsocket.io'); // activate debugging
var server = new rs.io.Server({
	endpoint: '/api',
	codec:    rs.codec.BitON
});


// SERVICE API

var service = new rs.io.Service({
	id:          'myservice', // unique identifier
	credentials: true         // cookies allowed?
});

service.GET = function(data) {

	console.log('GET() received data', data);


	var tunnel = this.tunnel;
	if (tunnel !== null) {

		tunnel.send({
			bar: 'qux'
		}, {
			id:     this.id,
			event: 'reply'
		});

	}

};


// SERVER API

server.bind('connect', function(remote) {
	console.log('Remote connected, adding service ...');
	remote.addService(service);
	remote.accept();
}, server);

server.bind('disconnect', function(remote) {
	console.log('Remote disconnected, removing service...');
	remote.removeService(service);
}, server);

server.listen(1337, 'localhost');
```

## Frequently Asked Questions

### How does it work?

- The basic requirement for a connection is an HTTP Keep-Alive socket.
- If your Browser is awesome, it will automatically send data as a binary buffer.
- If your Browser is even more awesome and allows using Websockets, it will automatically upgrade your connection.

### Does it work with shitty Internet Explorer or non-Websocket Browsers?

Yes. RESTsocketIO supports both HTTP Keep-Alive sockets **and**
Websockets as the underlying transport protocol.

### Will it work with HTTPS?

Yes, it will. You only have to offer the certificates if you don't
have an TLS/SSL-enabling proxy in between (like nginx). Take a look
at the [TLS example](./example/tls/).

### How can it stay REST compliant with other backends?

The example in this README file shows how to implement a service using
GET, POST, PUT, DELETE as the equivalent HTTP methods.
This is backwards-compatible to crappy REST backends.

If you want to be more awesome than the rest, use custom method names.
Those are using an HTTP bidirectional connection (also known as HTTP PUSH service).

### I have issues with binary GET, what should I do?

That's a shitty design in the HTTP GET RFC2616 specification that
doesn't allow transmitting a body with GET requests. Just switch to
POST, PUT, DELETE instead or use a custom method name.


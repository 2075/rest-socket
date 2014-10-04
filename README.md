
# RESTsocket.io

RESTsocket.io is a JavaScript library that offers a centralized
event-oriented service-based API for having either an HTTP socket
or Websocket REST service.

The (optional) binary encoding layer BitON allows better compression
compared to JSON. It is around 50% smaller and faster in all tested
cases, up to 200% speed of JSON.stringify and JSON.parse. String
serialization is around 100x the speed of JSON.


## Usage

```javascript
// Include this script in your HTML first (yes, don't use a protocol):
// <script src="//cdnjs.cloudflare.com/ajax/libs/RESTsocket.io/0.0.1/RESTsocket.io.min.js"></script>

var rsio   = RESTsocket.io;
var client = new rsio.Client({
	endpoint: '/api',
	encoder:  rsio.BitON.encode,
	decoder:  rsio.BitON.decode
});

client.listen(8080, 'localhost');


var service = new rsio.Service({
	id: 'myservice'
});
```

```javascript
// Use npm install "restsocket.io" in your project

var rsio   = require('restsocket.io')(true); // activate debugging
var server = new rsio.Server({
	endpoint: '/api',
	encoder:  rsio.BitON.encode,
	decoder:  rsio.BitON.decode
});

server.listen(8080, 'localhost');
```

## Frequently Asked Questions

### How does it work?

- The required minimum support is HTTP Keep-Alive.
- If your Browser is awesome and allows binary encoding using Uint8 Arrays, it will use the binary compression.
- If your Browser is even more awesome and allows using Websockets, it will automatically upgrade your connection.

### Will it work in old Internet Explorers or non-Websocket Browsers?

Yes, it will. RESTsocketIO supports both HTTP Keep-Alive sockets **and**
Websockets as a transport protocol.

### Will it work with HTTPS?

Yes, it will. You only have to offer the certificates if you don't
have an TLS/SSL-enabling proxy in between (like nginx). Take a look
at the [TLS example](./example/tls/).


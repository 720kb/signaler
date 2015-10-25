# Signaler
##### Manage webRTC connections without knowing how they work (more or less...).

This library exposes webRTC capabilities masquerading what has to be done for connecting peers to each other. As signaling server uses [Comunicator](https://github.com/720kb/comunicator).

The client could be used in AngularJS, via provider, or in plain javascript.

Signaler is developed by [720kb](http://720kb.net).

## Requirements

This implementation needs a browser that has:
- [webRTC](http://caniuse.com/#feat=rtcpeerconnection) implementation or [objectRTC](http://caniuse.com/#feat=objectrtc) implementation (using the library that exposes webRTC methods using ORTC);
- the [Comunicator](https://github.com/720kb/comunicator#requirements) requirements.

The AngularJS provider needs at least AngularJS version 1.2.

## Installation

Signaler could be installed via npm or bower

#### NPM
```sh
$ npm install --save siglr
```
#### Bower
```sh
$ bower install --save signaler
```

### Loading

#### Node.js side
In node.js you have to instantiate Signaler passing a _salt_ as showed here:
```javascript
var jwtSalt = '_super_secret_salt_12345';

require('siglr')(jwtSalt);
```
The _salt_ is used in conjunction with [jwt](https://tools.ietf.org/html/rfc7519) to sign messages, achieving integrity in what is sent.

By default the websocket used as signaling channel is bound on `0.0.0.0:9876` address, but it can be configured setting `COMUNICATOR_HOST` and `COMUNICATOR_PORT` to the preferred host and port.

For example:
- `COMUNICATOR_HOST='127.0.0.1'`;
- `COMUNICATOR_PORT=7546`:

That's all you have to do on the node.js side. The library will manage all practicable possible scenarios.

#### Client side
The files you need are:
- `dist/signaler.min.js` from this module and `dist/comunicator.min.js` from the [Comunicator](https://github.com/720kb/comunicator#installation) module for the plain javascript implementation;

- `dist/signaler-angular.min.js` from this module and `dist/comunicator-angular.min.js` from the [Comunicator](https://github.com/720kb/comunicator#installation) module for the AngularJS  implementation.

If you are about to use the AngularJS provider you have to include the module that brings the provider, for example:

```js
angular.module('app', [
  '720kb.signaler'
 ]);
```

### API

#### Plain javascript
`Signaler` is a `window` object. To use it you need to create an instance of it, for example:
```javascript
  var signaler = new window.Signaler(<backend comunicator url>, <media constraint object>, <sdp constraint object>);
```
The second and third parameters are respectively [media constraints object](https://w3c.github.io/mediacapture-main/getusermedia.html#dictionary-mediastreamconstraints-members) and [RTC offer/answer option object](http://www.w3.org/TR/webrtc/#idl-def-RTCOfferOptions). They have default values that perform audio/video stream.

The instantiated object returns a `Promise` that is resolved when the client websocket is correctly connected to the websocket server.

The resolved object has the property `myStream`: this is the stream associated to the client.

##### Methods
The resolved object exposes also these methods:
- `userIsPresent(whoami, token)`: this sends to signaling server who the client is and which jwt token will be used (it's a delegate of comunicator client [userIsPresent()](https://github.com/720kb/comunicator#methods) method);

- `createChannel(channel)`: this sends a request to signaler server to create the `channel` channel;

- `joinChannel(channel)`: this sends a request to signaler server to join the `channel` channel.

- `leaveChannel(channel, keepMyStream)`: this disconnects the signaler client from `channel`. If you want to keep the stream retrieved by `getUserMedia()` you have to pass a truthy value to `keepMyStream`;

Clients that are connected each other now can send data via a [Data Channel](https://developer.mozilla.org/en/docs/Web/API/RTCDataChannel), this is possible calling the methods:
- `sendTo(channel, who, what)`: this sends `what` to `who` in `channel`;

- `broadcast(channel, what)`: this sends `what` to everyone in `channel`.

If you want to establish an audio/video stream (specified by the previous defined constraints), first you have to get the client stream calling:
- `getUserMedia()`: this wraps the [getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) using the settings previously defined. Accepting the stream generates an `window` event that permits to continue the audio/video stream establishment procedure.

When the stream is retrieved, the client can send it calling the:
- `streamOnChannel(channel, who)`: this sends the client stream in `channel`.

If the client is the one who calls `createChannel()` then the stream is sent to everyone who is connected in `channel`; this is the default behaviour that can be altered specifying the `who` parameter. The result is that the stream will be sent only to `who`. On the other hand, if the client who calls `streamOnChannel()` is the one who calls `joinChannel()`, the stream will be always sent to the channel creator. `who` parameter is ignored in this scenario.

The channel creator can administrate the _joined_ users stream with the methods:
- `approve(channel, whoToApprove)`: this approves the `whoToApprove` stream in `channel`. The result is that the stream reaches everyone in `channel`;

- `unApprove(channel, whoToUnApprove)`: this unapproves the `whoToUnApprove` stream in `channel`. The result is that the `whoToUnApprove` stream will be removed to everyone in `channel` (excluding the channel creator).

Signaler client dispatches also events from `window`.

They are:
- `signaler:error`: dispatched when the handshake protocol finishes in an error state. The event payload contains the cause of the error as follows:
```javascript
  {
    'detail': <error>
  }
```

- `signaler:usermedia-error`: dispatched when the user blocks the _getUserMedia()_ revoking permission. The event payload contains the cause of the error as follows:
```javascript
  {
    'detail': <error>
  }
```

- `signaler:data-arrived`: dispatched when a message arrives from data channel. The informations about message are in the payload:
```javascript
  {
    'detail': {
      'payload': <message>,
      'whoami': <sender>,
      'channel': <channel>
    }
  }
```

- `signaler:datachannel-opened`: dispatched when a data channel is opened. The informations about the opened channel are in the event payload:
```javascript
  {
    'detail': {
      'whoami': <client connected>,
      'channel': <channel>
    }
  }
```

- `signaler:datachannel-closed`: dispatched when a data channel is closed. The informations about the closed channel are in the event payload:
```javascript
  {
    'detail': {
      'whoami': <client gone>,
      'channel': <channel>
    }
  }
```

- `signaler:ready`: dispatched when the p2p connection between clients is completed. The event payload contains the informations about the connected client:
```javascript
  {
    'detail': {
      'channel': <channel>,
      'whoami': <client connected>
    }
  }
```

- `signaler:stream`: dispatched when a stream arrives from a client. The stream informations are in the event payload:
```javascript
  {
    'detail': {
      'userid': <client identifier>,
      'stream': <stream arrived>
    }
  }
```

- `signaler:end`: dispatched when a client stream is closed. The stream informations are in event payload:
```javascript
  {
    'detail': {
      'userid': <client identifier>
    }
  }
```

- `signaler:my-stream`: dispatched when local stream is ready (from _getUserMedia()_ call). The stream informations are in the event payload:
```javascript
  {
    'detail': {
      'userid': <local client identifier>,
      'stream': <local stream>
    }
  }
```

#### AngularJS

The provider exposes the `initSignaler(<backend comunicator url>, <media constraint object>, <sdp constraint object>)` that must be called to instantiate and configure the `Signaler` service.

Done that, the same object described for plain javascript is exposed as an AngularJS service.
The events `signaler:error`, `signaler:usermedia-error`, `signaler:data-arrived`, `signaler:datachannel-opened`, `signaler:datachannel-closed`, `signaler:ready`, `signaler:stream`, `signaler:end` and `signaler:my-stream` are emitted from $rootScope and can be used inside your AngularJS application.

## Contributing

We will be very grateful if you help us making this project grow up.
Feel free to contribute by forking, opening issues, pull requests etc.

## License

The MIT License (MIT)

Copyright (c) 2014 Dario Andrei, Filippo Oretti

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

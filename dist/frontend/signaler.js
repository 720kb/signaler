/**
* siglr
* 3.0.7
*
* 
* https://github.com/720kb/signaler
*
* MIT license
* Wed Mar 16 2016
*/

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('rxjs/Rx'), require('comunicator')) :
  typeof define === 'function' && define.amd ? define('signaler', ['exports', 'rxjs/Rx', 'comunicator'], factory) :
  (factory((global.signaler = global.signaler || {}),global.Rx,global.comunicator));
}(this, function (exports,Rx,comunicator) { 'use strict';

  Rx = 'default' in Rx ? Rx['default'] : Rx;

  var babelHelpers = {};

  babelHelpers.classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  babelHelpers.createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  babelHelpers.inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };

  babelHelpers.possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  babelHelpers;

  var rtcConfiguration = {
    'iceServers': [{
      'urls': 'stun:stun.l.google.com:19302'
    }, {
      'urls': 'stun:23.21.150.121'
    }]
  };
  var rtcOptions = {};
  var rtcDataChannelOptions = {};
  var iceCandidatesSym = Symbol('ice-candidates');
  var peerConnectionSym = Symbol('peer-connection');
  var dataChannelSym = Symbol('data-channel');
  var SignalerPeerConnection = function (_Rx$Observable) {
    babelHelpers.inherits(SignalerPeerConnection, _Rx$Observable);

    function SignalerPeerConnection(sdpConstr) {
      babelHelpers.classCallCheck(this, SignalerPeerConnection);


      if (!sdpConstr) {

        throw new Error('Manadatory spd constraints missing.');
      }

      var internalObservable = new Rx.Observable(function (subscriber) {
        var dataChannelError = function dataChannelError(error) {

          subscriber.error({
            'type': 'error',
            'cause': error
          });
        },
            dataChannelMessage = function dataChannelMessage(event) {

          if (event && event.data) {

            if ((typeof event.data === 'string' || String.prototype.isPrototypeOf(event.data)) && event.data.indexOf('_signaler') >= 0) {

              switch (event.data) {
                case '_signaler:got-stream?':
                  {

                    subscriber.next({
                      'type': 'add-stream'
                    });
                    break;
                  }
                default:
                  {

                    subscriber.error({
                      'type': 'warn',
                      'cause': 'Not interesting event atm'
                    });
                  }
              }
            } else {

              subscriber.next({
                'type': 'datachannel-message',
                'payload': event.data
              });
            }
          } else {

            subscriber.error({
              'type': 'error',
              'cause': 'Event data not present'
            });
          }
        },
            dataChannelOpen = function dataChannelOpen() {

          subscriber.next({
            'type': 'datachannel-opened'
          });
        },
            dataChannelClose = function dataChannelClose() {

          subscriber.next({
            'type': 'datachannel-closed'
          });
        };

        _this[peerConnectionSym] = new RTCPeerConnection(rtcConfiguration, rtcOptions);
        _this[dataChannelSym] = _this[peerConnectionSym].createDataChannel('signaler-datachannel', rtcDataChannelOptions);

        _this[dataChannelSym].onerror = dataChannelError;
        _this[dataChannelSym].onmessage = dataChannelMessage;
        _this[dataChannelSym].onopen = dataChannelOpen;
        _this[dataChannelSym].onclose = dataChannelClose;

        _this[peerConnectionSym].onicecandidate = function (event) {

          if (event.candidate) {

            _this[iceCandidatesSym].push(event.candidate);
          } else if (_this[iceCandidatesSym] && _this[iceCandidatesSym].length >= 0) {

            subscriber.next({
              'type': 'use-ice-candidates',
              'candidates': _this[iceCandidatesSym].splice(0, _this[iceCandidatesSym].length)
            });
          }
        };

        _this[peerConnectionSym].onaddstream = function (event) {

          if (!event || !event.stream) {

            return subscriber.error({
              'type': 'warning',
              'cause': 'No stream arrived'
            });
          }

          subscriber.next({
            'type': 'add-stream',
            'stream': event.stream
          });
        };

        _this[peerConnectionSym].onremovestream = function (event) {

          if (!event || !event.stream) {

            return subscriber.error({
              'type': 'warning',
              'cause': 'No stream arrived'
            });
          }

          subscriber.next({
            'type': 'remove-stream',
            'stream': event.stream
          });
        };

        _this[peerConnectionSym].onnegotiationneeded = function () {

          _this[peerConnectionSym].createOffer().then(function (offer) {

            subscriber.next({
              'type': 'offer',
              offer: offer
            });
            return _this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(offer));
          }).catch(function (error) {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          });
        };

        _this[peerConnectionSym].oniceconnectionstatechange = function (event) {

          if (!event || !event.target || !event.target.iceConnectionState) {

            return subscriber.error({
              'type': 'warning',
              'cause': 'ice connection state changed without event value'
            });
          }

          switch (event.target.iceConnectionState) {

            case 'connected':
            case 'completed':
              {

                subscriber.next({
                  'type': 'ready'
                });
                break;
              }

            default:
              {

                subscriber.next({
                  'type': 'ice-connection-state',
                  'state': event.target.iceConnectionState
                });
              }
          }
        };

        _this[peerConnectionSym].onsignalingstatechange = function (event) {

          if (!event || !event.target || !event.target.signalingState) {

            return subscriber.error({
              'type': 'error',
              'cause': 'signaling state changed without event value'
            });
          }

          switch (event.target.signalingState) {

            default:
              {

                subscriber.next({
                  'type': 'signaling-state',
                  'state': event.target.signalingState
                });
              }
          }
        };

        _this[peerConnectionSym].ondatachannel = function (event) {

          if (!event || !event.channel) {

            return subscriber.error({
              'type': 'error',
              'cause': 'channel in event is not present'
            });
          }

          event.channel.onerror = dataChannelError;
          event.channel.onmessage = dataChannelMessage;
          event.channel.onopen = dataChannelOpen;
          event.channel.onclose = dataChannelClose;
        };

        _this.setRemoteDescription = function (payload) {

          if (!_this[peerConnectionSym].remoteDescription.type) {

            var setRemoteDescriptionPromise = _this[peerConnectionSym].setRemoteDescription(new RTCSessionDescription(payload));

            if (!_this[peerConnectionSym].localDescription.type) {

              setRemoteDescriptionPromise.then(function () {

                return _this[peerConnectionSym].createAnswer(_this.sdpConstr);
              }).then(function (answer) {

                subscriber.next({
                  'type': 'answer',
                  answer: answer
                });
                return _this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(answer));
              }).catch(function (error) {

                subscriber.error({
                  'type': 'error',
                  'cause': error
                });
              });
            }
          }
        };

        return function () {

          _this[dataChannelSym].close();
          _this[peerConnectionSym].close();
        };
      }).share();

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(SignalerPeerConnection).call(this, function (observer) {

        var subscriptionToInternalObservable = internalObservable.subscribe(observer);

        return function () {

          subscriptionToInternalObservable.unsubscribe();
        };
      }));

      internalObservable.forEach(function (element) {
        return console.info(element);
      });

      _this[iceCandidatesSym] = [];
      _this.sdpConstr = sdpConstr;
      return _this;
    }

    babelHelpers.createClass(SignalerPeerConnection, [{
      key: 'addIceCandidates',
      value: function addIceCandidates(candidates) {
        var _this2 = this;

        if (candidates) {

          candidates.forEach(function (element) {
            return _this2[peerConnectionSym].addIceCandidate(new RTCIceCandidate(element));
          });
        } else {

          throw new Error('Invalid candidates');
        }
      }
    }, {
      key: 'dataChannel',
      get: function get() {

        if (!this[dataChannelSym]) {

          throw new Error('Datachannel is not created');
        }

        return this[dataChannelSym];
      }
    }]);
    return SignalerPeerConnection;
  }(Rx.Observable);

  var comunicatorSym = Symbol('comunicator');
  var myStreamSym = Symbol('my-stream');
  var userMediaConstraintsSym = Symbol('user-media-constraint');
  var sdpConstraintsSym = Symbol('sdp-constraints');
  var initiatorsSym = Symbol('initiators');
  var peersSym = Symbol('peers');
  var unknownPeerValue = 'unknown-peer';
  var getUserMediaConstraints = {
    'audio': true,
    'video': true
  };
  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };
  var Signaler = function (_Rx$Observable) {
    babelHelpers.inherits(Signaler, _Rx$Observable);

    function Signaler(websocketUrl) {
      var getUserMediaConstr = arguments.length <= 1 || arguments[1] === undefined ? getUserMediaConstraints : arguments[1];
      var sdpConstr = arguments.length <= 2 || arguments[2] === undefined ? sdpConstraints : arguments[2];
      babelHelpers.classCallCheck(this, Signaler);


      var internalObservable = new Rx.Observable(function (subscriber) {

        _this[comunicatorSym].filter(function (element) {
          return element.what && element.what.type === 'do-handshake';
        }).forEach(function (element) {

          if (element.whoami && element.what.channel) {
            var p2pConnection = new SignalerPeerConnection(sdpConstr);

            _this[initiatorsSym].set(element.what.channel, element.who);

            p2pConnection.filter(function (fromPeerConnection) {
              return fromPeerConnection.type === 'offer';
            }).forEach(function (fromPeerConnection) {
              return _this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'offer': fromPeerConnection.offer
              });
            });

            p2pConnection.filter(function (fromPeerConnection) {
              return fromPeerConnection.type === 'use-ice-candidates';
            }).forEach(function (fromPeerConnection) {
              return _this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'candidates': fromPeerConnection.candidates
              });
            });
            _this[peersSym].set(element.what.channel + '-' + element.who, p2pConnection);
          } else {

            window.setTimeout(function () {

              throw new Error('Missing sender and channel that are mandatory');
            });
          }
        });

        _this[comunicatorSym].filter(function (element) {
          return element.what && element.what.offer;
        }).forEach(function (element) {

          if (element.whoami && element.what.channel && element.what.offer) {
            var p2pConnection = undefined;

            if (_this[peersSym].has(element.what.channel + '-' + element.who)) {

              p2pConnection = _this[peersSym].get(element.what.channel + '-' + element.who);
            } else {
              p2pConnection = new SignalerPeerConnection(sdpConstr);

              _this[initiatorsSym].set(element.what.channel, element.whoami);
              _this[peersSym].set(element.what.channel + '-' + element.who, p2pConnection);
            }

            p2pConnection.filter(function (fromPeerConnection) {
              return fromPeerConnection.type === 'answer';
            }).forEach(function (fromPeerConnection) {
              return _this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'answer': fromPeerConnection.answer
              });
            });

            p2pConnection.filter(function (fromPeerConnection) {
              return fromPeerConnection.type === 'use-ice-candidates';
            }).forEach(function (fromPeerConnection) {
              return _this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'candidates': fromPeerConnection.candidates
              });
            });
            p2pConnection.setRemoteDescription(element.what.offer);
          } else {

            window.setTimeout(function () {

              throw new Error('Missing sender, channel and the offer that are mandatory');
            });
          }
        });

        _this[comunicatorSym].filter(function (element) {
          return element.what && element.what.answer;
        }).forEach(function (element) {

          if (element.whoami && element.what.channel && element.what.answer) {
            var p2pConnection = undefined;

            if (_this[peersSym].has(element.what.channel + '-' + element.who)) {

              p2pConnection = _this[peersSym].get(element.what.channel + '-' + element.who);
            } else {

              window.setTimeout(function () {

                throw new Error('The peer connection must be already enstablished');
              });
            }

            p2pConnection.setRemoteDescription(element.what.answer);
          } else {

            window.setTimeout(function () {

              throw new Error('Missing sender, channel and the answer that are mandatory');
            });
          }
        });

        _this[comunicatorSym].filter(function (element) {
          return element.what && element.what.candidates;
        }).forEach(function (element) {
          var p2pConnection = undefined;

          if (_this[peersSym].has(element.what.channel + '-' + element.who)) {

            p2pConnection = _this[peersSym].get(element.what.channel + '-' + element.who);
          } else {

            window.setTimeout(function () {

              throw new Error('The peer connection must be already enstablished');
            });
          }

          p2pConnection.addIceCandidates(element.what.candidates);
        });

        _this.getUserMedia = function () {

          navigator.mediaDevices.getUserMedia(_this.userMediaConstraints).then(function (localStream) {

            if (!_this[myStreamSym]) {

              subscriber.next({
                'type': 'my-stream',
                'stream': localStream
              });
              _this[myStreamSym] = localStream;
            }

            //TODO try to put the contextified audio
            //audioContext.createMediaStreamSource(myStream);
            //, contextifiedLocalStream = audioContext.createMediaStreamDestination();
          }).catch(function (error) {

            throw new Error(error);
          });
        };
      }).share();

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(Signaler).call(this, function (observer) {

        var subscriptionToInternalObservable = internalObservable.subscribe(observer);

        return function () {

          subscriptionToInternalObservable.unsubscribe();
        };
      }));

      _this[comunicatorSym] = new comunicator.Comunicator(websocketUrl);
      _this[userMediaConstraintsSym] = getUserMediaConstr;
      _this[sdpConstraintsSym] = sdpConstr;
      _this[peersSym] = new Map();
      _this[initiatorsSym] = new Map();
      return _this;
    }

    babelHelpers.createClass(Signaler, [{
      key: 'createChannel',
      value: function createChannel(channel) {

        if (!channel) {

          throw new Error('Missing mandatory <channel> parameter.');
        }

        this[comunicatorSym].sendTo(unknownPeerValue, {
          'type': 'create-channel',
          channel: channel
        }, true);
      }
    }, {
      key: 'joinChannel',
      value: function joinChannel(channel) {

        if (!channel) {

          throw new Error('Missing mandatory <channel> parameter.');
        }

        this[comunicatorSym].sendTo(unknownPeerValue, {
          'type': 'join-channel',
          channel: channel
        }, true);
      }
    }, {
      key: 'streamOnChannel',
      value: function streamOnChannel() {}
    }, {
      key: 'sendTo',
      value: function sendTo() {}
    }, {
      key: 'broadcast',
      value: function broadcast() {}
    }, {
      key: 'approve',
      value: function approve() {}
    }, {
      key: 'unApprove',
      value: function unApprove() {}
    }, {
      key: 'leaveChannel',
      value: function leaveChannel() {}
    }, {
      key: 'userIsPresent',
      value: function userIsPresent(whoami, token) {

        return this[comunicatorSym].userIsPresent(whoami, token);
      }
    }, {
      key: 'userMediaConstraints',
      get: function get() {

        return this[userMediaConstraintsSym];
      }
    }, {
      key: 'sdpConstraints',
      get: function get() {

        return this[sdpConstraintsSym];
      }
    }, {
      key: 'stream',
      get: function get() {

        if (!this[myStreamSym]) {

          throw new Error('Stream is not present. You have to ask this to the user');
        }

        return this[myStreamSym];
      }
    }, {
      key: 'peers',
      get: function get() {

        return this[peersSym];
      }
    }, {
      key: 'initiators',
      get: function get() {

        return this[initiatorsSym];
      }
    }]);
    return Signaler;
  }(Rx.Observable);

  exports.Signaler = Signaler;

}));
//# sourceMappingURL=signaler.js.map
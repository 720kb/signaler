/**
* siglr
* 3.0.7
*
* 
* https://github.com/720kb/signaler
*
* MIT license
* Sun Mar 06 2016
*/

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('rxjs/Rx'), require('comunicator')) :
  typeof define === 'function' && define.amd ? define('signaler', ['rxjs/Rx', 'comunicator'], factory) :
  (factory(global.Rx,global.comunicator));
}(this, function (Rx,comunicator) { 'use strict';

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

  var sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };
  var rtcConfiguration = {
    'iceServers': [{
      'urls': 'stun:stun.l.google.com:19302'
    }, {
      'urls': 'stun:23.21.150.121'
    }]
  };
  var rtcOptions = {};
  var rtcDataChannelOptions = {};
  var iceCandidates = [];
  var peerConnectionSym = Symbol('peer-connection');
  var dataChannelSym = Symbol('data-channel');
  var myStreamSym = Symbol('my-stream');
  var SignalerPeerConnection = function (_Rx$Observable) {
    babelHelpers.inherits(SignalerPeerConnection, _Rx$Observable);

    function SignalerPeerConnection() {
      var sdpConstr = arguments.length <= 0 || arguments[0] === undefined ? sdpConstraints : arguments[0];
      babelHelpers.classCallCheck(this, SignalerPeerConnection);


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

                    if (_this[myStreamSym]) {

                      subscriber.next({
                        'type': 'add-stream',
                        'stream': _this[myStreamSym]
                      });
                    } else {

                      subscriber.next({
                        'type': 'warn',
                        'cause': 'Atm no stream'
                      });
                    }
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

            iceCandidates.push(event.candidate);
          } else if (iceCandidates && iceCandidates.length >= 0) {

            subscriber.next({
              'type': 'use-ice-candidates',
              'candidates': iceCandidates.splice(0, iceCandidates.length)
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

            _this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(offer));
            return offer;
          }, function (error) {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          }).then(function (offer) {

            subscriber.next({
              'type': 'offer',
              offer: offer
            });
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

          _this[peerConnectionSym].setRemoteDescription(new RTCSessionDescription(payload)).then(function () {

            return _this[peerConnectionSym].createAnswer(_this.sdpConstr);
          }, function (error) {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          }).then(function (answer) {

            _this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(answer));
            return answer;
          }, function (error) {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          }).then(function (answer) {

            subscriber.next({
              'type': 'answer',
              answer: answer
            });
          }).catch(function (error) {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          });
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

      _this.sdpConstr = sdpConstr;
      return _this;
    }

    babelHelpers.createClass(SignalerPeerConnection, [{
      key: 'dataChannel',
      get: function get() {

        if (!this[dataChannelSym]) {

          throw new Error('Datachannel is not created');
        }

        return this[dataChannelSym];
      }
    }, {
      key: 'stream',
      get: function get() {

        if (!this[myStreamSym]) {

          throw new Error('Stream is not present. You have to ask this to the user');
        }

        return this[myStreamSym];
      }
    }]);
    return SignalerPeerConnection;
  }(Rx.Observable);

  var comunicatorSym = Symbol('comunicator');

  var Signaler = function (_Rx$Observable) {
    babelHelpers.inherits(Signaler, _Rx$Observable);

    function Signaler(websocketUrl) {
      babelHelpers.classCallCheck(this, Signaler);


      var internalObservable = new Rx.Observable(function (subscriber) {}).share();

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(Signaler).call(this, function (observer) {

        var subscriptionToInternalObservable = internalObservable.subscribe(observer);

        return function () {

          subscriptionToInternalObservable.unsubscribe();
        };
      }));

      _this[comunicatorSym] = new comunicator.Comunicator(websocketUrl);
      return _this;
    }

    return Signaler;
  }(Rx.Observable);

}));
//# sourceMappingURL=signaler.js.map
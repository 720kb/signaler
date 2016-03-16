/*global RTCPeerConnection,RTCSessionDescription,RTCIceCandidate*/
import Rx from 'rxjs/Rx';

const rtcConfiguration = {
    'iceServers': [
      {
        'urls': 'stun:stun.l.google.com:19302'
      },
      {
        'urls': 'stun:23.21.150.121'
      }
    ]
  }
  , rtcOptions = {}
  , rtcDataChannelOptions = {}
  , iceCandidatesSym = Symbol('ice-candidates')
  , peerConnectionSym = Symbol('peer-connection')
  , dataChannelSym = Symbol('data-channel');

class SignalerPeerConnection extends Rx.Observable {

  constructor(sdpConstr) {

    if (!sdpConstr) {

      throw new Error('Manadatory spd constraints missing.');
    }

    const internalObservable = new Rx.Observable(subscriber => {
      const dataChannelError = error => {

        subscriber.error({
          'type': 'error',
          'cause': error
        });
      }
      , dataChannelMessage = event => {

        if (event &&
          event.data) {

          if ((typeof event.data === 'string' || String.prototype.isPrototypeOf(event.data)) &&
            event.data.indexOf('_signaler') >= 0) {

            switch (event.data) {
              case '_signaler:got-stream?': {

                subscriber.next({
                  'type': 'add-stream'
                });
                break;
              }
              default: {

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
      }
      , dataChannelOpen = () => {

        subscriber.next({
          'type': 'datachannel-opened'
        });
      }
      , dataChannelClose = () => {

        subscriber.next({
          'type': 'datachannel-closed'
        });
      };

      this[peerConnectionSym] = new RTCPeerConnection(rtcConfiguration, rtcOptions);
      this[dataChannelSym] = this[peerConnectionSym].createDataChannel('signaler-datachannel', rtcDataChannelOptions);

      this[dataChannelSym].onerror = dataChannelError;
      this[dataChannelSym].onmessage = dataChannelMessage;
      this[dataChannelSym].onopen = dataChannelOpen;
      this[dataChannelSym].onclose = dataChannelClose;

      this[peerConnectionSym].onicecandidate = event => {

        if (event.candidate) {

          this[iceCandidatesSym].push(event.candidate);
        } else if (this[iceCandidatesSym] &&
          this[iceCandidatesSym].length >= 0) {

          subscriber.next({
            'type': 'use-ice-candidates',
            'candidates': this[iceCandidatesSym].splice(0, this[iceCandidatesSym].length)
          });
        }
      };

      this[peerConnectionSym].onaddstream = event => {

        if (!event ||
          !event.stream) {

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

      this[peerConnectionSym].onremovestream = event => {

        if (!event ||
          !event.stream) {

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

      this[peerConnectionSym].onnegotiationneeded = () => {

        this[peerConnectionSym].createOffer()
          .then(offer => {

            subscriber.next({
              'type': 'offer',
              offer
            });
            return this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(offer));
          })
          .catch(error => {

            subscriber.error({
              'type': 'error',
              'cause': error
            });
          });
      };

      this[peerConnectionSym].oniceconnectionstatechange = event => {

        if (!event ||
          !event.target ||
          !event.target.iceConnectionState) {

          return subscriber.error({
            'type': 'warning',
            'cause': 'ice connection state changed without event value'
          });
        }

        switch (event.target.iceConnectionState) {

          case 'connected':
          case 'completed': {

            subscriber.next({
              'type': 'ready'
            });
            break;
          }

          default: {

            subscriber.next({
              'type': 'ice-connection-state',
              'state': event.target.iceConnectionState
            });
          }
        }
      };

      this[peerConnectionSym].onsignalingstatechange = event => {

        if (!event ||
          !event.target ||
          !event.target.signalingState) {

          return subscriber.error({
            'type': 'error',
            'cause': 'signaling state changed without event value'
          });
        }

        switch (event.target.signalingState) {

          default: {

            subscriber.next({
              'type': 'signaling-state',
              'state': event.target.signalingState
            });
          }
        }
      };

      this[peerConnectionSym].ondatachannel = event => {

        if (!event ||
          !event.channel) {

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

      this.setRemoteDescription = payload => {

        if (!this[peerConnectionSym].remoteDescription.type) {

          const setRemoteDescriptionPromise = this[peerConnectionSym].setRemoteDescription(new RTCSessionDescription(payload));

          if (!this[peerConnectionSym].localDescription.type) {

            setRemoteDescriptionPromise
              .then(() => {

                return this[peerConnectionSym].createAnswer(this.sdpConstr);
              })
              .then(answer => {

                subscriber.next({
                  'type': 'answer',
                  answer
                });
                return this[peerConnectionSym].setLocalDescription(new RTCSessionDescription(answer));
              })
              .catch(error => {

                subscriber.error({
                  'type': 'error',
                  'cause': error
                });
              });
          }
        }
      };

      return () => {

        this[dataChannelSym].close();
        this[peerConnectionSym].close();
      };
    }).share();

    super(observer => {

      const subscriptionToInternalObservable = internalObservable
        .subscribe(observer);

      return () => {

        subscriptionToInternalObservable.unsubscribe();
      };
    });

    internalObservable.forEach(element => console.info(element));

    this[iceCandidatesSym] = [];
    this.sdpConstr = sdpConstr;
  }

  addIceCandidates(candidates) {

    if (candidates) {

      candidates.forEach(element => this[peerConnectionSym].addIceCandidate(new RTCIceCandidate(element)));
    } else {

      throw new Error('Invalid candidates');
    }
  }

  get dataChannel() {

    if (!this[dataChannelSym]) {

      throw new Error('Datachannel is not created');
    }

    return this[dataChannelSym];
  }
}

export {SignalerPeerConnection};

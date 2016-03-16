/*global window,navigator*/
import Rx from 'rxjs/Rx';
import {Comunicator} from 'comunicator';
import {SignalerPeerConnection} from './p2p.js';

const comunicatorSym = Symbol('comunicator')
  , myStreamSym = Symbol('my-stream')
  , userMediaConstraintsSym = Symbol('user-media-constraint')
  , sdpConstraintsSym = Symbol('sdp-constraints')
  , initiatorsSym = Symbol('initiators')
  , peersSym = Symbol('peers')
  , unknownPeerValue = 'unknown-peer'
  , getUserMediaConstraints = {
    'audio': true,
    'video': true
  }
  , sdpConstraints = {
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };

class Signaler extends Rx.Observable {
  constructor(websocketUrl, getUserMediaConstr = getUserMediaConstraints, sdpConstr = sdpConstraints) {

    const internalObservable = new Rx.Observable(subscriber => {

      this[comunicatorSym]
        .filter(element => element.what &&
          element.what.type === 'do-handshake')
        .forEach(element => {

          if (element.whoami &&
            element.what.channel) {
            const p2pConnection = new SignalerPeerConnection(sdpConstr);

            this[initiatorsSym].set(element.what.channel, element.who);

            p2pConnection
              .filter(fromPeerConnection => fromPeerConnection.type === 'offer')
              .forEach(fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'offer': fromPeerConnection.offer
              }));

            p2pConnection
              .filter(fromPeerConnection => fromPeerConnection.type === 'use-ice-candidates')
              .forEach(fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'candidates': fromPeerConnection.candidates
              }));
            this[peersSym].set(`${element.what.channel}-${element.who}`, p2pConnection);
          } else {

            window.setTimeout(() => {

              throw new Error('Missing sender and channel that are mandatory');
            });
          }
        });

      this[comunicatorSym]
        .filter(element => element.what &&
        element.what.offer)
        .forEach(element => {

          if (element.whoami &&
            element.what.channel &&
            element.what.offer) {
            let p2pConnection;

            if (this[peersSym].has(`${element.what.channel}-${element.who}`)) {

              p2pConnection = this[peersSym].get(`${element.what.channel}-${element.who}`);
            } else {
              p2pConnection = new SignalerPeerConnection(sdpConstr);

              this[initiatorsSym].set(element.what.channel, element.whoami);
              this[peersSym].set(`${element.what.channel}-${element.who}`, p2pConnection);
            }

            p2pConnection
              .filter(fromPeerConnection => fromPeerConnection.type === 'answer')
              .forEach(fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'answer': fromPeerConnection.answer
              }));

            p2pConnection
              .filter(fromPeerConnection => fromPeerConnection.type === 'use-ice-candidates')
              .forEach(fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                'channel': element.what.channel,
                'candidates': fromPeerConnection.candidates
              }));
            p2pConnection.setRemoteDescription(element.what.offer);
          } else {

            window.setTimeout(() => {

              throw new Error('Missing sender, channel and the offer that are mandatory');
            });
          }
        });

      this[comunicatorSym]
        .filter(element => element.what &&
        element.what.answer)
        .forEach(element => {

          if (element.whoami &&
            element.what.channel &&
            element.what.answer) {
            let p2pConnection;

            if (this[peersSym].has(`${element.what.channel}-${element.who}`)) {

              p2pConnection = this[peersSym].get(`${element.what.channel}-${element.who}`);
            } else {

              window.setTimeout(() => {

                throw new Error('The peer connection must be already enstablished');
              });
            }

            p2pConnection.setRemoteDescription(element.what.answer);
          } else {

            window.setTimeout(() => {

              throw new Error('Missing sender, channel and the answer that are mandatory');
            });
          }
        });

      this[comunicatorSym]
        .filter(element => element.what &&
        element.what.candidates)
        .forEach(element => {
          let p2pConnection;

          if (this[peersSym].has(`${element.what.channel}-${element.who}`)) {

            p2pConnection = this[peersSym].get(`${element.what.channel}-${element.who}`);
          } else {

            window.setTimeout(() => {

              throw new Error('The peer connection must be already enstablished');
            });
          }

          p2pConnection.addIceCandidates(element.what.candidates);
        });

      this.getUserMedia = () => {

        navigator.mediaDevices.getUserMedia(this.userMediaConstraints)
          .then(localStream => {

            if (!this[myStreamSym]) {

              subscriber.next({
                'type': 'my-stream',
                'stream': localStream
              });
              this[myStreamSym] = localStream;
            }

            //TODO try to put the contextified audio
            //audioContext.createMediaStreamSource(myStream);
            //, contextifiedLocalStream = audioContext.createMediaStreamDestination();
          })
          .catch(error => {

            throw new Error(error);
          });
      };
    }).share();

    super(observer => {

      const subscriptionToInternalObservable = internalObservable
        .subscribe(observer);

      return () => {

        subscriptionToInternalObservable.unsubscribe();
      };
    });

    this[comunicatorSym] = new Comunicator(websocketUrl);
    this[userMediaConstraintsSym] = getUserMediaConstr;
    this[sdpConstraintsSym] = sdpConstr;
    this[peersSym] = new Map();
    this[initiatorsSym] = new Map();
  }

  createChannel(channel) {

    if (!channel) {

      throw new Error('Missing mandatory <channel> parameter.');
    }

    this[comunicatorSym].sendTo(unknownPeerValue, {
      'type': 'create-channel',
      channel
    }, true);
  }

  joinChannel(channel) {

    if (!channel) {

      throw new Error('Missing mandatory <channel> parameter.');
    }

    this[comunicatorSym].sendTo(unknownPeerValue, {
      'type': 'join-channel',
      channel
    }, true);
  }

  streamOnChannel() {

  }

  sendTo() {

  }

  broadcast() {

  }

  approve() {

  }

  unApprove() {

  }

  leaveChannel() {

  }

  userIsPresent(whoami, token) {

    return this[comunicatorSym].userIsPresent(whoami, token);
  }

  get userMediaConstraints() {

    return this[userMediaConstraintsSym];
  }

  get sdpConstraints() {

    return this[sdpConstraintsSym];
  }

  get stream() {

    if (!this[myStreamSym]) {

      throw new Error('Stream is not present. You have to ask this to the user');
    }

    return this[myStreamSym];
  }

  get peers() {

    return this[peersSym];
  }

  get initiators() {

    return this[initiatorsSym];
  }
}

export {Signaler};

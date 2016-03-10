/*global navigator*/
import Rx from 'rxjs/Rx';
import {Comunicator} from 'comunicator';
import {SignalerPeerConnection} from './p2p.js';

const comunicatorSym = Symbol('comunicator')
  , myStreamSym = Symbol('my-stream')
  , userMediaConstraintsSym = Symbol('user-media-constraint')
  , sdpConstraintsSym = Symbol('sdp-constraints')
  , initiators = new Map()
  , peers = new Map()
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

      this[comunicatorSym]
        .filter(element => element.what.type === 'do-handshake')
        .forEach(element => {

          if (element.whoami &&
            element.what.channel) {
            const p2pConnection = new SignalerPeerConnection(sdpConstr);

            initiators.set(element.what.channel, element.who);
            p2pConnection.subscribe(subscriber);
            peers.set(`{element.what.channel}-${element.who}`, p2pConnection);
          } else {

            throw new Error('Missing mandatory fields: <eventArrived.whoami> and <eventArrived.what.channel>');
          }
        });
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
}

export {Signaler};

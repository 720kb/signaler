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
  , subscriptionsSym = Symbol('subscriptions')
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
  constructor(websocketUrl, getUserMediaConstr = getUserMediaConstraints, sdpConstr = sdpConstraints, debug = false) {

    const internalObservable = new Rx.Observable(subscriber => {

      this[comunicatorSym]
        .filter(element => element.what &&
          element.what.type === 'do-handshake')
        .forEach(element => {

          if (element.whoami &&
            element.what.channel) {
            const p2pConnection = new SignalerPeerConnection(sdpConstr)
              , subscriptionsArray = [];

            this[initiatorsSym].set(element.what.channel, element.who);
            if (debug) {

              subscriptionsArray.push(
                p2pConnection.subscribe({
                  'next': debugElement => console.info(debugElement),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
              );
            }

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'offer')
                .subscribe({
                  'next': fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                    'channel': element.what.channel,
                    'offer': fromPeerConnection.offer
                  }),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'use-ice-candidates')
                .subscribe({
                  'next': fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                    'channel': element.what.channel,
                    'candidates': fromPeerConnection.candidates
                  }),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'datachannel-message')
                .subscribe({
                  'next': fromPeerConnection => subscriber.next(fromPeerConnection),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );

            if (!this[peersSym].has(`${element.what.channel}`)) {

              this[peersSym].set(`${element.what.channel}`, new Map());
            }
            this[peersSym].get(`${element.what.channel}`).set(`${element.who}`, p2pConnection);

            if (this[subscriptionsSym].has(`${element.what.channel}`)) {

              this[subscriptionsSym].set(`${element.what.channel}`, this[subscriptionsSym].get(`${element.what.channel}`).concat(subscriptionsArray));
            } else {

              this[subscriptionsSym].set(`${element.what.channel}`, subscriptionsArray);
            }
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
            const subscriptionsArray = [];

            if (!this[peersSym].has(`${element.what.channel}`)) {

              this[peersSym].set(`${element.what.channel}`, new Map());
            }

            if (this[peersSym].get(`${element.what.channel}`).has(`${element.who}`)) {

              p2pConnection = this[peersSym].get(`${element.what.channel}`).get(`${element.who}`);
            } else {
              p2pConnection = new SignalerPeerConnection(sdpConstr, true);

              this[initiatorsSym].set(element.what.channel, element.whoami);
              this[peersSym].get(`${element.what.channel}`).set(`${element.who}`, p2pConnection);
            }

            if (debug) {

              subscriptionsArray.push(
                p2pConnection.subscribe({
                  'next': debugElement => console.info(debugElement),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
              );
            }

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'answer')
                .subscribe({
                  'next': fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                    'channel': element.what.channel,
                    'answer': fromPeerConnection.answer
                  }),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'use-ice-candidates')
                .subscribe({
                  'next': fromPeerConnection => this[comunicatorSym].sendTo(element.whoami, {
                    'channel': element.what.channel,
                    'candidates': fromPeerConnection.candidates
                  }),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );

            subscriptionsArray.push(
              p2pConnection
                .filter(fromPeerConnection => fromPeerConnection.type === 'datachannel-message')
                .subscribe({
                  'next': fromPeerConnection => subscriber.next(fromPeerConnection),
                  'error': err => console.error(err),
                  'complete': () => console.info('DONE!')
                })
            );
            p2pConnection.setOffer(element.what.offer);

            if (this[subscriptionsSym].has(`${element.what.channel}`)) {

              this[subscriptionsSym].set(`${element.what.channel}`, this[subscriptionsSym].get(`${element.what.channel}`).concat(subscriptionsArray));
            } else {

              this[subscriptionsSym].set(`${element.what.channel}`, subscriptionsArray);
            }
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

            if (this[peersSym].has(`${element.what.channel}`) &&
              this[peersSym].get(`${element.what.channel}`).has(`${element.who}`)) {
              const p2pConnection = this[peersSym].get(`${element.what.channel}`).get(`${element.who}`);

              p2pConnection.setAnswer(element.what.answer);
            } else {

              window.setTimeout(() => {

                throw new Error('The peer connection must be already enstablished');
              });
            }
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

          if (this[peersSym].has(`${element.what.channel}`) &&
              this[peersSym].get(`${element.what.channel}`).has(`${element.who}`)) {
            const p2pConnection = this[peersSym].get(`${element.what.channel}`).get(`${element.who}`);

            p2pConnection.addIceCandidates(element.what.candidates);
          } else {

            window.setTimeout(() => {

              throw new Error('The peer connection must be already enstablished');
            });
          }
        });

      this[comunicatorSym]
        .filter(element => element.what &&
          element.what.type === 'master-quits' &&
        element.whoami !== this[comunicatorSym].whoAmI)
        .forEach(element => {

          this.leaveChannel(element.what.channel, true);
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
    this[subscriptionsSym] = new Map();
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

  sendTo(channel, who, what) {

    if (this[peersSym].has(`${channel}`) &&
    this[peersSym].get(`${channel}`).has(`${who}`)) {
      const dataChannel = this[peersSym].get(`${channel}`).get(`${who}`).dataChannel;

      dataChannel.send(JSON.stringify(what));
    } else {

      throw new Error(`User ${who} for channel ${channel} do not exist`);
    }
  }

  broadcast(channel, what) {

    if (this[peersSym].has(`${channel}`)) {
      const channelMap = this[peersSym].get(`${channel}`)
        , entriesInChannelMap = channelMap.values();

      for (const aUserInChannel of entriesInChannelMap) {
        const dataChannel = aUserInChannel.dataChannel;

        dataChannel.send(JSON.stringify(what));
      }
    } else {

      throw new Error(`Channel ${channel} doesn't exist`);
    }
  }

  approve() {

  }

  unApprove() {

  }

  leaveChannel(channel, keepMyStream) {

    if (this[peersSym].has(`${channel}`)) {
      const subscriptionsMap = this[subscriptionsSym].get(`${channel}`);

      for (const aSubscription of subscriptionsMap) {

        aSubscription.unsubscribe();
      }

      if (!keepMyStream &&
        this[myStreamSym]) {

        this[myStreamSym].stop();
        this[myStreamSym] = undefined;
      }
      this[initiatorsSym].delete(channel);
      this[peersSym].delete(channel);
      this[subscriptionsSym].delete(channel);
      //delete approvedUsers[channel]; TODO approved users
      this[comunicatorSym].sendTo(unknownPeerValue, {
        'type': 'leave-channel',
        channel
      }, true);
    } else {

      throw new Error(`Channel ${channel} doesn't exist`);
    }
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

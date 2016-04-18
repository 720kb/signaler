/*global module,require*/

const Reflect = require('harmony-reflect') //TODO remove this when V8 49 land in node
  , Rx = require('rxjs/Rx')
  , handlerSym = Symbol('handler')
  , signalerState = new Map();

class ObservableState extends Rx.Observable {
  constructor() {

    const internalObservable = new Rx.Observable(subscriber => {

      this[handlerSym] = {
        'set': (target, property, value) => {

          target[property] = value;
          subscriber.next({
            'type': 'added',
            value
          });
          return true;
        },
        'deleteProperty': (target, property) => {
          const user = target[property].user
            , channel = target[property].channel
            , role = target[property].role;

          delete target[property];

          if (role === 'master') {

            subscriber.next({
              'type': 'master-quit',
              channel
            });
          } else {

            subscriber.next({
              'type': 'quit',
              channel,
              'value': user
            });
          }
          return true;
        }
      };
    }).share();

    super(observer => {

      const subscriptionToInternalObservable = internalObservable
        .subscribe(observer);

      return () => {

        subscriptionToInternalObservable.unsubscribe();
      };
    });
  }

  addChannelInState(channelName) {

    signalerState.set(`channel-${channelName}`, new Proxy({}, this[handlerSym]));
  }

  getChannelInState(channelName) {

    return signalerState.get(`channel-${channelName}`);
  }

  containsInState(channelName) {

    return signalerState.has(`channel-${channelName}`);
  }

  get state() {

    return signalerState;
  }
}

module.exports = ObservableState;

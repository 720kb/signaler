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
        },
        'deleteProperty': (target, property) => {

          console.info(target, property);
        }
      }
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
}

module.exports = ObservableState;

/*global module,require*/

require('harmony-reflect');///XXX: remove this when Proxies land in node.js
const Rx = require('rxjs/Rx');

module.exports = ({channels = {}}) => {

  return new Rx.Observable(subscriber => {
    const handler = {
      'get': (target, property) => {

        subscriber.next({
          'type': 'get',
          'what': property
        });
        return target.get(property);
      },
      'set': (target, property, value) => {

        subscriber.next({
          'type': 'set',
          'what': property,
          value
        });
        target.set(property, value);
        return true;
      }
    }
    , internalMap = new Map();

    channels = new Proxy(internalMap, handler);
    return () => {

      subscriber.complete();
    };
  }).share();
};

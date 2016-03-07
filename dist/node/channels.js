'use strict';

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
/*global module,require*/

require('harmony-reflect'); ///XXX: remove this when Proxies land in node.js
var Rx = require('rxjs/Rx');

module.exports = function (_ref) {
  var _ref$channels = _ref.channels;
  var channels = _ref$channels === undefined ? {} : _ref$channels;


  return new Rx.Observable(function (subscriber) {
    var handler = {
      'get': function get(target, property) {

        subscriber.next({
          'type': 'get',
          'what': property
        });
        return target.get(property);
      },
      'set': function set(target, property, value) {

        subscriber.next({
          'type': 'set',
          'what': property,
          value: value
        });
        target.set(property, value);
        return true;
      }
    },
        internalMap = new Map();

    channels = new Proxy(internalMap, handler);
    return function () {

      subscriber.complete();
    };
  }).share();
};
//# sourceMappingURL=channels.js.map

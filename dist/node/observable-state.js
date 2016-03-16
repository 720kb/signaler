'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*global module,require*/

var Reflect = require('harmony-reflect') //TODO remove this when V8 49 land in node
,
    Rx = require('rxjs/Rx'),
    handlerSym = Symbol('handler'),
    signalerState = new Map();

var ObservableState = function (_Rx$Observable) {
  _inherits(ObservableState, _Rx$Observable);

  function ObservableState() {
    var _this;

    _classCallCheck(this, ObservableState);

    var internalObservable = new Rx.Observable(function (subscriber) {

      _this[handlerSym] = {
        'set': function set(target, property, value) {

          target[property] = value;
          subscriber.next({
            'type': 'added',
            value: value
          });
          return true;
        },
        'deleteProperty': function deleteProperty(target, property) {

          console.info(target, property);
          return true;
        }
      };
    }).share();

    return _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ObservableState).call(this, function (observer) {

      var subscriptionToInternalObservable = internalObservable.subscribe(observer);

      return function () {

        subscriptionToInternalObservable.unsubscribe();
      };
    }));
  }

  _createClass(ObservableState, [{
    key: 'addChannelInState',
    value: function addChannelInState(channelName) {

      signalerState.set('channel-' + channelName, new Proxy({}, this[handlerSym]));
    }
  }, {
    key: 'getChannelInState',
    value: function getChannelInState(channelName) {

      return signalerState.get('channel-' + channelName);
    }
  }, {
    key: 'containsInState',
    value: function containsInState(channelName) {

      return signalerState.has('channel-' + channelName);
    }
  }, {
    key: 'state',
    get: function get() {

      return signalerState;
    }
  }]);

  return ObservableState;
}(Rx.Observable);

module.exports = ObservableState;
//# sourceMappingURL=observable-state.js.map

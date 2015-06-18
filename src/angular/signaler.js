/*global angular Signaler*/
(function withAngular(angular, Signaler) {
  'use strict';

  angular.module('720kb.signaler', [])
  .provider('Signaler', function providerFunction() {

    var signaler
      , domEvent = 'signaler:ready'
      , initSignaler = function initSignaler(url, getUserMediaConst, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt) {

        signaler = new Signaler([domEvent], url, getUserMediaConst, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt);
      };

    return {
      'setComunicatorServerURL': initSignaler,
      '$get': ['$rootScope', '$window', '$log',
      function instantiateProvider($rootScope, $window, $log) {

        var eventsToListen = ['$stateChangeSuccess', '$routeChangeSuccess']
          , unregisterListeners = []
          , eventsToListenLength = eventsToListen.length
          , eventsToListenIndex = 0
          , anEventToListen
          , arrivedMyStream = function arrivedMyStream(event) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('stream:my-stream', event.detail);
            });

            $log.debug('stream:my-stream dispatched');
          }
          , arrivedDataOnDataChannel = function arrivedDataOnDataChannel(event) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('stream:data-arrived', event.detail);
            });

            $log.debug('stream:data-arrived dispatched');
          }
          , arrivedStream = function arrivedStream(event) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('stream:arrive', event.detail);
            });

            $log.debug('stream:arrive dispatched');
          }
          , streamEnded = function streamEnded(event) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('stream:end', event.detail);
            });

            $log.debug('stream:end dispatched');
          }
          , resolveSignaler = function resolveSignaler() {

            var unregisterListenersIndex = 0
              , unregisterListenersLength = unregisterListeners.length
              , kickOffEvent = new $window.Event(domEvent);

            for (; unregisterListenersIndex < unregisterListenersLength; unregisterListenersIndex += 1) {

              unregisterListeners[unregisterListenersIndex]();
            }

            $window.dispatchEvent(kickOffEvent);
            $log.debug('KickOff DOM Event triggered');
          };

        $window.addEventListener('stream:my-stream', arrivedMyStream, false);
        $window.addEventListener('stream:data-arrived', arrivedDataOnDataChannel, false);
        $window.addEventListener('stream:arrive', arrivedStream, false);
        $window.addEventListener('stream:end', streamEnded, false);

        $rootScope.$on('$destroy', function unregisterEventListener() {

          $window.removeEventListener('stream:my-stream', arrivedMyStream, false);
          $window.removeEventListener('stream:data-arrived', arrivedDataOnDataChannel, false);
          $window.removeEventListener('stream:arrive', arrivedStream, false);
          $window.removeEventListener('stream:end', streamEnded, false);
        });

        for (; eventsToListenIndex < eventsToListenLength; eventsToListenIndex += 1) {

          anEventToListen = eventsToListen[eventsToListenIndex];
          unregisterListeners.push($rootScope.$on(anEventToListen, resolveSignaler));
        }

        return signaler;
      }]
    };
  });
}(angular, Signaler));

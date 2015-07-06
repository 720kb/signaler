/*global angular Signaler*/
(function withAngular(angular, Signaler) {
  'use strict';

  angular.module('720kb.signaler', [])
  .provider('Signaler', function providerFunction() {

    var signaler
      , initSignaler = function initSignaler(urlOrComunicator, getUserMediaConst, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt) {

        signaler = new Signaler(urlOrComunicator, getUserMediaConst, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt);
      };

    return {
      'initSignaler': initSignaler,
      '$get': ['$rootScope', '$window', '$log',
      function instantiateProvider($rootScope, $window, $log) {

        var arrivedMyStream = function arrivedMyStream(event) {

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

        return signaler;
      }]
    };
  });
}(angular, Signaler));

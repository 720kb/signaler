/*global angular,Signaler*/
(function withAngular(angular, Signaler) {
  'use strict';

  angular.module('720kb.signaler', [])
  .provider('Signaler', function providerFunction() {

    var signaler
      , initSignaler = function initSignaler(urlOrComunicator, getUserMediaConst, sdpConst, debug) {

        signaler = new Signaler(urlOrComunicator, getUserMediaConst, sdpConst, debug);
      };

    return {
      'initSignaler': initSignaler,
      '$get': ['$rootScope', '$window', '$log',
      function instantiateProvider($rootScope, $window, $log) {

        var onError = function onError(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:error');
              scope.$emit('signaler:error', event.detail);
            });
          }
        }
        , onGetUserMediaError = function onGetUserMediaError(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:usermedia-error');
              scope.$emit('signaler:usermedia-error', event.detail);
            });
          }
        }
        , onDataArrived = function onDataArrived(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:data-arrived');
              scope.$emit('signaler:data-arrived', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onDataChannelOpened = function onDataChannelOpened(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:datachannel-opened');
              scope.$emit('signaler:datachannel-opened', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onDataChannelClosed = function onDataChannelClosed(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:datachannel-closed');
              scope.$emit('signaler:datachannel-closed', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onSignalerReady = function onSignalerReady(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              $log.debug('signaler:ready');
              scope.$emit('signaler:ready', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onStreamArrive = function onStreamArrive(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('signaler:stream', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onStreamEnd = function onStreamEnd(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('signaler:end', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        }
        , onMyStream = function onMyStream(event) {

          if (event &&
            event.detail) {

            $rootScope.$apply(function doApply(scope) {

              scope.$emit('signaler:my-stream', event.detail);
            });
          } else {

            $log.error('Missing mandatory event');
          }
        };

        $window.addEventListener('signaler:error', onError, false);
        $window.addEventListener('signaler:usermedia-error', onGetUserMediaError, false);
        $window.addEventListener('signaler:data-arrived', onDataArrived, false);
        $window.addEventListener('signaler:datachannel-opened', onDataChannelOpened, false);
        $window.addEventListener('signaler:datachannel-closed', onDataChannelClosed, false);
        $window.addEventListener('signaler:ready', onSignalerReady, false);
        $window.addEventListener('signaler:stream', onStreamArrive, false);
        $window.addEventListener('signaler:end', onStreamEnd, false);
        $window.addEventListener('signaler:my-stream', onMyStream, false);

        $rootScope.$on('$destroy', function unregisterEventListener() {

          $window.removeEventListener('signaler:error', onError, false);
          $window.removeEventListener('signaler:usermedia-error', onGetUserMediaError, false);
          $window.removeEventListener('signaler:data-arrived', onDataArrived, false);
          $window.removeEventListener('signaler:datachannel-opened', onDataChannelOpened, false);
          $window.removeEventListener('signaler:datachannel-closed', onDataChannelClosed, false);
          $window.removeEventListener('signaler:ready', onSignalerReady, false);
          $window.removeEventListener('signaler:stream', onStreamArrive, false);
          $window.removeEventListener('signaler:end', onStreamEnd, false);
          $window.removeEventListener('signaler:my-stream', onMyStream, false);
        });

        return signaler;
      }]
    };
  });
}(angular, Signaler));

/*globals window document*/
(function plainOldJs(window, document) {
  'use strict';

  var createChannelButtonElement = document.getElementById('create-channel')
    , joinChannelButtonElement = document.getElementById('join-channel')
    , leaveChannelButtonElement = document.getElementById('leave-channel');

  createChannelButtonElement.onclick = function onCreateChannelClick(event) {

    window.console.log(event);
  };

  joinChannelButtonElement.onclick = function onJoinChannelClick(event) {

    window.console.log(event);
  };

  leaveChannelButtonElement.onclick = function onLeaveChannelClick(event) {

    window.console.log(event);
  };
}(window, document));

/*globals window document*/
(function plainOldJs(window, document) {
  'use strict';

  var createChannelButtonElement = document.getElementById('create-channel')
    , joinChannelButtonElement = document.getElementById('join-channel')
    , leaveChannelButtonElement = document.getElementById('leave-channel')
    , userIdentifierTextElement = document.getElementById('user-identifier')
    , roomIdentifierTextElement = document.getElementById('room-identifier')
    , domEvent = 'comunicator:ready'
    , signaler = new window.Signaler([domEvent], 'ws://localhost:9876')
    , token
    , userIdentifier
    , kickOffEvent;

  window.fetch('/token').then(function onSuccess(data) {

    if (data &&
      data.ok) {

      return data.json();
    }
    return {};
  }, function onFailure(failure) {

    window.console.error(failure);
  }).then(function onJsonResponse(jsonResponse) {

    if (jsonResponse &&
      jsonResponse.token &&
      jsonResponse.userID) {

      token = jsonResponse.token;
      userIdentifier = jsonResponse.userID;
      userIdentifierTextElement.value = userIdentifier;
      kickOffEvent = new window.Event(domEvent);

      window.dispatchEvent(kickOffEvent);
    }
  }, function onFailure(failure) {

    window.console.log(failure);
  });

  signaler.then(function onSignalerReady(theSignaler) {

    if (theSignaler) {

      theSignaler.userIsPresent(userIdentifier, token);
      createChannelButtonElement.onclick = function onCreateChannelClick(event) {

        window.console.log(event);
      };

      joinChannelButtonElement.onclick = function onJoinChannelClick(event) {

        window.console.log(event);
      };

      leaveChannelButtonElement.onclick = function onLeaveChannelClick(event) {

        window.console.log(event);
      };
    }
  });
}(window, document));

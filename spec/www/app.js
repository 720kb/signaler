/*globals window document*/
(function plainOldJs(window, document) {
  'use strict';

  var createChannelButtonElement = document.getElementById('create-channel')
    , joinChannelButtonElement = document.getElementById('join-channel')
    , leaveChannelButtonElement = document.getElementById('leave-channel')
    , userIdentifierTextElement = document.getElementById('user-identifier')
    , roomIdentifierTextElement = document.getElementById('room-identifier')
    , domEvent = 'comunicator:ready'
    , signaler = new window.Signaler([domEvent], 'ws://151.62.53.103:9876', {
        'audio': true,
        'video': false
      }, {
        'mandatory': {
          'OfferToReceiveAudio': true,
          'OfferToReceiveVideo': false
        }
      })
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
      createChannelButtonElement.onclick = function onCreateChannelClick() {

        if (roomIdentifierTextElement &&
          roomIdentifierTextElement.value) {

          theSignaler.createChannel(roomIdentifierTextElement.value);
        } else {

          window.console.error('Manadatory channel name missing.');
        }
      };

      joinChannelButtonElement.onclick = function onJoinChannelClick() {

        if (roomIdentifierTextElement &&
          roomIdentifierTextElement.value) {

          theSignaler.joinChannel(roomIdentifierTextElement.value);
        } else {

          window.console.error('Manadatory channel name missing.');
        }
      };

      leaveChannelButtonElement.onclick = function onLeaveChannelClick() {

        if (roomIdentifierTextElement &&
          roomIdentifierTextElement.value) {

          theSignaler.leaveChannel(roomIdentifierTextElement.value);
          roomIdentifierTextElement.value = '';
        } else {

          window.console.error('Manadatory channel name missing.');
        }
      };
    }
  });

  window.addEventListener('stream:arrive', function onStreamArrival(event) {

    if (event &&
      event.detail &&
      event.detail.mediaElement &&
      event.detail.userid) {

      var audioElement = document.createElement('audio')
        , audioParentElement = document.getElementById('audio');

      window.attachMediaStream(audioElement, event.detail.mediaElement);
      audioElement.id = event.detail.userid;
      audioElement.controls = 'true';
      audioElement.play();

      audioParentElement.appendChild(audioElement);
    }
  }, false);

  window.addEventListener('stream:data-arrived', function onStreamDataArrival(event) {

    if (event &&
      event.detail &&
      event.detail.mediaElement &&
      event.detail.userid) {

      var dataChannelTextElement = document.getElementById('message-on-datachannel');

      dataChannelTextElement.innerHTML(event.detail);
    }
  }, false);

}(window, document));

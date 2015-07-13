/*globals window,document*/
(function plainOldJs(window, document) {
  'use strict';

  var createChannelButtonElement = document.getElementById('create-channel')
    , joinChannelButtonElement = document.getElementById('join-channel')
    , leaveChannelButtonElement = document.getElementById('leave-channel')
    , plugChannelButtonElement = document.getElementById('plug-channel')
    , sendOnDataChannelButtonElement = document.getElementById('send-on-datachannel')
    , textToDataChannelTextAreaElement = document.getElementById('text-to-datachannel')
    , userIdentifierTextElement = document.getElementById('user-identifier')
    , roomIdentifierTextElement = document.getElementById('room-identifier')
    , signaler = new window.Signaler('ws://localhost:9876', {
        'audio': true,
        'video': false
      }, {
        'mandatory': {
          'OfferToReceiveAudio': true,
          'OfferToReceiveVideo': false
        }
      })
    , userIdentifier;

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

      userIdentifier = jsonResponse.userID;
      userIdentifierTextElement.value = userIdentifier;
      signaler.then(function onSignalerReady(theSignaler) {

        if (theSignaler) {

          theSignaler.userIsPresent(userIdentifier, jsonResponse.token);
          window.approveUser = function approveUser(whoToApprove) {

            if (roomIdentifierTextElement &&
              roomIdentifierTextElement.value &&
              whoToApprove) {

              theSignaler.approve(roomIdentifierTextElement.value, whoToApprove);
            }
          };

          window.unApproveUser = function unApproveUser(whoToUnApprove) {

            if (roomIdentifierTextElement &&
              roomIdentifierTextElement.value &&
              whoToUnApprove) {

              theSignaler.unApprove(roomIdentifierTextElement.value, whoToUnApprove);
            }
          };

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

          plugChannelButtonElement.onclick = function onPlugChannelClick() {

            if (roomIdentifierTextElement &&
              roomIdentifierTextElement.value) {

              theSignaler.streamOnChannel(roomIdentifierTextElement.value);
            }
          };

          sendOnDataChannelButtonElement.onclick = function onSendOnDataChannel() {

            if (textToDataChannelTextAreaElement &&
              textToDataChannelTextAreaElement.value) {

              var allDataChannels = theSignaler.dataChannels()
                , dataChannels
                , dataChannelsOwners
                , dataChannelsOwnersIndex = 0
                , aDataCannelOwner
                , aDataCannel;

              if (allDataChannels) {

                dataChannels = allDataChannels[roomIdentifierTextElement.value];
                if (dataChannels) {

                  dataChannelsOwners = Object.keys(dataChannels);
                  if (dataChannelsOwners) {

                    for (dataChannelsOwnersIndex = 0; dataChannelsOwnersIndex < dataChannelsOwners.length; dataChannelsOwnersIndex += 1) {

                      aDataCannelOwner = dataChannelsOwners[dataChannelsOwnersIndex];
                      if (aDataCannelOwner) {

                        aDataCannel = dataChannels[aDataCannelOwner];
                        if (aDataCannel) {

                          aDataCannel.send(textToDataChannelTextAreaElement.value);
                        }
                      }
                    }
                  }
                }
              }
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
    }
  }, function onFailure(failure) {

    window.console.log(failure);
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
      plugChannelButtonElement.removeAttribute('disabled');
    }
  }, false);

  window.addEventListener('stream:data-arrived', function onStreamDataArrival(event) {

    if (event &&
      event.detail) {

      var dataChannelTextElement = document.getElementById('message-on-datachannel');

      dataChannelTextElement.innerHTML = event.detail;
    }
  }, false);

}(window, document));

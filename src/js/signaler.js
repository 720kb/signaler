/*global window Comunicator*/
(function plainOldJs(window, Comunicator) {
  'use strict';

  var Signaler = function Signaler(domEvents, url, getUserMediaConst, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt) {

    var unknownPeerValue = 'unknown-peer'
      , myTmpPeerConnection
      , myTmpDataChannel
      , channelInitiator = {}
      , peerConnections = {}
      , dataChannels = {}
      , myStream
      , comunicator
      , sdpConstraints = {
          'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
          }
        }
      , rtcConfiguration = {
          'iceServers': [
            {
              'url': 'stun:stun.l.google.com:19302'
            }
          ]
        }
      , rtcOptions = {
          'optional': [
            {
              'DtlsSrtpKeyAgreement': true
            },
            {
              'RtpDataChannels': true
            }
          ]
        }
      , rtcDataChannelOptions = {}
      , getUserMediaConstraints = {
          'audio': {
            'mandatory': {
              'googEchoCancellation': 'false',
              'googAutoGainControl': 'false',
              'googNoiseSuppression': 'false',
              'googHighpassFilter': 'false'
            }
          },
          'video': true
        }
      , onDataChannelError = function onDataChannelError(error) {

        window.console.warn('cause', error);
      }
      , onDataChannelMessage = function onDataChannelMessage(event) {

        if (event &&
          event.data) {

          window.console.info(event.data);
          var domEventToDispatch = new window.CustomEvent('stream:data-arrived', {
            'detail': event.data
          });

          window.dispatchEvent(domEventToDispatch);
        } else {

          window.console.warn('cause', 'Data channel event not valid');
        }
      }
      , onDataChannelOpen = function onDataChannelOpen() {

        window.console.info('Data channel', this, 'opened...');
      }
      , onDataChannelClose = function onDataChannelClose() {

        window.console.info('Data channel', this, 'closed.');
      }
      , onDataChannelArrive = function onDataChannelArrive(event) {

        if (event &&
          event.channel) {

          event.channel.onerror = onDataChannelError;
          event.channel.onmessage = onDataChannelMessage;
          event.channel.onopen = onDataChannelOpen;
          event.channel.onclose = onDataChannelClose;
        } else {

          window.console.warn('cause', 'Event or event channel not present');
        }
      }
      , errorOnGetUserMedia = function errorOnGetUserMedia(error) {

        window.console.warn('cause', error);
      }
      , errorOnCreateOffer = function errorOnCreateOffer(error) {

        window.console.warn('cause', error);
      }
      , errorOnCreateAnswer = function errorOnCreateAnswer(error) {

        window.console.warn('cause', error);
      }
      , errorOnSetLocalDescription = function errorOnSetLocalDescription(error) {

        window.console.warn('cause', error);
      }
      , errorOnSetRemoteDescription = function errorOnSetRemoteDescription(error) {

        window.console.warn('cause', error);
      }
      , manageOnAddIceCandidateSuccess = function manageOnAddIceCandidateSuccess() {

        window.console.debug('IceCandidate successfully added.');
      }
      , manageOnAddIceCandidateError = function manageOnAddIceCandidateError(error) {

        window.console.warn('cause', error);
      }
      , manageOnAddStream = function manageOnAddStream(channel, event) {

        if (event.stream) {

          var peersConnectedToChannel = Object.keys(peerConnections[channel])
            , peersConnectedToChannelIndex = 0
            , peersConnectedToChannelLength = peersConnectedToChannel.length
            , aPeerConnectedToChannel
            , eventToSend
            , domEventToDispatch;

          for (; peersConnectedToChannelIndex < peersConnectedToChannelLength; peersConnectedToChannelIndex += 1) {

            aPeerConnectedToChannel = peersConnectedToChannel[peersConnectedToChannelIndex];
            if (peerConnections[channel][aPeerConnectedToChannel] === this) {

              eventToSend = {
                'userid': aPeerConnectedToChannel,
                'mediaElement': event.stream
              };
              domEventToDispatch = new window.CustomEvent('stream:arrive', {
                'detail': eventToSend
              });

              window.dispatchEvent(domEventToDispatch);
            }
          }
        } else {

          window.console.warn('cause', 'No stream arrived');
        }
      }
      , manageOnRemoveStream = function manageOnRemoveStream(channel, event) {

        if (event.stream) {

          var peersConnectedToChannel = Object.keys(peerConnections[channel])
            , peersConnectedToChannelIndex = 0
            , peersConnectedToChannelLength = peersConnectedToChannel.length
            , aPeerConnectedToChannel
            , eventToSend
            , domEventToDispatch;

          for (; peersConnectedToChannelIndex < peersConnectedToChannelLength; peersConnectedToChannelIndex += 1) {

            aPeerConnectedToChannel = peersConnectedToChannel[peersConnectedToChannelIndex];
            if (peerConnections[channel][aPeerConnectedToChannel] === this) {

              eventToSend = {
                'userid': aPeerConnectedToChannel
              };
              domEventToDispatch = new window.CustomEvent('stream:end', {
                'detail': eventToSend
              });
              window.dispatchEvent(domEventToDispatch);
            }
          }
        } else {

          window.console.warn('cause', 'No stream arrived');
        }
      }
      , manageOnIceConnectionStateChange = function manageOnIceConnectionStateChange(channel, event) {

        if (event.target) {

          window.console.debug('Ice state:', event.target.iceConnectionState);
        }

        if (event.target &&
          event.target.iceConnectionState === 'disconnected') {

          var peersInChannel = peerConnections[channel]
            , peersNamesInChannel = Object.keys(peersInChannel)
            , peersNamesInChannelLength = peersNamesInChannel.length
            , peersNameIndex = 0
            , aPeerNameInChannel
            , eventToSend
            , domEventToDispatch;

          for (; peersNameIndex < peersNamesInChannelLength; peersNameIndex += 1) {

            aPeerNameInChannel = peersNamesInChannel[peersNameIndex];
            if (event.target === peerConnections[channel][aPeerNameInChannel]) {

              eventToSend = {
                'userid': aPeerNameInChannel
              };
              domEventToDispatch = new window.CustomEvent('stream:end', {
                'detail': eventToSend
              });
              window.dispatchEvent(domEventToDispatch);
              delete peerConnections[channel][aPeerNameInChannel];
            }
          }
        }
      }
      , notifySettingRemoteDescription = function notifySettingRemoteDescription(theComunicator, who, channel) {

        theComunicator.sendTo(who, {
          'type': 'use-ice-candidates',
          'channel': channel
        }, true);
      }
      , manageSetRemoteDescription = function manageSetRemoteDescription(theComunicator, answer, who, channel) {

        var onNotifySettingRemoteDescriptionWithComunicatorAndWhoAndChannel = notifySettingRemoteDescription.bind(this, theComunicator, who, channel);

        this.setRemoteDescription(
          new window.RTCSessionDescription(answer),
          onNotifySettingRemoteDescriptionWithComunicatorAndWhoAndChannel,
          errorOnSetRemoteDescription);
      }
      , manageOnIceCandidate = function manageOnIceCandidate(theComunicator, channel, who, event) {

        if (event.candidate &&
          channel) {

          theComunicator.sendTo(who, {
            'type': 'ice-candidate',
            'channel': channel,
            'candidate': event.candidate
          }, true);
        } else {

          window.console.debug('Event arrived, channel or user invalid');
        }
      }
      , onAnswer = function onAnswer(theComunicator, channel, who, answer) {

        this.setLocalDescription(new window.RTCSessionDescription(answer), function onSetLocalDescription() {

          theComunicator.sendTo(who, {
            'type': 'answer',
            'channel': channel,
            'answer': answer
          }, true);
          theComunicator.sendTo(who, {
            'type': 'use-ice-candidates',
            'channel': channel
          }, true);
        }, errorOnSetLocalDescription);
      }
      , onSetRemoteDescription = function onSetRemoteDescription(theComunicator, channel, who) {

        var onAnswerWithChannelAndWho = onAnswer.bind(this, theComunicator, channel, who);

        this.createAnswer(onAnswerWithChannelAndWho, errorOnCreateAnswer, sdpConstraints);
      }
      , manageCreateAnswer = function manageCreateAnswer(theComunicator, channel, who, offer) {

        var onSetRemoteDescriptionWithChannelAndWho = onSetRemoteDescription.bind(this, theComunicator, channel, who);

        this.setRemoteDescription(new window.RTCSessionDescription(offer),
          onSetRemoteDescriptionWithChannelAndWho,
          errorOnSetRemoteDescription);
      }
      , manageCreateOffer = function manageCreateOffer(theComunicator, channel, who, offer) {

        this.setLocalDescription(new window.RTCSessionDescription(offer), function onSessionDescription() {

          theComunicator.sendTo(who, {
            'type': 'open',
            'channel': channel,
            'offer': offer
          }, true);
        }, errorOnSetLocalDescription);
      }
      , manageOnNegotiationNeeded = function manageOnNegotiationNeeded(theComunicator, channel, who) {

        var onManageOfferWithComunicatorAndChannelAndWho = manageCreateOffer.bind(this, theComunicator, channel, who);

        if (myStream &&
          !this.singleton) {

          this.singleton = true;
          this.createOffer(onManageOfferWithComunicatorAndChannelAndWho, errorOnCreateOffer);
        }
      }
      , manageLocalStream = function manageLocalStream(theComunicator, channel, who, localStream) {

        var domEventToDispatch
          , onManageOnNegotiationNeededWithChannelAndWho;

        if (!myStream) {

          myStream = localStream;
          domEventToDispatch = new window.CustomEvent('stream:my-stream', {
            'detail': localStream
          });
          window.dispatchEvent(domEventToDispatch);
        }

        //TODO try to put the contextified audio
        //audioContext.createMediaStreamSource(myStream);
        //, contextifiedLocalStream = audioContext.createMediaStreamDestination();

        if (peerConnections[channel][who]) {

          onManageOnNegotiationNeededWithChannelAndWho = manageOnNegotiationNeeded.bind(peerConnections[channel][who], theComunicator, channel, who);
          peerConnections[channel][who].onnegotiationneeded = onManageOnNegotiationNeededWithChannelAndWho;
          peerConnections[channel][who].addStream(myStream);
        } else {

          myTmpPeerConnection.addStream(myStream);
        }
      }
      , initRTCPeerConnection = function initRTCPeerConnection(theComunicator, channel, who) {

        var aPeerConnection = new window.RTCPeerConnection(rtcConfiguration, rtcOptions)
          , aDataCannel;

        aPeerConnection.onicecandidate = manageOnIceCandidate.bind(aPeerConnection, theComunicator, channel, who);
        aPeerConnection.onaddstream = manageOnAddStream.bind(aPeerConnection, channel);
        aPeerConnection.onremovestream = manageOnRemoveStream.bind(aPeerConnection, channel);
        aPeerConnection.onnegotiationneeded = manageOnNegotiationNeeded.bind(aPeerConnection, theComunicator, channel, who);
        aPeerConnection.oniceconnectionstatechange = manageOnIceConnectionStateChange.bind(aPeerConnection, channel);
        aPeerConnection.ondatachannel = onDataChannelArrive;

        aDataCannel = aPeerConnection
          .createDataChannel('signaler-datachannel', rtcDataChannelOptions);

        aDataCannel.onerror = onDataChannelError;
        aDataCannel.onmessage = onDataChannelMessage;
        aDataCannel.onopen = onDataChannelOpen;
        aDataCannel.onclose = onDataChannelClose;

        if (!peerConnections[channel]) {

          peerConnections[channel] = {};
        }

        if (!dataChannels[channel]) {

          dataChannels[channel] = {};
        }

        if (who === unknownPeerValue) {

          myTmpPeerConnection = aPeerConnection;
          myTmpDataChannel = aDataCannel;
        } else {

          peerConnections[channel][who] = aPeerConnection;
          dataChannels[channel][who] = aDataCannel;
        }
      }
      , arrivedToMe = function arrivedToMe(theComunicator, event) {

        /*{ 'opcode': 'sent', 'whoami': whoami, 'who': who, 'what': what }*/
        if (event &&
          event.detail &&
          event.detail.what.type) {

          var eventArrived = event.detail
            , candidatesLength
            , candidateIndex = 0
            , aCandidate
            , channelListeners
            , channelListenersLength
            , channelListenersIndex
            , aChannelListener
            , peersInChannel
            , peersNamesInChannel
            , peersNamesInChannelLength
            , theChannelInitiator
            , peersNamesInChannelIndex
            , aChannelPeer;

          switch (eventArrived.what.type) {

            case 'offer': {

              if (eventArrived.what.offer) {

                if (!channelInitiator[eventArrived.what.channel]) {

                  channelInitiator[eventArrived.what.channel] = eventArrived.whoami;
                }
                if (myTmpPeerConnection) {

                  peerConnections[eventArrived.what.channel][eventArrived.whoami] = myTmpPeerConnection;
                  dataChannels[eventArrived.what.channel][eventArrived.whoami] = myTmpDataChannel;
                  peerConnections[eventArrived.what.channel][eventArrived.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[eventArrived.what.channel][eventArrived.whoami], theComunicator, eventArrived.what.channel, eventArrived.whoami);

                  myTmpPeerConnection = undefined;
                  myTmpDataChannel = undefined;
                }

                manageCreateAnswer.call(peerConnections[eventArrived.what.channel][eventArrived.whoami],
                  theComunicator,
                  eventArrived.what.channel,
                  eventArrived.whoami,
                  eventArrived.what.offer);
              } else {

                window.console.error('No payload');
              }
              break;
            }

            case 'answer': {

              if (eventArrived.what.answer &&
                eventArrived.whoami) {

                if (myTmpPeerConnection) {

                  peerConnections[eventArrived.what.channel][eventArrived.whoami] = myTmpPeerConnection;
                  dataChannels[eventArrived.what.channel][eventArrived.whoami] = myTmpDataChannel;
                  peerConnections[eventArrived.what.channel][eventArrived.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[eventArrived.what.channel][eventArrived.whoami], theComunicator, eventArrived.what.channel, eventArrived.whoami);

                  myTmpPeerConnection = undefined;
                  myTmpDataChannel = undefined;
                }

                manageSetRemoteDescription.call(peerConnections[eventArrived.what.channel][eventArrived.whoami],
                  theComunicator,
                  eventArrived.what.answer,
                  eventArrived.whoami,
                  eventArrived.what.channel);
              } else {

                window.console.warn('No payload or user identification');
              }
              break;
            }

            case 'candidate': {

              if (eventArrived.what.candidate &&
                eventArrived.what.candidate.length > 0) {

                candidatesLength = eventArrived.what.candidate.length;
                for (candidateIndex = 0; candidateIndex < candidatesLength; candidateIndex += 1) {

                  aCandidate = eventArrived.what.candidate[candidateIndex];
                  peerConnections[eventArrived.what.channel][eventArrived.whoami].addIceCandidate(
                    new window.RTCIceCandidate(aCandidate),
                    manageOnAddIceCandidateSuccess,
                    manageOnAddIceCandidateError);
                }
              }
              break;
            }

            case 'p2p-is-instantiated': {

              if (!peerConnections[eventArrived.what.channel][eventArrived.whoami]) {

                myTmpPeerConnection = undefined;
                myTmpDataChannel = undefined;
                initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami);
              }
              theComunicator.sendTo(eventArrived.whoami, {
                'type': 'join-channel',
                'channel': eventArrived.what.channel
              }, true);
              break;
            }

            case 'instantiate-p2p': {

              if (myStream) {

                initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami);
                manageLocalStream(theComunicator, eventArrived.what.channel, eventArrived.whoami, myStream);
              } else {

                window.console.error('User stream [myStream] is not defined...');
              }
              break;
            }

            case 'redo-join': {

              theComunicator.sendTo(eventArrived.whoami, {
                'type': 'join-channel',
                'channel': eventArrived.what.channel
              }, true);
              break;
            }

            case 'approved': {

              channelListeners = eventArrived.what.listeners;
              channelListenersLength = channelListeners.length;
              for (channelListenersIndex = 0; channelListenersIndex < channelListenersLength; channelListenersIndex += 1) {

                aChannelListener = channelListeners[channelListenersIndex];
                if (aChannelListener) {

                  if (peerConnections[eventArrived.what.channel][aChannelListener]) {

                    peerConnections[eventArrived.what.channel][aChannelListener].singleton = false;
                    peerConnections[eventArrived.what.channel][aChannelListener].addStream(myStream);
                  } else {

                    initRTCPeerConnection(theComunicator, eventArrived.what.channel, aChannelListener);
                    manageLocalStream(theComunicator, eventArrived.what.channel, aChannelListener, myStream);
                  }
                }
              }
              break;
            }

            case 'un-approved': {

              peersInChannel = peerConnections[eventArrived.what.channel];
              peersNamesInChannel = Object.keys(peersInChannel);
              peersNamesInChannelLength = peersNamesInChannel.length;
              theChannelInitiator = channelInitiator[eventArrived.what.channel];
              for (peersNamesInChannelIndex = 0; peersNamesInChannelIndex < peersNamesInChannelLength; peersNamesInChannelIndex += 1) {

                aChannelPeer = peersNamesInChannel[peersNamesInChannelIndex];
                if (aChannelPeer !== String(theChannelInitiator)) {

                  peerConnections[eventArrived.what.channel][aChannelPeer].singleton = false;
                  peerConnections[eventArrived.what.channel][aChannelPeer].removeStream(myStream);
                }
              }
              break;
            }

            default: {

              window.console.warn('cause', 'Event valid but un-manageable', 'target', event.detail);
            }
          }
        } else {

          window.console.warn('cause', 'Event arrived is somehow invalid', 'target', event);
        }
      }
      /*Core methods*/
      , createChannel = function createChannel(theComunicator, channel) {

        if (channel &&
          comunicator &&
          comunicator.whoReallyAmI) {

          var manageLocalStreamWithChannel = manageLocalStream.bind(this, theComunicator, channel, unknownPeerValue);

          channelInitiator[channel] = comunicator.whoReallyAmI;
          initRTCPeerConnection(theComunicator, channel, unknownPeerValue);
          if (myStream) {

            manageLocalStreamWithChannel(myStream);
          } else {

            window.getUserMedia(getUserMediaConstraints, manageLocalStreamWithChannel, errorOnGetUserMedia);
          }
        } else {

          window.console.warn('cause', 'Please provide channel name and user must be notified as present in comunicator');
        }
      }
      , joinChannel = function joinChannel(theComunicator, channel) {

        if (channel) {

          initRTCPeerConnection(theComunicator, channel, unknownPeerValue);
          theComunicator.sendTo(unknownPeerValue, {
            'type': 'join-channel',
            'channel': channel
          }, true);
        } else {

          window.console.warn('cause', 'Please provide channel name');
        }
      }
      , streamOnChannel = function streamOnChannel(theComunicator, channel) {

        if (channel) {

          var manageLocalStreamWithChannelAndOwner = manageLocalStream.bind(this, theComunicator, channel, channelInitiator[channel]);

          if (myStream) {

            manageLocalStreamWithChannelAndOwner(myStream);
          } else {

            window.getUserMedia(getUserMediaConstraints, manageLocalStreamWithChannelAndOwner, errorOnGetUserMedia);
          }
        } else {

          window.console.warn('cause', 'Please provide channel name and user must be notified as present in comunicator');
        }
      }
      , approve = function approve(theComunicator, channel, whoToApprove) {

        if (channel &&
          comunicator.whoReallyAmI &&
          whoToApprove &&
          channelInitiator[channel] === comunicator.whoReallyAmI) {

          theComunicator.sendTo(whoToApprove, {
            'type': 'approve',
            'channel': channel
          }, true);
        } else {

          window.console.warn('cause', 'Please review your code');
        }
      }
      , unApprove = function unApprove(theComunicator, channel, whoToUnApprove) {

        if (channel &&
          whoToUnApprove) {

          theComunicator.sendTo(whoToUnApprove, {
            'type': 'un-approve',
            'channel': channel
          }, true);
        } else {

          window.console.warn('cause', 'Please review your code');
        }
      }
      , leaveChannel = function leaveChannel(theComunicator, channel) {

        if (channel) {

          if (myTmpPeerConnection) {

            myTmpPeerConnection.close();
          }

          if (myTmpDataChannel) {

            myTmpDataChannel.close();
          }

          var peersInChannel = peerConnections[channel]
            , peersInChannelNames = Object.keys(peersInChannel)
            , peersInChannelNamesLength = peersInChannelNames.length
            , peersInChannelIndex = 0
            , aPeerInChannelName;

          for (; peersInChannelIndex < peersInChannelNamesLength; peersInChannelIndex += 1) {

            aPeerInChannelName = peersInChannelNames[peersInChannelIndex];
            if (peerConnections[channel][aPeerInChannelName]) {

              peerConnections[channel][aPeerInChannelName].close();
              dataChannels[channel][aPeerInChannelName].close();
            }
          }

          myTmpPeerConnection = undefined;
          myTmpDataChannel = undefined;
          if (myStream) {

            myStream.stop();
          }
          myStream = undefined;
          delete channelInitiator[channel];
          delete peerConnections[channel];
          theComunicator.broadcast({
            'type': 'leave-channel',
            'channel': channel
          }, true);
          window.removeEventListener('comunicator:to-me', arrivedToMe, false);
        } else {

          window.console.warn('cause', 'Please provide channel name');
        }
      }
      , getDataChannels = function getDataChannels() {

        var dataChannelsChannels = Object.keys(dataChannels)
          , dataChannelsChannelsIndex = 0
          , dataChannelsChannelsLength = dataChannelsChannels.length
          , aDataChannelsChannel
          , aDataChannelKey
          , aDataChannelsChannelUsers
          , aDataChannelsChannelUsersIndex
          , aDataChannelsChannelUsersLength
          , aDataChannelUser
          , aDataChannel
          , toReturn = {};

        for (; dataChannelsChannelsIndex < dataChannelsChannelsLength; dataChannelsChannelsIndex += 1) {

          aDataChannelKey = dataChannelsChannels[dataChannelsChannelsIndex];
          if (aDataChannelKey) {

            if (!toReturn[aDataChannelKey]) {

              toReturn[aDataChannelKey] = {};
            }
            aDataChannelsChannel = dataChannels[aDataChannelKey];
            if (aDataChannelsChannel) {

              aDataChannelsChannelUsers = Object.keys(aDataChannelsChannel);
              aDataChannelsChannelUsersIndex = 0;
              aDataChannelsChannelUsersLength = aDataChannelsChannelUsers.length;
              for (; aDataChannelsChannelUsersIndex < aDataChannelsChannelUsersLength; aDataChannelsChannelUsersIndex += 1) {

                aDataChannelUser = aDataChannelsChannelUsers[aDataChannelsChannelUsersIndex];
                if (aDataChannelUser) {

                  aDataChannel = aDataChannelsChannel[aDataChannelUser];
                  if (aDataChannel &&
                    aDataChannel.readyState === 'open') {

                    toReturn[aDataChannelKey][aDataChannelUser] = aDataChannel;
                  }
                }
              }
            }
          }
        }

        return toReturn;
      }
      , onComunicatorResolved = function onComunicatorResolved(resolve, theComunicator) {

        window.addEventListener('comunicator:to-me', arrivedToMe.bind(this, theComunicator), false);
        resolve({
          'userIsPresent': theComunicator.userIsPresent,
          'createChannel': createChannel.bind(this, theComunicator),
          'joinChannel': joinChannel.bind(this, theComunicator),
          'streamOnChannel': streamOnChannel.bind(this, theComunicator),
          'approve': approve.bind(this, theComunicator),
          'unApprove': unApprove.bind(this, theComunicator),
          'leaveChannel': leaveChannel.bind(this, theComunicator),
          'dataChannels': getDataChannels.bind(this)
        });
      }
      , deferred = function deferred(resolve) {

        comunicator.promise(domEvents).then(onComunicatorResolved.bind(this, resolve));
      };

    if (url &&
      domEvents &&
      Comunicator) {

      if (url instanceof Comunicator) {

        comunicator = url;
      } else if (typeof url === 'string' || url instanceof String) {

        comunicator = new Comunicator(url);
      }
    } else {

      window.console.warn('cause', 'Missing mandatory <url> parameters or comunicator not present.');
    }

    if (getUserMediaConst) {

      getUserMediaConstraints = getUserMediaConst;
    }

    if (sdpConst) {

      sdpConstraints = sdpConst;
    }

    if (rtcConf) {

      rtcConfiguration = rtcConf;
    }

    if (rtcOpt) {

      rtcOptions = rtcOpt;
    }

    if (rtcDataChannelOpt) {

      rtcDataChannelOptions = rtcDataChannelOpt;
    }
    return new Promise(deferred.bind(this));
  };

  window.Signaler = Signaler;
}(window, Comunicator));

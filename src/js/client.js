/*global window Comunicator*/
(function plainOldJs(window, Comunicator) {
  'use strict';

  var Singnaler = function Singnaler(domEvents, url, sdpConst, rtcConf, rtcOpt, rtcDataChannelOpt, getUserMediaConst) {

    var myTmpPeerConnection
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

        throw error;
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

          throw 'Data channel event not valid';
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

          throw 'Event or event chanel not present';
        }
      }
      , errorOnGetUserMedia = function errorOnGetUserMedia(error) {

        throw error;
      }
      , errorOnCreateOffer = function errorOnCreateOffer(error) {

        throw error;
      }
      , errorOnCreateAnswer = function errorOnCreateAnswer(error) {

        throw error;
      }
      , errorOnSetLocalDescription = function errorOnSetLocalDescription(error) {

        throw error;
      }
      , errorOnSetRemoteDescription = function errorOnSetRemoteDescription(error) {

        throw error;
      }
      , manageOnAddIceCandidateSuccess = function manageOnAddIceCandidateSuccess() {

        window.console.debug('IceCandidate successfully added.');
      }
      , manageOnAddIceCandidateError = function manageOnAddIceCandidateError(error) {

        throw error;
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

          throw 'No stream arrived';
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

          throw 'No stream arrived';
        }
      }
      , manageOnIceConnectionStateChange = function manageOnIceConnectionStateChange(channel, event) {

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
        } else {

          window.console.debug('Ice state already disconnected');
        }
      }
      , notifySettingRemoteDescription = function notifySettingRemoteDescription(theComunicator, whoami, who, channel) {

        window.console.debug('Remote description set');
        theComunicator.sendTo(who, {
          'type': 'use-ice-candidates',
          'channel': channel
        });
      }
      , manageSetRemoteDescription = function manageSetRemoteDescription(theComunicator, answer, whoami, who, channel) {

        var onNotifySettingRemoteDescriptionWithComunicatorAndWhoAndChannel = notifySettingRemoteDescription.bind(this, theComunicator, whoami, who, channel);

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
          });
        } else {

          window.console.debug('Event arrived, channel or user invalid');
        }
      }
      , onAnswer = function onAnswer(channel, whoami, who, answer) {

        this.setLocalDescription(new window.RTCSessionDescription(answer), function onSetLocalDescription() {

          //TODO: theComunicator.sendTo();
          webSocket.send('answer', channel, who, whoami, answer);
          webSocket.send('useIceCandidates', channel, who, whoami);
        }, errorOnSetLocalDescription);
      }
      , onSetRemoteDescription = function onSetRemoteDescription(channel, whoami, who) {

        var onAnswerWithChannelAndWho = onAnswer.bind(this, channel, whoami, who);

        this.createAnswer(onAnswerWithChannelAndWho, errorOnCreateAnswer, sdpConstraints);
      }
      , manageCreateAnswer = function manageCreateAnswer(channel, whoami, who, offer) {

        var onSetRemoteDescriptionWithChannelAndWho = onSetRemoteDescription.bind(this, channel, whoami, who);

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
          });
        }, errorOnSetLocalDescription);
      }
      , manageOnNegotiationNeeded = function manageOnNegotiationNeeded(theComunicator, channel, who) {

        var onManageOfferWithComunicatorAndChannelAndWho = manageCreateOffer.bind(this, theComunicator, channel, who);

        if (myStream) {

          this.createOffer(onManageOfferWithComunicatorAndChannelAndWho, errorOnCreateOffer);
        } else {

          throw 'No personal stream bounded';
        }
      }
      , manageLocalStream = function manageLocalStream(channel, who, localStream) {

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

        if (who &&
          peerConnections[channel][who]) {

          onManageOnNegotiationNeededWithChannelAndWho = manageOnNegotiationNeeded.bind(peerConnections[channel][who], channel, who);
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

        if (who) {

          peerConnections[channel][who] = aPeerConnection;
          dataChannels[channel][who] = aDataCannel;
        } else {

          myTmpPeerConnection = aPeerConnection;
          myTmpDataChannel = aDataCannel;
        }
      }
      /*Core methods*/
      , createChannel = function createChannel(theComunicator, channel) {

        if (channel &&
          comunicator &&
          comunicator.whoReallyAmI) {

          var manageLocalStreamWithChannel = manageLocalStream.bind(null, channel, undefined);

          channelInitiator[channel] = comunicator.whoReallyAmI;
          initRTCPeerConnection(theComunicator, channel);
          window.getUserMedia(getUserMediaConstraints, manageLocalStreamWithChannel, errorOnGetUserMedia);
        } else {

          throw 'Please provide channel name and user must be notified as present in comunicator';
        }
      }
      , joinChannel = function joinChannel(theComunicator, channel) {

        if (channel) {

          initRTCPeerConnection(theComunicator, channel);
          theComunicator.broadcast({
            'type': 'join-channel',
            'channel': channel
          });
        } else {

          throw 'Please provide channel name and user identification';
        }
      }
      , streamOnChannel = function streamOnChannel(theComunicator, channel) {

        if (channel) {

          var manageLocalStreamWithChannelAndOwner = manageLocalStream.bind(null, channel, channelInitiator[channel]);

          window.getUserMedia(getUserMediaConstraints, manageLocalStreamWithChannelAndOwner, errorOnGetUserMedia);
        } else {

          throw 'Please provide channel name and user must be notified as present in comunicator';
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
          });
        } else {

          throw 'Please review your code';
        }
      }
      , unApprove = function unApprove(theComunicator, channel, whoToUnApprove) {

        if (channel &&
          whoToUnApprove) {

          theComunicator.sendTo(whoToUnApprove, {
            'type': 'un-approve',
            'channel': channel
          });
        } else {

          throw 'Please review your code';
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
          });
        } else {

          throw 'Please provide channel name and user identification';
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

        resolve({
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
      domEvents) {

      comunicator = new Comunicator(url);
    } else {

      throw {
        'cause': 'Missing mandatory <url> and <url> parameters'
      };
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

    if (getUserMediaConst) {

      getUserMediaConstraints = getUserMediaConst;
    }

    return new Promise(deferred.bind(this));
  };

  window.Singnaler = Singnaler;
}(window, Comunicator));

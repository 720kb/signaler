/*global window*/

(function plainOldJs(window) {
  'use strict';

  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var singnaler = function singnaler(url) {

    /* Vars and constants */
    var sdpConstraints = {
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
      , myTmpPeerConnection
      , channelInitiator = {}
      , peerConnections = {}
      , myStream
      , webSocket
      , audioContext
      /* Utilities */
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
          var domEventToDispatch = new window.CustomEvent('stream:someone-arrived');
          window.dispatchEvent(domEventToDispatch);
        }
      , manageOnAddIceCandidateError = function manageOnAddIceCandidateError(error) {

          throw error;
        }
      , notifySettingRemoteDescription = function notifySettingRemoteDescription(whoami, who, channel) {

          window.console.debug('Remote description set');
          webSocket.send('useIceCandidates', channel, who, whoami);
        }
      , manageOnIceCandidate = function manageOnIceCandidate(channel, who, whoami, event) {

          if (event.candidate &&
            channel &&
            whoami) {

            webSocket.send('iceCandidate', channel, who, whoami, event.candidate);
          } else {

            window.console.debug('Event arrived, channel or user invalid');
          }
        }
      , manageCreateAnswer = function manageCreateAnswer(channel, whoami, who, offer) {

          peerConnections[channel][who].setRemoteDescription(
            new window.RTCSessionDescription(offer),
            function onSetRemoteDescription() {

              peerConnections[channel][who].createAnswer(
                function onAnswer(answer) {

                  peerConnections[channel][who].setLocalDescription(new window.RTCSessionDescription(answer),
                    function onSetLocalDescription() {

                      webSocket.send('answer', channel, who, whoami, answer);
                      webSocket.send('useIceCandidates', channel, who, whoami);
                    },
                    errorOnSetLocalDescription);
                },
                errorOnCreateAnswer,
                sdpConstraints);
            },
            errorOnSetRemoteDescription);
        }
      , manageSetRemoteDescription = function manageSetRemoteDescription(answer, whoami, who, channel) {

          peerConnections[channel][who].setRemoteDescription(
            new window.RTCSessionDescription(answer),
            notifySettingRemoteDescription.bind(null, whoami, who, channel),
            errorOnSetRemoteDescription);
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
                domEventToDispatch = new window.CustomEvent('stream:arrive', {'detail': eventToSend});
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
                domEventToDispatch = new window.CustomEvent('stream:end', {'detail': eventToSend});
                window.dispatchEvent(domEventToDispatch);
              }
            }
          } else {

            throw 'No stream arrived';
          }
        }
      , manageCreateOffer = function manageCreateOffer(channel, whoami, who, offer) {

          if (who &&
            peerConnections[channel][who]) {

            peerConnections[channel][who].setLocalDescription(
              new window.RTCSessionDescription(offer),
              function onSessionDescription() {

                webSocket.send('open', channel, who, whoami, offer);
              },
              errorOnSetLocalDescription);
          } else {

            myTmpPeerConnection.setLocalDescription(
              new window.RTCSessionDescription(offer),
              function onSessionDescription() {

                webSocket.send('open', channel, who, whoami, offer);
              },
              errorOnSetLocalDescription);
          }
        }
      , manageOnNegotiationNeeded = function manageOnNegotiationNeeded(channel, who, whoami) {

          if (who &&
            peerConnections[channel][who]) {

            peerConnections[channel][who].createOffer(
              manageCreateOffer.bind(
                peerConnections[channel][who], channel, whoami, who), errorOnCreateOffer);
          } else {

            myTmpPeerConnection.createOffer(
              manageCreateOffer.bind(
                myTmpPeerConnection, channel, whoami, who), errorOnCreateOffer);
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
                domEventToDispatch = new window.CustomEvent('stream:end', {'detail': eventToSend});
                window.dispatchEvent(domEventToDispatch);
                delete peerConnections[channel][aPeerNameInChannel];
              }
            }
          } else {

            window.console.debug('Ice state already disconnected');
          }
        }
      , initRTCPeerConnection = function initRTCPeerConnection(whoami, channel, who) {

          var aPeerConnection = new window.RTCPeerConnection(rtcConfiguration);

          aPeerConnection.onicecandidate = manageOnIceCandidate.bind(aPeerConnection, channel, who, whoami);
          aPeerConnection.onaddstream = manageOnAddStream.bind(aPeerConnection, channel);
          aPeerConnection.onremovestream = manageOnRemoveStream.bind(aPeerConnection, channel);
          aPeerConnection.onnegotiationneeded = manageOnNegotiationNeeded.bind(aPeerConnection, channel, who, whoami);
          aPeerConnection.oniceconnectionstatechange = manageOnIceConnectionStateChange.bind(aPeerConnection, channel);

          if (!peerConnections[channel]) {

            peerConnections[channel] = {};
          }

          if (who) {

            peerConnections[channel][who] = aPeerConnection;
          } else {

            myTmpPeerConnection = aPeerConnection;
          }
        }
      /* Constructor method */
      , initSignaler = function initSignaler(websocketUrl) {

          if (websocketUrl) {

            webSocket = new window.WebSocket(websocketUrl);
            webSocket.push = webSocket.send;
            webSocket.send = function send(opcode, channel, who, whoami, data) {

              if (webSocket.readyState === window.WebSocket.OPEN) {

                var toSend = {
                  'opcode': opcode,
                  'whoami': whoami,
                  'token': 'jwt-token',
                  'who': who,
                  'channel': channel,
                  'payload': data
                };
                window.console.debug('-- OUT -->', toSend);
                webSocket.push(JSON.stringify(toSend));
              } else {

                window.console.info('Sound transport is not ready. Retry...');
                window.requestAnimationFrame(webSocket.send.bind(webSocket, opcode, channel, who, whoami, data));
              }
            };

            webSocket.onopen = function onopen() {

              window.console.info('WebSocket', this, 'opened.');
            };

            try {

              audioContext = new window.AudioContext();
              window.console.info(audioContext);
            } catch (ex) {

              throw 'Web Audio API not supported';
            }
          } else {

            throw 'Please provide a valid URL.';
          }
        }
      /* Core methods */
      , manageLocalStream = function manageLocalStream(channel, whoami, who, localStream) {

          if (!myStream) {

            myStream = localStream;
          }

          //TODO try to put the contextified audio
          //audioContext.createMediaStreamSource(myStream);
          //, contextifiedLocalStream = audioContext.createMediaStreamDestination();

          if (who &&
            peerConnections[channel][who]) {

            peerConnections[channel][who].onnegotiationneeded = manageOnNegotiationNeeded.bind(peerConnections[channel][who], channel, who, whoami);
            peerConnections[channel][who].addStream(myStream);
          } else {

            myTmpPeerConnection.addStream(myStream);
          }
          var domEventToDispatch = new window.CustomEvent('stream:my-stream', {'detail': localStream});
          window.dispatchEvent(domEventToDispatch);
        }
      , manageOnWebSocketMessage = function manageOnWebSocketMessage(whoami, channel, event) {

          var parsedMsg = JSON.parse(event.data)
            , candidatesLength
            , aCandidate
            , usersToConnectToLength
            , aUserInChannel
            , channelPeers
            , channelPeersNames
            , channelPeersNamesLength
            , aChannelPeer
            , theChannelInitiatior
            , i;

          window.console.debug('-- IN -->', parsedMsg);
          /*{
            'opcode': opcode,
            'whoami': whoami,
            'who': who,
            'channel': channel,
            'payload': data
          }*/
          if (/* Mandatory fields */
            parsedMsg.opcode &&
            parsedMsg.whoami &&
            parsedMsg.channel) {

            switch (parsedMsg.opcode) {
              case 'offer':

                if (parsedMsg.payload) {

                  if (!channelInitiator[parsedMsg.channel]) {

                    channelInitiator[parsedMsg.channel] = parsedMsg.whoami;
                  }

                  if (myTmpPeerConnection) {

                    peerConnections[parsedMsg.channel][parsedMsg.whoami] = myTmpPeerConnection;
                    myTmpPeerConnection = undefined;
                  }

                  peerConnections[parsedMsg.channel][parsedMsg.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.channel, parsedMsg.whoami, whoami);
                  manageCreateAnswer(parsedMsg.channel, whoami, parsedMsg.whoami, parsedMsg.payload);
                } else {

                  throw 'No payload';
                }
              break;

              case 'answer':

                if (parsedMsg.payload &&
                  parsedMsg.whoami) {

                  if (myTmpPeerConnection) {

                    peerConnections[parsedMsg.channel][parsedMsg.whoami] = myTmpPeerConnection;
                    myTmpPeerConnection = undefined;
                  }

                  peerConnections[parsedMsg.channel][parsedMsg.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.channel, parsedMsg.whoami, whoami);
                  manageSetRemoteDescription(parsedMsg.payload, whoami, parsedMsg.whoami, channel);
                } else {

                  throw 'No payload or user identification';
                }
              break;

              case 'candidate':

                if (parsedMsg.payload &&
                  parsedMsg.payload.length > 0) {

                  candidatesLength = parsedMsg.payload.length;
                  for (i = 0; i < candidatesLength; i += 1) {

                    aCandidate = parsedMsg.payload[i];
                    peerConnections[channel][parsedMsg.whoami].addIceCandidate(
                      new window.RTCIceCandidate(aCandidate),
                      manageOnAddIceCandidateSuccess,
                      manageOnAddIceCandidateError);
                  }
                }
              break;

              case 'p2pInst':

                initRTCPeerConnection(whoami, channel, parsedMsg.whoami);
                manageLocalStream(channel, whoami, parsedMsg.whoami, myStream);
              break;

              case 'p2pIsInst':

                if (!peerConnections[channel][parsedMsg.whoami]) {

                  myTmpPeerConnection = undefined;
                  initRTCPeerConnection(whoami, channel, parsedMsg.whoami);
                }
                webSocket.send('join', channel, parsedMsg.whoami, whoami);
              break;

              case 'redoJoin':

                webSocket.send('join', channel, parsedMsg.whoami, whoami);
              break;

              case 'approved':

                if (parsedMsg.payload) {

                  usersToConnectToLength = parsedMsg.payload.length;
                  for (i = 0; i < usersToConnectToLength; i += 1) {

                    aUserInChannel = parsedMsg.payload[i];
                    if (peerConnections[channel][aUserInChannel]) {

                      peerConnections[channel][aUserInChannel].addStream(myStream);
                    } else {

                      initRTCPeerConnection(whoami, channel, aUserInChannel);
                      manageLocalStream(channel, whoami, aUserInChannel, myStream);
                    }
                  }
                } else {

                  throw 'No payload';
                }
              break;

              case 'unApproved':

                channelPeers = peerConnections[channel];
                channelPeersNames = Object.keys(channelPeers);
                channelPeersNamesLength = channelPeersNames.length;
                theChannelInitiatior = channelInitiator[channel];
                for (i = 0; i < channelPeersNamesLength; i += 1) {

                  aChannelPeer = channelPeersNames[i];
                  if (aChannelPeer !== theChannelInitiatior) {

                    peerConnections[channel][aChannelPeer].removeStream(myStream);
                  }
                }
              break;

              default:

                throw parsedMsg.opcode + ' un-manageable.';
            }
          } else {

            throw parsedMsg + ' is an unaccettable message.';
          }
        }
      , createChannel = function createChannel(channel, whoami) {

          if (channel &&
            whoami) {

            channelInitiator[channel] = whoami;
            webSocket.onmessage = manageOnWebSocketMessage.bind(null, whoami, channel);
            initRTCPeerConnection(whoami, channel, undefined);
            window.getUserMedia(getUserMediaConstraints,
              manageLocalStream.bind(null, channel, whoami, undefined),
              errorOnGetUserMedia);
          } else {

            throw 'Please provide channel name and user identification';
          }
        }
      , joinChannel = function joinChannel(channel, whoami) {

          if (channel &&
            whoami) {

            webSocket.onmessage = manageOnWebSocketMessage.bind(null, whoami, channel);
            initRTCPeerConnection(whoami, channel, undefined);
            webSocket.send('join', channel, undefined, whoami);
          } else {

            throw 'Please provide channel name and user identification';
          }
        }
      , streamOnChannel = function streamOnChannel(channel, whoami) {
          if (channel &&
            whoami) {

            var manageLocalStreamWithChannelAndWhoamiAndWho = manageLocalStream.bind(null, channel, whoami, channelInitiator[channel]);
            window.getUserMedia(getUserMediaConstraints, manageLocalStreamWithChannelAndWhoamiAndWho, errorOnGetUserMedia);
          } else {

            throw 'Please provide channel name and user identification';
          }
        }
      , approve = function approve(channel, whoami, whoToApprove) {

          if (channel &&
            whoami &&
            whoToApprove &&
            channelInitiator[channel] === whoami) {

            webSocket.send('approve', channel, whoToApprove, whoami);
          } else {

            throw 'Please review your code';
          }
        }
      , unApprove = function unApprove(channel, whoami, whoToUnApprove) {

          if (channel &&
            whoami &&
            whoToUnApprove) {

            webSocket.send('unApprove', channel, whoToUnApprove, whoami);
          } else {

            throw 'Please review your code';
          }
        }
      , leaveChannel = function leaveChannel(channel, whoami) {

          if (channel &&
            whoami) {

            if (myTmpPeerConnection) {

              myTmpPeerConnection.close();
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
              }
            }

            myTmpPeerConnection = undefined;
            if (myStream) {

              myStream.stop();
            }
            myStream = undefined;
            delete channelInitiator[channel];
            delete peerConnections[channel];
            webSocket.send('leave', channel, undefined, whoami);
          } else {

            throw 'Please provide channel name and user identification';
          }
        };

    /* Start */
    initSignaler(url);
    return {
      'createChannel': createChannel,
      'joinChannel': joinChannel,
      'streamOnChannel': streamOnChannel,
      'approve': approve,
      'unApprove': unApprove,
      'leaveChannel': leaveChannel
    };
  };

  window.singnaler = singnaler;
}(window));

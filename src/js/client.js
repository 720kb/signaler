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
            {'DtlsSrtpKeyAgreement': true},
            {'RtpDataChannels': true}
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
            var domEventToDispatch = new window.CustomEvent('stream:data-arrived', {'detail': event.data});
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
      , deferred = function deferred(resolve) {

          comunicator.promise(domEvents).then(function onComunicatorResolved(theComunicator) {

            /* Utilities */
            var notifySettingRemoteDescription = function notifySettingRemoteDescription(whoami, who, channel) {

                  window.console.debug('Remote description set');
                  webSocket.send('useIceCandidates', channel, who, whoami);
                }
              , manageSetRemoteDescription = function manageSetRemoteDescription(answer, whoami, who, channel) {

                  this.setRemoteDescription(
                    new window.RTCSessionDescription(answer),
                    notifySettingRemoteDescription.bind(null, whoami, who, channel),
                    errorOnSetRemoteDescription);
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

                  var onAnswer = function onAnswer(answer) {

                        this.setLocalDescription(new window.RTCSessionDescription(answer),
                          function onSetLocalDescription() {

                            webSocket.send('answer', channel, who, whoami, answer);
                            webSocket.send('useIceCandidates', channel, who, whoami);
                          },
                          errorOnSetLocalDescription);
                      }
                    , onSetRemoteDescription = function onSetRemoteDescription() {

                        this.createAnswer(onAnswer.bind(this), errorOnCreateAnswer, sdpConstraints);
                      };
                  this.setRemoteDescription(
                    new window.RTCSessionDescription(offer),
                    onSetRemoteDescription.bind(this),
                    errorOnSetRemoteDescription);
                }
              , manageCreateOffer = function manageCreateOffer(channel, whoami, who, offer) {

                  this.setLocalDescription(
                    new window.RTCSessionDescription(offer),
                    function onSessionDescription() {

                      webSocket.send('open', channel, who, whoami, offer);
                    },
                    errorOnSetLocalDescription);
                }
              , manageOnNegotiationNeeded = function manageOnNegotiationNeeded(channel, who, whoami) {

                  if (myStream) {

                    this.createOffer(manageCreateOffer.bind(this, channel, whoami, who), errorOnCreateOffer);
                  }
                }
              , manageLocalStream = function manageLocalStream(channel, whoami, who, localStream) {

                  if (!myStream) {

                    myStream = localStream;
                    var domEventToDispatch = new window.CustomEvent('stream:my-stream', {'detail': localStream});
                    window.dispatchEvent(domEventToDispatch);
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
                }
              , initRTCPeerConnection = function initRTCPeerConnection(whoami, channel, who) {

                  var aPeerConnection = new window.RTCPeerConnection(rtcConfiguration, rtcOptions)
                    , aDataCannel;

                  aPeerConnection.onicecandidate = manageOnIceCandidate.bind(aPeerConnection, channel, who, whoami);
                  aPeerConnection.onaddstream = manageOnAddStream.bind(aPeerConnection, channel);
                  aPeerConnection.onremovestream = manageOnRemoveStream.bind(aPeerConnection, channel);
                  aPeerConnection.onnegotiationneeded = manageOnNegotiationNeeded.bind(aPeerConnection, channel, who, whoami);
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

                  window.console.trace('-- IN -->', parsedMsg);
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
                            dataChannels[parsedMsg.channel][parsedMsg.whoami] = myTmpDataChannel;
                            myTmpPeerConnection = undefined;
                            myTmpDataChannel = undefined;
                          }

                          peerConnections[parsedMsg.channel][parsedMsg.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.channel, parsedMsg.whoami, whoami);
                          manageCreateAnswer.call(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.channel, whoami, parsedMsg.whoami, parsedMsg.payload);
                        } else {

                          throw 'No payload';
                        }
                      break;

                      case 'answer':

                        if (parsedMsg.payload &&
                          parsedMsg.whoami) {

                          if (myTmpPeerConnection) {

                            peerConnections[parsedMsg.channel][parsedMsg.whoami] = myTmpPeerConnection;
                            dataChannels[parsedMsg.channel][parsedMsg.whoami] = myTmpDataChannel;
                            myTmpPeerConnection = undefined;
                            myTmpDataChannel = undefined;
                          }

                          peerConnections[parsedMsg.channel][parsedMsg.whoami].onicecandidate = manageOnIceCandidate.bind(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.channel, parsedMsg.whoami, whoami);
                          manageSetRemoteDescription.call(peerConnections[parsedMsg.channel][parsedMsg.whoami], parsedMsg.payload, whoami, parsedMsg.whoami, channel);
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
                          myTmpDataChannel = undefined;
                          initRTCPeerConnection(whoami, channel, parsedMsg.whoami);
                        }
                        this.send('join', channel, parsedMsg.whoami, whoami);
                      break;

                      case 'redoJoin':

                        this.send('join', channel, parsedMsg.whoami, whoami);
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
                    webSocket.onmessage = manageOnWebSocketMessage.bind(webSocket, whoami, channel);
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

                    webSocket.onmessage = manageOnWebSocketMessage.bind(webSocket, whoami, channel);
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
                    webSocket.send('leave', channel, undefined, whoami);
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
                };

            resolve({
              'createChannel': createChannel,
              'joinChannel': joinChannel,
              'streamOnChannel': streamOnChannel,
              'approve': approve,
              'unApprove': unApprove,
              'leaveChannel': leaveChannel,
              'dataChannels': getDataChannels
            });
          });
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

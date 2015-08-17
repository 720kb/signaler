/*global window*/
(function plainOldJs(window) {
  'use strict';

  var Signaler = function Signaler(url) {

    var comunicator
    , getUserMediaConstraints = {
      'audio': true,
      'video': true
    }
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
    , initiators = {}
    , peerConnections = {}
    , dataChannels = {}
    , myStream
    , unknownPeerValue = 'unknown-peer'
    , onCreateOfferError = function onCreateOfferError(error) {

      window.console.error(error);
    }
    , onSetLocalDescriptionError = function onSetLocalDescriptionError(error) {

      window.console.error(error);
    }
    , onDataChannelError = function onDataChannelError(channel, who, error) {

      window.console.error(channel, who, error);
    }
    , onSetRemoteDescriptionError = function onSetRemoteDescriptionError(error) {

      window.console.error(error);
    }
    , onCreateAnswerError = function onCreateAnswerError(error) {

      window.console.error(error);
    }
    , onAddIceCandidateError = function onAddIceCandidateError(error) {

      window.console.error(error);
    }
    , onGetUserMediaError = function onGetUserMediaError(error) {

      window.console.error(error);
    }
    , onAddIceCandidateSuccess = function onAddIceCandidateSuccess(channel, who) {

      window.console.info('iceCandidate for', who, 'in', channel, 'successfully added');
    }
    , onDataChannelMessage = function onDataChannelMessage(channel, who, event) {

      if (channel &&
        who &&
        event &&
        event.data) {

        var eventToSend = {
          'payload': event.data,
          'whoami': who,
          'channel': channel
        }
        , domEventToDispatch = new window.CustomEvent('signaler:data-arrived', {
          'detail': eventToSend
        });

        window.console.debug(event.data);
        window.dispatchEvent(domEventToDispatch);
      } else {

        window.console.error('Missing mandatory fields <channel>, <who> or data channel event not valid');
      }
    }
    , onDataChannelOpen = function onDataChannelOpen(channel, who) {
      var eventToSend = {
        'whoami': who,
        'channel': channel
      }
      , domEventToDispatch = new window.CustomEvent('signaler:datachannel-opened', {
        'detail': eventToSend
      });

      if (!dataChannels[channel]) {

        dataChannels[channel] = {};
      }

      dataChannels[channel][who] = this;
      window.dispatchEvent(domEventToDispatch);
      window.console.info('Data channel', this, 'opened...');
    }
    , onDataChannelClose = function onDataChannelClose(channel, who) {
      var eventToSend = {
        'whoami': who,
        'channel': channel
      }
      , domEventToDispatch = new window.CustomEvent('signaler:datachannel-closed', {
        'detail': eventToSend
      });

      delete dataChannels[channel][who];
      if (Object.keys(dataChannels[channel]) === 0) {

        delete dataChannels[channel];
      }

      window.dispatchEvent(domEventToDispatch);
      window.console.info('Data channel', this, 'closed.');
    }
    , onDataChannelArrive = function onDataChannelArrive(channel, who, event) {

      if (channel &&
        who &&
        event &&
        event.channel) {

        var onDataChannelErrorBoundedToChannelAndWho = onDataChannelError.bind(event.channel, channel, who)
        , onDataChannelMessageBoundedToChannelAndWho = onDataChannelMessage.bind(event.channel, channel, who)
        , onDataChannelOpenBoundedToChannelAndWho = onDataChannelOpen.bind(event.channel, channel, who)
        , onDataChannelCloseBoundedToChannelAndWho = onDataChannelClose.bind(event.channel, channel, who);

        event.channel.onerror = onDataChannelErrorBoundedToChannelAndWho;
        event.channel.onmessage = onDataChannelMessageBoundedToChannelAndWho;
        event.channel.onopen = onDataChannelOpenBoundedToChannelAndWho;
        event.channel.onclose = onDataChannelCloseBoundedToChannelAndWho;
      } else {

        window.console.error('Missing mandatory fields <channel>, <who> or event not present');
      }
    }
    , onSetLocalDescriptionSuccess = function onSetLocalDescriptionSuccess(theComunicator, who, channel, payload, type) {

      window.console.debug('Set local description', type);
      if (type && (type === 'offer' ||
        type === 'answer')) {
        var toSend = {
          'type': type,
          'channel': channel
        };

        toSend[type] = payload;
        theComunicator.sendTo(who, toSend, true);
      } else {

        window.console.error('Type not recognized:', type);
      }
    }
    , onAnswer = function onAnswer(theComunicator, channel, who, answer) {
      var onSetLocalDescriptionSuccessBoundedToComunicatorAndWhoAndChannelAndAnswerAndType = onSetLocalDescriptionSuccess.bind(this, theComunicator, who, channel, answer, 'answer');

      this.setLocalDescription(new window.RTCSessionDescription(answer), onSetLocalDescriptionSuccessBoundedToComunicatorAndWhoAndChannelAndAnswerAndType, onSetLocalDescriptionError);
    }
    , onSetRemoteDescription = function onSetRemoteDescription(theComunicator, channel, who, role) {

      window.console.debug('Set remote description', role);
      if (role &&
        role === 'slave') {

        var onAnswerBoundedToComunicatorAndChannelAndWho = onAnswer.bind(this, theComunicator, channel, who);

        this.createAnswer(onAnswerBoundedToComunicatorAndChannelAndWho, onCreateAnswerError, sdpConstraints);
      } else if (role &&
        role === 'master') {

        window.console.info('handshake finished');
      }
    }
    , onCreateOffer = function onCreateOffer(theComunicator, channel, who, offer) {
      var onSetLocalDescriptionSuccessBoundedToComunicatorAndWhoAndChannelAndOfferAndType = onSetLocalDescriptionSuccess.bind(this, theComunicator, who, channel, offer, 'offer');

      this.setLocalDescription(
        new window.RTCSessionDescription(offer),
        onSetLocalDescriptionSuccessBoundedToComunicatorAndWhoAndChannelAndOfferAndType,
        onSetLocalDescriptionError);
    }
    , setRemoteDescription = function setRemoteDescription(theComunicator, channel, who, payload) {
      var onSetRemoteDescriptionBoundedToComunicatorAndChannelAndWhoAndRole = onSetRemoteDescription.bind(this, theComunicator, channel, who, 'master');

      this.setRemoteDescription(
        new window.RTCSessionDescription(payload),
        onSetRemoteDescriptionBoundedToComunicatorAndChannelAndWhoAndRole,
        onSetRemoteDescriptionError);
    }
    , createAnswer = function createAnswer(theComunicator, channel, who, offer) {
      var onSetRemoteDescriptionBoundedToComunicatorAndChannelAndWhoAndRole = onSetRemoteDescription.bind(this, theComunicator, channel, who, 'slave');

      this.setRemoteDescription(new window.RTCSessionDescription(offer),
        onSetRemoteDescriptionBoundedToComunicatorAndChannelAndWhoAndRole,
        onSetRemoteDescriptionError);
    }
    , onIceCandidate = function onIceCandidate(theComunicator, channel, who, event) {

      if (channel) {

        if (event.candidate) {

          theComunicator.sendTo(who, {
            'type': 'ice-candidate',
            'channel': channel,
            'candidate': event.candidate
          }, true);
          window.console.trace('generating a candidate');
        }
      } else {

        window.console.error('channel invalid or event.candidate null');
      }
    }
    , onIceConnectionStateChange = function onIceConnectionStateChange(theComunicator, channel, who, event) {

      window.console.debug('Ice state:', event.target.iceConnectionState);
      if (event &&
        event.target &&
        event.target.iceConnectionState) {

        switch (event.target.iceConnectionState) {

          case 'checking': {

            theComunicator.sendTo(who, {
              'type': 'use-ice-candidates',
              'channel': channel
            }, true);
            break;
          }

          case 'disconnected': {

            theComunicator.sendTo(who, {
              'type': 'reset-candidates',
              'channel': channel
            }, true);
            break;
          }

          case 'connected':
          case 'completed': {
            var domEventToDispatch = new window.CustomEvent('signaler:ready', {
              'detail': {
                'channel': channel,
                'whoami': who
              }
            });

            window.dispatchEvent(domEventToDispatch);
            break;
          }

          default:{

            window.console.info('ice state not interesting atm.', event.target.iceConnectionState);
          }
        }
      } else {

        window.console.error('ice connection state changed without event value');
      }
    }
    , onAddStream = function onAddStream(channel, event) {

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
              'stream': event.stream
            };
            domEventToDispatch = new window.CustomEvent('signaler:stream', {
              'detail': eventToSend
            });

            window.dispatchEvent(domEventToDispatch);
          }
        }
      } else {

        window.console.error('No stream arrived');
      }
    }
    , onRemoveStream = function onRemoveStream(channel, event) {

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
            domEventToDispatch = new window.CustomEvent('signaler:end', {
              'detail': eventToSend
            });
            window.dispatchEvent(domEventToDispatch);
          }
        }
      } else {

        window.console.error('No stream arrived');
      }
    }
    , onNegotiationNeeded = function onNegotiationNeeded(theComunicator, channel, who) {

      if (initiators[channel] === theComunicator.whoAmI() ||
        myStream) {
        var onCreateOfferBoundedToComunicatorAndChannelAndWho = onCreateOffer.bind(this, theComunicator, channel, who);

        this.createOffer(onCreateOfferBoundedToComunicatorAndChannelAndWho, onCreateOfferError);
      } else {

        window.console.info('You are not the initiator');
      }
    }
    , onLocalStream = function onLocalStream(theComunicator, channel, who, localStream) {
      var domEventToDispatch;

      if (!myStream) {
        var eventToSend = {
          'userid': theComunicator.whoAmI(),
          'stream': localStream
        };

        myStream = localStream;
        domEventToDispatch = new window.CustomEvent('signaler:my-stream', {
          'detail': eventToSend
        });
        window.dispatchEvent(domEventToDispatch);
      }

      //TODO try to put the contextified audio
      //audioContext.createMediaStreamSource(myStream);
      //, contextifiedLocalStream = audioContext.createMediaStreamDestination();
      if (who) {

        peerConnections[channel][who].addStream(myStream);
      } else {

        var usersInChannel = Object.keys(peerConnections[channel])
        , usersInChannelIndex = 0
        , usersInChannelLength = usersInChannel.length
        , aUserInChannel;

        for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

          aUserInChannel = usersInChannel[usersInChannelIndex];
          if (aUserInChannel) {

            peerConnections[channel][aUserInChannel].addStream(myStream);
          }
        }
      }
    }
    , initRTCPeerConnection = function initRTCPeerConnection(theComunicator, channel, who) {

      var aPeerConnection = new window.RTCPeerConnection(rtcConfiguration, rtcOptions)
      , onIceCandidateBoundedToComunicatorAndChannelAndWho = onIceCandidate.bind(aPeerConnection, theComunicator, channel, who)
      , onAddStreamBoundedToChannel = onAddStream.bind(aPeerConnection, channel)
      , onRemoveStreamBoundedToChannel = onRemoveStream.bind(aPeerConnection, channel)
      , onNegotiationNeededBoundedToComunicatorAndChannelAndWho = onNegotiationNeeded.bind(aPeerConnection, theComunicator, channel, who)
      , onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho = onIceConnectionStateChange.bind(aPeerConnection, theComunicator, channel, who)
      , onDataChannelArriveBoundedToChannelAndWho = onDataChannelArrive.bind(aPeerConnection, channel, who);

      aPeerConnection.onicecandidate = onIceCandidateBoundedToComunicatorAndChannelAndWho;
      aPeerConnection.onaddstream = onAddStreamBoundedToChannel;
      aPeerConnection.onremovestream = onRemoveStreamBoundedToChannel;
      aPeerConnection.onnegotiationneeded = onNegotiationNeededBoundedToComunicatorAndChannelAndWho;
      aPeerConnection.oniceconnectionstatechange = onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho;
      aPeerConnection.ondatachannel = onDataChannelArriveBoundedToChannelAndWho;

      if (!peerConnections[channel]) {

        peerConnections[channel] = {};
      }

      if (!dataChannels[channel]) {

        dataChannels[channel] = {};
      }

      peerConnections[channel][who] = aPeerConnection;
      return aPeerConnection;
    }
    , createChannel = function createChannel(theComunicator, channel) {

      if (channel) {

        theComunicator.sendTo(unknownPeerValue, {
          'type': 'create-channel',
          'channel': channel
        }, true);
      } else {

        window.console.error('Missing mandatory <channel> parameter.');
      }
    }
    , joinChannel = function joinChannel(theComunicator, channel) {

      if (channel) {

        theComunicator.sendTo(unknownPeerValue, {
          'type': 'join-channel',
          'channel': channel
        }, true);
      } else {

        window.console.error('Missing mandatory <channel> parameter.');
      }
    }
    , streamOnChannel = function streamOnChannel(theComunicator, channel, who) {

      if (channel) {
        var onLocalStreamBoundedToComunicatorAndChannelAndWho;

        if (initiators[channel] === theComunicator.whoAmI()) {

          if (who) {

            onLocalStreamBoundedToComunicatorAndChannelAndWho = onLocalStream.bind(this, theComunicator, channel, who);
          } else { //all

            onLocalStreamBoundedToComunicatorAndChannelAndWho = onLocalStream.bind(this, theComunicator, channel, undefined);
          }
        } else {

          onLocalStreamBoundedToComunicatorAndChannelAndWho = onLocalStream.bind(this, theComunicator, channel, initiators[channel]);
        }

        if (myStream) {

          onLocalStreamBoundedToComunicatorAndChannelAndWho(myStream);
        } else {

          window.getUserMedia(
            getUserMediaConstraints,
            onLocalStreamBoundedToComunicatorAndChannelAndWho,
            onGetUserMediaError);
        }
      } else {

        window.console.error('Missing mandatory field <channel>');
      }
    }
    , sendData = function sendData(channel, who, payload) {

      if (channel &&
        who &&
        dataChannels &&
        dataChannels[channel] &&
        dataChannels[channel][who]) {

        dataChannels[channel][who].send(payload);
      } else {

        window.console.error('Missing mandatory fields <channel>, <who> or there is no data-channel for user', who, 'in channel', channel);
      }
    }
    , broadcast = function broadcast(channel, payload) {

      if (channel &&
        dataChannels &&
        dataChannels[channel]) {

        var usersInChannel = Object.keys(dataChannels[channel])
        , usersInChannelLength = usersInChannel.length
        , usersInChannelIndex = 0
        , aUserInChannel
        , aUserDataChannel;

        for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

          aUserInChannel = usersInChannel[usersInChannelIndex];
          if (aUserInChannel) {

            aUserDataChannel = dataChannels[channel][aUserInChannel];
            if (aUserDataChannel) {

              aUserDataChannel.send(payload);
            }
          }
        }
      }
    }
    , arrivedToMe = function arrivedToMe(theComunicator, event) {

      /*{ 'opcode': 'sent', 'whoami': whoami, 'who': who, 'what': what }*/
      if (event &&
        event.detail &&
        event.detail.what &&
        event.detail.what.type) {

        var eventArrived = event.detail
        , eventType = event.detail.what.type;

        switch (eventType) {

          case 'master-handshake': {

            if (eventArrived.whoami &&
              eventArrived.what.channel) {

              initiators[eventArrived.what.channel] = eventArrived.who;
              var thePeerConnection = initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami)
              , aDataCannel = thePeerConnection.createDataChannel('signaler-datachannel', rtcDataChannelOptions)
              , onDataChannelErrorBoundedToChannelAndWho = onDataChannelError.bind(aDataCannel, eventArrived.what.channel, eventArrived.whoami)
              , onDataChannelMessageBoundedToChannelAndWho = onDataChannelMessage.bind(aDataCannel, eventArrived.what.channel, eventArrived.whoami)
              , onDataChannelOpenBoundedToChannelAndWho = onDataChannelOpen.bind(aDataCannel, eventArrived.what.channel, eventArrived.whoami)
              , onDataChannelCloseBoundedToChannelAndWho = onDataChannelClose.bind(aDataCannel, eventArrived.what.channel, eventArrived.whoami);

              aDataCannel.onerror = onDataChannelErrorBoundedToChannelAndWho;
              aDataCannel.onmessage = onDataChannelMessageBoundedToChannelAndWho;
              aDataCannel.onopen = onDataChannelOpenBoundedToChannelAndWho;
              aDataCannel.onclose = onDataChannelCloseBoundedToChannelAndWho;
            } else {

              window.console.error('Missing mandatory fields: <eventArrived.whoami> and <eventArrived.what.channel>');
            }
            break;
          }

          case 'take-offer': {

            if (eventArrived.whoami &&
              eventArrived.what.channel &&
              eventArrived.what.offer) {

              initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami);
              initiators[eventArrived.what.channel] = eventArrived.whoami;
              createAnswer.call(peerConnections[eventArrived.what.channel][eventArrived.whoami],
                theComunicator,
                eventArrived.what.channel,
                eventArrived.whoami,
                eventArrived.what.offer);
            } else {

              window.console.error('Missing mandatory fields: <eventArrived.whoami>, <eventArrived.what.channel> and <eventArrived.what.offer>');
            }
            break;
          }

          case 'take-answer': {

            setRemoteDescription.call(peerConnections[eventArrived.what.channel][eventArrived.whoami],
              theComunicator,
              eventArrived.what.channel,
              eventArrived.whoami,
              eventArrived.what.answer);
            break;
          }

          case 'take-candidates': {

            if (eventArrived.what.candidates) {
              var candidatesIndex = 0
              , onAddIceCandidateSuccessBoundedToChannelAndWho = onAddIceCandidateSuccess.bind(peerConnections[eventArrived.what.channel][eventArrived.whoami], eventArrived.what.channel, eventArrived.whoami);

              for (; candidatesIndex < eventArrived.what.candidates.length; candidatesIndex += 1) {

                peerConnections[eventArrived.what.channel][eventArrived.whoami].addIceCandidate(
                  new window.RTCIceCandidate(eventArrived.what.candidates[candidatesIndex]),
                  onAddIceCandidateSuccessBoundedToChannelAndWho,
                  onAddIceCandidateError);
              }
            }
            break;
          }

          default: {

            window.console.error('Event valid but un-manageable. Target:', event.detail);
          }
        }
      } else {

        window.console.error('Event arrived is somehow invalid. Target:', event);
      }
    }
    , onComunicatorResolved = function onComunicatorResolved(resolve, theComunicator) {

      var createChannelBoundToComunicator = createChannel.bind(this, theComunicator)
      , joinChannelBoundToComunicator = joinChannel.bind(this, theComunicator);

      window.addEventListener('comunicator:to-me', arrivedToMe.bind(this, theComunicator), false);
      resolve({
        'userIsPresent': theComunicator.userIsPresent,
        'createChannel': createChannelBoundToComunicator,
        'joinChannel': joinChannelBoundToComunicator,
        'streamOnChannel': streamOnChannel.bind(this, theComunicator),
        'sendTo': sendData.bind(this),
        'broadcast': broadcast.bind(this)/*,
        'approve': approve.bind(this, theComunicator),
        'unApprove': unApprove.bind(this, theComunicator),
        'leaveChannel': leaveChannel.bind(this, theComunicator)*/
      });
    }
    , deferred = function deferred(resolve) {

      comunicator.then(onComunicatorResolved.bind(this, resolve));
    };

    if (url &&
      window.Comunicator) {

      if (url instanceof window.Promise) {

        comunicator = url;
      } else if (typeof url === 'string' || url instanceof String) {

        comunicator = new window.Comunicator(url);
      }
    } else {

      window.console.error('Missing mandatory <url> parameter or Comunicator (http://github.com/720kb/comunicator) not present.');
    }

    return new window.Promise(deferred.bind(this));
  };

  window.Signaler = Signaler;
}(window));

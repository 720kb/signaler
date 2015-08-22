/*global window*/
(function plainOldJs(window) {
  'use strict';

  var Signaler = function Signaler(url, mediaConstr, sdpConstr) {

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
          'urls': 'stun:stun.l.google.com:19302'
        },
        {
          'urls': 'stun:23.21.150.121'
        }
      ]
    }
    , rtcOptions = {}
    , rtcDataChannelOptions = {}
    , initiators = {}
    , iceCandidates = {}
    , peerConnections = {}
    , dataChannels = {}
    , approvedUsers = {}
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
    , onAddIceCandidateSuccess = function onAddIceCandidateSuccess(theComunicator, channel, who) {

      window.console.info('iceCandidate for', who, 'in', channel, 'successfully added');
    }
    , onDataChannelMessage = function onDataChannelMessage(channel, who, event) {

      if (channel &&
        who &&
        event &&
        event.data) {

        if ((typeof event.data === 'string' || event.data instanceof String) &&
          event.data.indexOf('_signaler') >= 0) {

          switch (event.data) {
            case '_signaler:got-stream?': {

              if (myStream &&
                peerConnections[channel] &&
                peerConnections[channel][who]) {

                peerConnections[channel][who].addStream(myStream);
              }
              break;
            }
            default: {

              window.console.error('Not interesting event atm');
            }
          }
        } else {

          var eventToSend = {
            'payload': event.data,
            'whoami': who,
            'channel': channel
          }
          , domEventToDispatch = new window.CustomEvent('signaler:data-arrived', {
            'detail': eventToSend
          });

          window.dispatchEvent(domEventToDispatch);
        }
        window.console.debug(event.data);
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

      dataChannels[channel][who] = this;
      if (approvedUsers[channel] &&
        approvedUsers[channel].indexOf(who) >= 0) {

        this.send('_signaler:got-stream?');
      }
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

          if (!iceCandidates[channel]) {

            iceCandidates[channel] = {};
          }

          if (!iceCandidates[channel][who]) {

            iceCandidates[channel][who] = [];
          }
          iceCandidates[channel][who].push(event.candidate);
          window.console.trace('generating a candidate');
        } else if (iceCandidates[channel] &&
          iceCandidates[channel][who] &&
          Array.isArray(iceCandidates[channel][who])) {
          var currentIceCandidates = iceCandidates[channel][who];

          theComunicator.sendTo(who, {
            'type': 'use-ice-candidates',
            'channel': channel,
            'candidates': currentIceCandidates.splice(0, currentIceCandidates.length)
          }, true);
          window.console.trace('From', theComunicator.whoAmI(), 'to', who, '-> use candidates', currentIceCandidates.length);
        }
      } else {

        window.console.error('channel invalid or event.candidate null');
      }
    }
    , onSignalingStateChange = function onSignalingStateChange(theComunicator, channel, who, event) {

      if (event &&
        event.target &&
        event.target.signalingState) {

        switch (event.target.signalingState) {

          default: {

            window.console.info('signaling state not interesting atm', event.target.signalingState);
          }
        }
      } else {

        window.console.error('signaling state changed without event value');
      }
    }
    , onIceConnectionStateChange = function onIceConnectionStateChange(theComunicator, channel, who, event) {

      if (event &&
        event.target &&
        event.target.iceConnectionState) {

        switch (event.target.iceConnectionState) {

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
          , domEventToDispatch;

        for (; peersConnectedToChannelIndex < peersConnectedToChannelLength; peersConnectedToChannelIndex += 1) {

          aPeerConnectedToChannel = peersConnectedToChannel[peersConnectedToChannelIndex];
          if (peerConnections[channel][aPeerConnectedToChannel] === this) {

            domEventToDispatch = new window.CustomEvent('signaler:stream', {
              'detail': {
                'userid': aPeerConnectedToChannel,
                'stream': event.stream
              }
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
          , domEventToDispatch;

        for (; peersConnectedToChannelIndex < peersConnectedToChannelLength; peersConnectedToChannelIndex += 1) {

          aPeerConnectedToChannel = peersConnectedToChannel[peersConnectedToChannelIndex];
          if (peerConnections[channel][aPeerConnectedToChannel] === this) {

            domEventToDispatch = new window.CustomEvent('signaler:end', {
              'detail': {
                'userid': aPeerConnectedToChannel
              }
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
        myStream ||
        approvedUsers[channel].indexOf(who) >= 0) {
        var onCreateOfferBoundedToComunicatorAndChannelAndWho = onCreateOffer.bind(this, theComunicator, channel, who);

        this.createOffer(onCreateOfferBoundedToComunicatorAndChannelAndWho, onCreateOfferError);
      } else {

        window.console.info('You can not negotiate a p2p connection');
      }
    }
    , onLocalStream = function onLocalStream(theComunicator, channel, who, localStream) {

      if (!myStream) {
        var domEventToDispatch = new window.CustomEvent('signaler:my-stream', {
          'detail': {
            'userid': theComunicator.whoAmI(),
            'stream': localStream
          }
        });

        myStream = localStream;
        window.dispatchEvent(domEventToDispatch);
      }

      //TODO try to put the contextified audio
      //audioContext.createMediaStreamSource(myStream);
      //, contextifiedLocalStream = audioContext.createMediaStreamDestination();
      if (who) {

        peerConnections[channel][who].addStream(localStream);
      } else {

        var usersInChannel = Object.keys(peerConnections[channel])
        , usersInChannelIndex = 0
        , usersInChannelLength = usersInChannel.length
        , aUserInChannel;

        for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

          aUserInChannel = usersInChannel[usersInChannelIndex];
          if (aUserInChannel) {

            peerConnections[channel][aUserInChannel].addStream(localStream);
          }
        }
      }
    }
    , initRTCPeerConnection = function initRTCPeerConnection(theComunicator, channel, who, initChannel) {
      var aPeerConnection
      , onIceCandidateBoundedToComunicatorAndChannelAndWho
      , onAddStreamBoundedToChannel
      , onRemoveStreamBoundedToChannel
      , onNegotiationNeededBoundedToComunicatorAndChannelAndWho
      , onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho
      , onDataChannelArriveBoundedToChannelAndWho
      , onSignalingStateChangeBoundedToComunicatorAndChannelAndWho;

      if (!peerConnections[channel]) {

        peerConnections[channel] = {};
      }

      if (!dataChannels[channel]) {

        dataChannels[channel] = {};
      }

      if (initChannel) {

        aPeerConnection = new window.RTCPeerConnection(rtcConfiguration, rtcOptions);

        var aDataCannel = aPeerConnection.createDataChannel('signaler-datachannel', rtcDataChannelOptions)
        , onDataChannelErrorBoundedToChannelAndWho = onDataChannelError.bind(aDataCannel, channel, who)
        , onDataChannelMessageBoundedToChannelAndWho = onDataChannelMessage.bind(aDataCannel, channel, who)
        , onDataChannelOpenBoundedToChannelAndWho = onDataChannelOpen.bind(aDataCannel, channel, who)
        , onDataChannelCloseBoundedToChannelAndWho = onDataChannelClose.bind(aDataCannel, channel, who);

        onIceCandidateBoundedToComunicatorAndChannelAndWho = onIceCandidate.bind(aPeerConnection, theComunicator, channel, who);
        onAddStreamBoundedToChannel = onAddStream.bind(aPeerConnection, channel);
        onRemoveStreamBoundedToChannel = onRemoveStream.bind(aPeerConnection, channel);
        onNegotiationNeededBoundedToComunicatorAndChannelAndWho = onNegotiationNeeded.bind(aPeerConnection, theComunicator, channel, who);
        onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho = onIceConnectionStateChange.bind(aPeerConnection, theComunicator, channel, who);
        onDataChannelArriveBoundedToChannelAndWho = onDataChannelArrive.bind(aPeerConnection, channel, who);
        onSignalingStateChangeBoundedToComunicatorAndChannelAndWho = onSignalingStateChange.bind(aPeerConnection, theComunicator, channel, who);

        aDataCannel.onerror = onDataChannelErrorBoundedToChannelAndWho;
        aDataCannel.onmessage = onDataChannelMessageBoundedToChannelAndWho;
        aDataCannel.onopen = onDataChannelOpenBoundedToChannelAndWho;
        aDataCannel.onclose = onDataChannelCloseBoundedToChannelAndWho;

        aPeerConnection.onicecandidate = onIceCandidateBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.onaddstream = onAddStreamBoundedToChannel;
        aPeerConnection.onremovestream = onRemoveStreamBoundedToChannel;
        aPeerConnection.onnegotiationneeded = onNegotiationNeededBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.oniceconnectionstatechange = onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.ondatachannel = onDataChannelArriveBoundedToChannelAndWho;
        aPeerConnection.onsignalingstatechange = onSignalingStateChangeBoundedToComunicatorAndChannelAndWho;
      } else {

        aPeerConnection = new window.RTCPeerConnection(rtcConfiguration, rtcOptions);
        onIceCandidateBoundedToComunicatorAndChannelAndWho = onIceCandidate.bind(aPeerConnection, theComunicator, channel, who);
        onAddStreamBoundedToChannel = onAddStream.bind(aPeerConnection, channel);
        onRemoveStreamBoundedToChannel = onRemoveStream.bind(aPeerConnection, channel);
        onNegotiationNeededBoundedToComunicatorAndChannelAndWho = onNegotiationNeeded.bind(aPeerConnection, theComunicator, channel, who);
        onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho = onIceConnectionStateChange.bind(aPeerConnection, theComunicator, channel, who);
        onDataChannelArriveBoundedToChannelAndWho = onDataChannelArrive.bind(aPeerConnection, channel, who);
        onSignalingStateChangeBoundedToComunicatorAndChannelAndWho = onSignalingStateChange.bind(aPeerConnection, theComunicator, channel, who);

        aPeerConnection.onicecandidate = onIceCandidateBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.onaddstream = onAddStreamBoundedToChannel;
        aPeerConnection.onremovestream = onRemoveStreamBoundedToChannel;
        aPeerConnection.onnegotiationneeded = onNegotiationNeededBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.oniceconnectionstatechange = onIceConnectionStateChangeBoundedToComunicatorAndChannelAndWho;
        aPeerConnection.ondatachannel = onDataChannelArriveBoundedToChannelAndWho;
        aPeerConnection.onsignalingstatechange = onSignalingStateChangeBoundedToComunicatorAndChannelAndWho;
      }

      peerConnections[channel][who] = aPeerConnection;
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
    , sendTo = function sendTo(channel, who, payload) {

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
    , approve = function approve(theComunicator, channel, whoToApprove) {

      if (channel &&
        whoToApprove &&
        initiators[channel] === theComunicator.whoAmI()) {

        if (!window.isNaN(whoToApprove)) {

          whoToApprove = Number(whoToApprove);
        }

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
        whoToUnApprove &&
        initiators[channel] === theComunicator.whoAmI()) {

        if (!window.isNaN(whoToUnApprove)) {

          whoToUnApprove = Number(whoToUnApprove);
        }

        theComunicator.sendTo(whoToUnApprove, {
          'type': 'un-approve',
          'channel': channel
        }, true);
      } else {

        window.console.warn('cause', 'Please review your code');
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

          case 'do-handshake': {

            if (eventArrived.whoami &&
              eventArrived.what.channel) {

              initiators[eventArrived.what.channel] = eventArrived.who;
              initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami, true);
            } else {

              window.console.error('Missing mandatory fields: <eventArrived.whoami> and <eventArrived.what.channel>');
            }
            break;
          }

          case 'take-offer': {

            if (eventArrived.whoami &&
              eventArrived.what.channel &&
              eventArrived.what.offer) {

              if (!peerConnections[eventArrived.what.channel] ||
                !peerConnections[eventArrived.what.channel][eventArrived.whoami]) {

                initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami);
                initiators[eventArrived.what.channel] = eventArrived.whoami;
              }
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
              , onAddIceCandidateSuccessBoundedToComunicatorAndChannelAndWho = onAddIceCandidateSuccess.bind(peerConnections[eventArrived.what.channel][eventArrived.whoami], theComunicator, eventArrived.what.channel, eventArrived.whoami);

              for (; candidatesIndex < eventArrived.what.candidates.length; candidatesIndex += 1) {

                peerConnections[eventArrived.what.channel][eventArrived.whoami].addIceCandidate(
                  new window.RTCIceCandidate(eventArrived.what.candidates[candidatesIndex]),
                  onAddIceCandidateSuccessBoundedToComunicatorAndChannelAndWho,
                  onAddIceCandidateError);
              }
            }
            break;
          }

          case 'initiator-quit': {

            /*eslint-disable no-use-before-define*/
            leaveChannel(theComunicator, eventArrived.what.channel, true);
            /*eslint-enable no-use-before-define*/
            break;
          }

          case 'slave-quit': {

            if (peerConnections[eventArrived.what.channel] &&
              peerConnections[eventArrived.what.channel][eventArrived.whoami]) {

              peerConnections[eventArrived.what.channel][eventArrived.whoami].close();
            }

            if (dataChannels[eventArrived.what.channel] &&
              dataChannels[eventArrived.what.channel][eventArrived.whoami]) {

              dataChannels[eventArrived.what.channel][eventArrived.whoami].close();
            }

            delete peerConnections[eventArrived.what.channel][eventArrived.whoami];
            delete dataChannels[eventArrived.what.channel][eventArrived.whoami];
            break;
          }

          case 'approved': {

            if (eventArrived.whoami &&
              eventArrived.what.channel) {

              if (!approvedUsers[eventArrived.what.channel]) {

                approvedUsers[eventArrived.what.channel] = [];
              }
              approvedUsers[eventArrived.what.channel].push(eventArrived.whoami);
              initRTCPeerConnection(theComunicator, eventArrived.what.channel, eventArrived.whoami, true);
            } else {

              window.console.error('Missing mandatory fields: <eventArrived.whoami> and <eventArrived.what.channel>');
            }
            break;
          }

          case 'un-approved': {

            if (eventArrived.whoami &&
              eventArrived.what.channel) {
              var approvedUserIndex = approvedUsers[eventArrived.what.channel].indexOf(eventArrived.whoami);

              if (approvedUserIndex >= 0) {

                approvedUsers.splice(approvedUserIndex, 1);
                peerConnections[eventArrived.what.channel][eventArrived.whoami].close();
                dataChannels[eventArrived.what.channel][eventArrived.whoami].close();
                delete peerConnections[eventArrived.what.channel][eventArrived.whoami];
                delete dataChannels[eventArrived.what.channel][eventArrived.whoami];
              }
            } else {

              window.console.error('Missing mandatory fields: <eventArrived.whoami> and <eventArrived.what.channel>');
            }
            break;
          }

          case 'you-are-un-approved': {

            if (eventArrived.what.channel &&
              eventArrived.what.users) {

              eventArrived.what.users.forEach(function iterator(anElement) {

                if (peerConnections[eventArrived.what.channel] &&
                  peerConnections[eventArrived.what.channel][anElement]) {

                  peerConnections[eventArrived.what.channel][anElement].removeStream(myStream);
                  peerConnections[eventArrived.what.channel][anElement].close();
                  dataChannels[eventArrived.what.channel][anElement].close();
                  delete peerConnections[eventArrived.what.channel][anElement];
                  delete dataChannels[eventArrived.what.channel][anElement];
                }
              });
            } else {

              window.console.error('Missing mandatory field: <eventArrived.what.channel> and <eventArrived.what.users>');
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
    , leaveChannel = function leaveChannel(theComunicator, channel, keepMyStream) {

      if (channel) {

        var peersInChannel = peerConnections[channel]
          , peersInChannelNames = Object.keys(peersInChannel)
          , peersInChannelNamesLength = peersInChannelNames.length
          , peersInChannelIndex = 0
          , aPeerInChannelName;

        for (; peersInChannelIndex < peersInChannelNamesLength; peersInChannelIndex += 1) {

          aPeerInChannelName = peersInChannelNames[peersInChannelIndex];
          if (peerConnections[channel] &&
            peerConnections[channel][aPeerInChannelName]) {

            peerConnections[channel][aPeerInChannelName].close();
          }

          if (dataChannels[channel] &&
            dataChannels[channel][aPeerInChannelName]) {

            dataChannels[channel][aPeerInChannelName].close();
          }
        }

        if (!keepMyStream &&
          myStream) {

          myStream.stop();
          myStream = undefined;
        }
        delete initiators[channel];
        delete peerConnections[channel];
        delete approvedUsers[channel];
        theComunicator.sendTo(unknownPeerValue, {
          'type': 'leave-channel',
          'channel': channel
        }, true);
        window.removeEventListener('comunicator:to-me', arrivedToMe, false);
      } else {

        window.console.error('Missing mandatory parameter <channel>');
      }
    }
    , onComunicatorResolved = function onComunicatorResolved(resolve, theComunicator) {

      var createChannelBoundedToComunicator = createChannel.bind(this, theComunicator)
      , joinChannelBoundedToComunicator = joinChannel.bind(this, theComunicator)
      , streamOnChannelBoundedToComunicator = streamOnChannel.bind(this, theComunicator)
      , sendToBounded = sendTo.bind(this)
      , broadcastBounded = broadcast.bind(this)
      , approveBoundedToComunicator = approve.bind(this, theComunicator)
      , unApproveBoundedToComunicator = unApprove.bind(this, theComunicator)
      , leaveChannelBoundedToComunicator = leaveChannel.bind(this, theComunicator);

      window.addEventListener('comunicator:to-me', arrivedToMe.bind(this, theComunicator), false);
      resolve({
        'userIsPresent': theComunicator.userIsPresent,
        'createChannel': createChannelBoundedToComunicator,
        'joinChannel': joinChannelBoundedToComunicator,
        'streamOnChannel': streamOnChannelBoundedToComunicator,
        'sendTo': sendToBounded,
        'broadcast': broadcastBounded,
        'approve': approveBoundedToComunicator,
        'unApprove': unApproveBoundedToComunicator,
        'leaveChannel': leaveChannelBoundedToComunicator
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

    if (mediaConstr) {

      getUserMediaConstraints = mediaConstr;
    }

    if (sdpConstr) {

      sdpConstraints = sdpConstr;
    }

    /*eslint-disable no-underscore-dangle*/
    /*jscs:disable disallowDanglingUnderscores*/
    window._getPeers = function getPeers() {

      return peerConnections;
    };

    window._getDataChannels = function getDataChannels() {

      return dataChannels;
    };

    window._getIceCandidates = function getIceCandidates() {

      return iceCandidates;
    };

    window._getInititators = function getInitiators() {

      return initiators;
    };

    window._getApprovedUsers = function getApprovedUsers() {

      return approvedUsers;
    };
    /*jscs:enable disallowDanglingUnderscores*/
    /*eslint-enable no-underscore-dangle*/

    return new window.Promise(deferred.bind(this));
  };

  window.Signaler = Signaler;
}(window));

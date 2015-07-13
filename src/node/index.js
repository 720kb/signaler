/*global require,module,console*/
(function withModule(require, module, console) {
  'use strict';

  var unknownPeerValue = 'unknown-peer'
    , initiators = {}
    , listeners = {}
    , waiters = {}
    , approvedUsers = {}
    , offers = {}
    , iceCandidates = {}
    , directIceCandidates = {}
    , isEmpty = function isEmpty(map) {
      for (var key in map) {

        if (map.hasOwnProperty(key)) {

          return false;
        }
      }
      return true;
    }
    , getChannels = function getChannels() {

      var theChannels
        , onEachElement = function onEachElement(element, index) {

          var lastIndexOf = this.lastIndexOf(element);

          if (lastIndexOf !== index) {

            this.splice(lastIndexOf, 1);
          }
        };

      if (initiators) {

        theChannels = Object.keys(initiators);
      }

      if (listeners) {

        theChannels = theChannels.concat(Object.keys(listeners));
      }

      theChannels.forEach(onEachElement.bind(theChannels));
      return theChannels;
    }
    , getInitiatorForChannel = function getInitiatorForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      return initiators[channel];
    }
    , getWaitersForChannel = function getWaitersForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!waiters[channel]) {

        return [];
      }

      return waiters[channel];
    }
    , getOfferForChannel = function getOfferForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (offers[channel]) {

        var toReturn = offers[channel].pop();

        if (offers[channel].length === 0) {

          delete offers[channel];
        }
        return toReturn;
      }

      /*eslint-disable no-console*/
      console.warn('Offer for channel', channel, 'isn\'t present.');
      /*eslint-enable no-console*/
    }
    , getListenersForChannel = function getListenersForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!listeners[channel]) {

        return [];
      }

      return listeners[channel];
    }
    , getApprovedUsersForChannel = function getApprovedUsersForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!approvedUsers[channel]) {

        return [];
      }

      return approvedUsers[channel];
    }
    , getIceCandidatesForUserInChannel = function getIceCandidatesForUserInChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (!iceCandidates[channel] ||
        !iceCandidates[channel][who]) {

        return [];
      }

      var candidates = iceCandidates[channel][who];

      return candidates.splice(0, candidates.length);
    }
    , getInitiatorAndApprovedUsersForChannel = function getInitiatorAndApprovedUsersForChannel(channel) {

      if (!channel) {

        throw 'channel [channel] provided is invalid';
      }

      var initiator = getInitiatorForChannel(channel)
        , theApprovedUsers = getApprovedUsersForChannel(channel);

      if (initiator &&
        theApprovedUsers) {

        return {
          'initiator': initiator,
          'approvedUsers': theApprovedUsers
        };
      }

      /*eslint-disable no-console*/
      console.warn('initiator', initiator, 'or approvedUsers', theApprovedUsers, 'are undefined');
      /*eslint-enable no-console*/
    }
    , isDirectMessagesForUsersInChannel = function isDirectMessagesForUsersInChannel(channel, whoami, who) {

      if (directIceCandidates[channel] &&
        directIceCandidates[channel][whoami] &&
        directIceCandidates[channel][whoami][who]) {

        return directIceCandidates[channel][whoami][who];
      }

      return false;
    }
    , setInitiatorForChannel = function setInitiatorForChannel(channel, who) {

      if (!channel ||
          !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      var initiatorForChannel = getInitiatorForChannel(channel);

      if (initiatorForChannel) {

        /*eslint-disable no-console*/
        console.warn('initiator is already present. The returned value is,', initiatorForChannel);
        /*eslint-enable no-console*/
      } else {

        initiators[channel] = who;
      }
    }
    , addWaiterForChannel = function addWaiterForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!waiters[channel]) {

        waiters[channel] = [];
      }

      waiters[channel].push(who);
    }
    , setOfferForUserInChannel = function setOfferForUserInChannel(channel, who, offer) {

      if (!channel ||
        !who ||
        !offer) {

        throw 'channel name [channel], user [who] or offer [offer] provided are invalid';
      }

      if (!offers[channel]) {

        offers[channel] = [];
      }

      offers[channel].splice(0, 0, {
        'who': who,
        'offer': offer
      });
    }
    , addListenerForChannel = function addListenerForChannel(channel, who) {

      if (!channel ||
          !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      var initiatorForChannel = getInitiatorForChannel(channel);

      if (initiatorForChannel && initiatorForChannel !== who ||
        !initiatorForChannel) {

        if (!listeners[channel]) {

          listeners[channel] = [];
        }

        if (listeners[channel].indexOf(who) < 0) {

          listeners[channel].push(who);
        } else {

          /*eslint-disable no-console*/
          console.warn('user [who]', who, 'already in listeners');
          /*eslint-enable no-console*/
        }
      } else {

        /*eslint-disable no-console*/
        console.warn('un-managed scenario...');
        /*eslint-enable no-console*/
      }
    }
    , addApprovedUserForChannel = function addApprovedUserForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (!approvedUsers[channel]) {

        approvedUsers[channel] = [];
      }

      approvedUsers[channel].push(who);
    }
    , addIceCandidateForUserInChannel = function addIceCandidateForUserInChannel(channel, who, iceCandidate) {

      if (!channel ||
        !who ||
        !iceCandidate) {

        throw 'channel name [channel], user [who] or offer [offer] provided are invalid';
      }

      if (!iceCandidates[channel]) {

        iceCandidates[channel] = {};
      }

      if (!iceCandidates[channel][who]) {

        iceCandidates[channel][who] = [];
      }

      iceCandidates[channel][who].push(iceCandidate);
    }
    , setDirectMessagesForUsersInChannel = function setDirectMessagesForUsersInChannel(channel, whoami, who) {

      if (!directIceCandidates[channel]) {

        directIceCandidates[channel] = {};
      }

      if (!directIceCandidates[channel][whoami]) {

        directIceCandidates[channel][whoami] = {};
      }

      directIceCandidates[channel][whoami][who] = true;
    }
    , removeOffersForUserInChannel = function removeOffersForUserInChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who ]provided are invalid';
      }

      if (offers[channel]) {

        offers[channel] = offers[channel].filter(function onEachElement(element) {

          return element && element.who && element.who !== who;
        });

        if (offers[channel].length === 0) {

          delete offers[channel];
        }
      }
    }
    , removeIceCandidatesForUserInChannel = function removeIceCandidatesForUserInChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (iceCandidates[channel] &&
        iceCandidates[channel][who]) {

        delete iceCandidates[channel][who];
        if (isEmpty(iceCandidates[channel])) {

          delete iceCandidates[channel];
        }
      }
    };

  module.exports = function signalerExport(saltKey) {

    var comunicator = require('comunicator')(saltKey)
      , removeWaiterForChannel = function removeWaiterForChannel(channel, who, initiator) {

        if (!channel ||
          !who) {

          throw 'channel name [channel] or user [who] provided are invalid';
        }

        if (waiters[channel]) {

          var indexOfUser = waiters[channel].indexOf(who);

          if (indexOfUser >= 0) {

            waiters[channel].splice(indexOfUser, 1);
            if (initiator) {

              comunicator.sendTo(initiator, who, {
                'type': 'leave',
                'channel': channel
              });
            }
          } else {

            /*eslint-disable no-console*/
            console.warn('user [who]', who, 'not in waiters');
            /*eslint-enable no-console*/
          }

          if (waiters[channel].length === 0) {

            delete waiters[channel];
          }
        } else {

          /*eslint-disable no-console*/
          console.warn('no waiters for channel [channel]', channel);
          /*eslint-enable no-console*/
        }
      }
      , removeListenerForChannel = function removeListenerForChannel(channel, who, initiator) {

        if (!channel ||
          !who) {

          throw 'channel name [channel] or user [who] provided are invalid';
        }

        if (listeners[channel]) {

          var indexOfUser = listeners[channel].indexOf(who);

          if (indexOfUser >= 0) {

            listeners[channel].splice(indexOfUser, 1);
            if (initiator) {

              comunicator.sendTo(initiator, who, {
                'type': 'leave',
                'channel': channel
              });
            }
          } else {

            /*eslint-disable no-console*/
            console.warn('user [who]', who, 'not in listeners');
            /*eslint-enable no-console*/
          }

          if (listeners[channel].length === 0) {

            delete listeners[channel];
          }
        } else {

          /*eslint-disable no-console*/
          console.warn('no listeners for channel [channel]', channel);
          /*eslint-enable no-console*/
        }
      }
      , removeApprovedUserForChannel = function removeApprovedUserForChannel(channel, who, initiator) {

        if (!channel ||
          !who) {

          throw 'channel name [channel] or user [who] provided are invalid';
        }

        if (approvedUsers[channel]) {

          var indexOfUser = approvedUsers[channel].indexOf(who);

          if (indexOfUser >= 0) {

            approvedUsers[channel].splice(indexOfUser, 1);
            if (initiator) {

              comunicator.sendTo(initiator, who, {
                'type': 'leave',
                'channel': channel
              });
            }
          } else {

            /*eslint-disable no-console*/
            console.warn('user [who]', who, 'not in approved users');
            /*eslint-enable no-console*/
          }

          if (approvedUsers[channel].length === 0) {

            delete approvedUsers[channel];
          }
        } else {

          /*eslint-disable no-console*/
          console.warn('no approved users for channel [channel]', channel);
          /*eslint-enable no-console*/
        }
      }
      , removeInitiatorForChannel = function removeInitiatorForChannel(channel) {

        if (!channel) {

          throw 'channel name [channel] provided is invalid';
        }

        var theInitiatorThatLeaves
          , channelWaiters
          , channelListeners
          , channelApprovedUsers
          , channelWaitersIndex = 0
          , channelListenersIndex = 0
          , channelApprovedUsersIndex = 0
          , aChannelWaiter
          , aChannelListener
          , aChannelApprovedUser;

        if (initiators[channel]) {

          theInitiatorThatLeaves = initiators[channel];
          channelWaiters = getWaitersForChannel(channel);
          channelListeners = getListenersForChannel(channel);
          channelApprovedUsers = getApprovedUsersForChannel(channel);
          for (channelWaitersIndex = 0; channelWaitersIndex < channelWaiters.length; channelWaitersIndex += 1) {

            aChannelWaiter = channelWaiters[channelWaitersIndex];
            if (aChannelWaiter) {

              removeWaiterForChannel(channel, aChannelWaiter, theInitiatorThatLeaves);
            }
          }

          for (channelListenersIndex = 0; channelListenersIndex < channelListeners.length; channelListenersIndex += 1) {

            aChannelListener = channelListeners[channelListenersIndex];
            if (aChannelListener) {

              removeListenerForChannel(channel, aChannelListener, theInitiatorThatLeaves);
            }
          }

          for (channelApprovedUsersIndex = 0; channelApprovedUsersIndex < channelApprovedUsers.length; channelApprovedUsersIndex += 1) {

            aChannelApprovedUser = channelApprovedUsers[channelApprovedUsersIndex];
            if (aChannelApprovedUser) {

              removeApprovedUserForChannel(channel, aChannelApprovedUser, theInitiatorThatLeaves);
            }
          }

          removeIceCandidatesForUserInChannel(channel, theInitiatorThatLeaves);
          removeOffersForUserInChannel(channel, theInitiatorThatLeaves);

          delete initiators[channel];
        } else {

          /*eslint-disable no-console*/
          console.warn('no initiator for channel', channel);
          /*eslint-enable no-console*/
        }
      }
      , leaveChannel = function leaveChannel(whoami, channel) {

        if (channel) {

          var channelInitiator = getInitiatorForChannel(channel);

          if (channelInitiator === whoami) {

            removeInitiatorForChannel(channel);
          } else {

            removeWaiterForChannel(channel, whoami);
            removeListenerForChannel(channel, whoami);
            removeApprovedUserForChannel(channel, whoami);
            removeOffersForUserInChannel(channel, whoami);
            removeIceCandidatesForUserInChannel(channel, whoami);
          }
        }
      }
      , onLeave = function onLeave(whoami) {

        var channels = getChannels()
          , channelsLength = channels.length
          , channelsIndex = 0
          , aChannel;

        for (; channelsIndex < channelsLength; channelsIndex += 1) {

          aChannel = channels[channelsIndex];
          leaveChannel(whoami, aChannel);
        }
      }
      , addOfferForChannel = function addOfferForChannel(offer, whoami, channel) {

        var theWaiters = getWaitersForChannel(channel)
          , initiator = getInitiatorForChannel(channel)
          , firstWaiter
          , theWaitersIndex
          , aWaiter;

        if (initiator &&
            whoami === initiator &&
            theWaiters &&
            theWaiters.length > 0) {

          firstWaiter = theWaiters[0];
          if (firstWaiter) {

            comunicator.sendTo(whoami, firstWaiter, {
              'type': 'offer',
              'channel': channel,
              'offer': offer
            });
            removeWaiterForChannel(channel, firstWaiter);
          }

          if (theWaiters.length >= 1) {

            for (theWaitersIndex = 1; theWaitersIndex < theWaiters.length; theWaitersIndex += 1) {

              aWaiter = theWaiters[theWaitersIndex];
              comunicator.sendTo(whoami, aWaiter, {
                'type': 'redo-join',
                'channel': channel
              });
              removeWaiterForChannel(channel, aWaiter);
            }
          }
        } else {

          setOfferForUserInChannel(channel, whoami, offer);
        }
      }
      , sendOffersTo = function sendOffersTo(channel, whoami) {

        var initiator = getInitiatorForChannel(channel)
          , offer = getOfferForChannel(channel)
          , who
          , offerToSend;

        if (offer) {

          who = offer.who;
          offerToSend = offer.offer;
          comunicator.sendTo(who, whoami, {
            'type': 'offer',
            'channel': channel,
            'offer': offerToSend
          });
        } else if (initiator) {

          comunicator.sendTo(whoami, initiator, {
            'type': 'instantiate-p2p',
            'channel': channel
          });
        } else {

          addWaiterForChannel(channel, whoami);
        }
      }
      , sendAnswerTo = function sendAnswerTo(channel, who, whoami, answer) {

        comunicator.sendTo(whoami, who, {
          'type': 'answer',
          'channel': channel,
          'answer': answer
        });
      }
      , sendCandidatesTo = function sendCandidatesTo(who, whoami, channel) {

        var theIceCandidates = getIceCandidatesForUserInChannel(channel, who);

        if (theIceCandidates &&
          theIceCandidates.length > 0) {

          comunicator.sendTo(who, whoami, {
            'type': 'candidate',
            'channel': channel,
            'candidate': theIceCandidates
          });
        }
      }
      , sendUsersToConnectWithToApproved = function sendUsersToConnectWithToApproved(channel, who, whoami) {

        var initiator = getInitiatorForChannel(channel)
          , listenersForChannel = getListenersForChannel(channel)
          , approvedUserInChannel = listenersForChannel.indexOf(who);

        if (initiator &&
            who &&
            initiator === whoami) {

          if (approvedUserInChannel >= 0) {

            listenersForChannel.splice(approvedUserInChannel, 1);
            addApprovedUserForChannel(channel, who);
            comunicator.sendTo(whoami, who, {
              'type': 'approved',
              'channel': channel,
              'listeners': listenersForChannel
            });
          }
        }
      }
      , sendNotApproval = function sendNotApproval(channel, who, whoami) {

        var initiator = getInitiatorForChannel(channel);

        if (who &&
          initiator === whoami) {

          removeApprovedUserForChannel(channel, who);
          addListenerForChannel(channel, who);
          comunicator.sendTo(whoami, who, {
            'type': 'un-approved',
            'channel': channel
          });
        }
      }
      , onComunicatorMessage = function onComunicatorMessage(payload) {

        // { 'whoami': parsedMsg.data.whoami, 'who': parsedMsg.data.who, 'what': parsedMsg.data.what }
        if (payload &&
          payload.whoami &&
          payload.who &&
          payload.what &&
          payload.what.type) {

          var messageBody = payload.what
            , initiatorAndApprovedUsersForChannel
            , approvedUsersIndex = 0
            , approvedUsersLength
            , anApprovedUser;

          switch (messageBody.type) {

            case 'open': {

              setInitiatorForChannel(messageBody.channel, payload.whoami);
              addOfferForChannel(messageBody.offer, payload.whoami, messageBody.channel);
              if (payload.who !== unknownPeerValue) {

                comunicator.sendTo(payload.whoami, payload.who, {
                  'type': 'p2p-is-instantiated',
                  'channel': messageBody.channel
                });
              }
              break;
            }

            case 'answer': {

              sendAnswerTo(messageBody.channel, payload.who, payload.whoami, messageBody.answer);
              break;
            }

            case 'ice-candidate': {

              if (messageBody.candidate &&
                payload.whoami &&
                messageBody.channel) {

                if (isDirectMessagesForUsersInChannel(messageBody.channel, payload.who, payload.whoami)) {

                  comunicator.sendTo(payload.whoami, payload.who, {
                    'type': 'candidate',
                    'channel': messageBody.channel,
                    'candidate': messageBody.candidate
                  });
                } else {

                  addIceCandidateForUserInChannel(messageBody.channel, payload.whoami, messageBody.candidate);
                }
              }
              break;
            }

            case 'use-ice-candidates': {

              sendCandidatesTo(payload.who, payload.whoami, messageBody.channel);
              initiatorAndApprovedUsersForChannel = getInitiatorAndApprovedUsersForChannel(messageBody.channel);
              if (initiatorAndApprovedUsersForChannel) {

                if (initiatorAndApprovedUsersForChannel.initiator === payload.whoami &&
                  initiatorAndApprovedUsersForChannel.approvedUsers) {

                  approvedUsersLength = initiatorAndApprovedUsersForChannel.approvedUsers.length;
                  for (; approvedUsersIndex < approvedUsersLength; approvedUsersIndex += 1) {

                    anApprovedUser = initiatorAndApprovedUsersForChannel.approvedUsers[approvedUsersIndex];
                    if (anApprovedUser &&
                      anApprovedUser !== payload.who) {

                      comunicator.sendTo(payload.whoami, anApprovedUser, {
                        'type': 'approved',
                        'channel': messageBody.channel,
                        'listeners': [payload.who]
                      });
                    }
                  }
                }
              } else {

                /*eslint-disable no-console*/
                console.error('Initiator or approved users are undefined');
                /*eslint-enable no-console*/
              }

              setDirectMessagesForUsersInChannel(messageBody.channel, payload.whoami, payload.who);
              break;
            }

            case 'join-channel': {

              addListenerForChannel(messageBody.channel, payload.whoami);
              sendOffersTo(messageBody.channel, payload.whoami);
              break;
            }

            case 'approve': {

              sendUsersToConnectWithToApproved(messageBody.channel, payload.who, payload.whoami);
              break;
            }

            case 'un-approve': {

              sendNotApproval(messageBody.channel, payload.who, payload.whoami);
              break;
            }

            case 'leave-channel': {

              leaveChannel(payload.whoami, messageBody.channel);
              break;
            }

            default: {

              throw 'Message arrived un-manageable ' + payload;
            }
          }
        } else {

          /*eslint-disable no-console*/
          console.error('problem during message delivery for', payload, 'object');
          /*eslint-enable no-console*/
        }
      };

    comunicator.on('comunicator:user-leave', onLeave);
    comunicator.on('comunicator:message-arrived', onComunicatorMessage);

    return {
      'listenersForChannel': getListenersForChannel
    };
  };
}(require, module, console));

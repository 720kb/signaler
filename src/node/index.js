/*global require module console*/
(function withModule(require, module, console) {
  'use strict';

  var initiators = {}
    , listeners = {}
    , waiters = {}
    , approvedUsers = {}
    , offers = {}
    , iceCandidates = {}
    , getInitiatorForChannel = function getInitiatorForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      return initiators[channel];
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
    , removeInitiatorForChannel = function removeInitiatorForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (channel[channel]) {

        delete initiators[channel];
      } else {

        /*eslint-disable no-console*/
        console.warn('no initiator for channel', channel);
        /*eslint-enable no-console*/
      }
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
    , removeListenerForChannel = function removeListenerForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (listeners[channel]) {

        var indexOfUser = listeners[channel].indexOf(who);

        if (indexOfUser >= 0) {

          listeners[channel].splice(indexOfUser, 1);
        } else {

          /*eslint-disable no-console*/
          console.warn('user [who]', who, 'not in listeners');
          /*eslint-enable no-console*/
        }
      } else {

        throw 'no listeners for channel [channel] ' + channel;
      }
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
    , addInitiatorWaiterForChannel = function addInitiatorWaiterForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!waiters[channel]) {

        waiters[channel] = [];
      }

      waiters[channel].push(who);
    }
    , removeInitiatorWaiterForChannel = function removeInitiatorWaiterForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (waiters[channel]) {

        var indexOfUser = waiters[channel].indexOf(who);

        if (indexOfUser >= 0) {

          waiters[channel].splice(indexOfUser, 1);
        } else {

          /*eslint-disable no-console*/
          console.warn('user [who]', who, 'not in waiters');
          /*eslint-enable no-console*/
        }
      } else {

        throw 'no waiters for channel [channel] ' + channel;
      }
    }
    , getInitiatorWaitersForChannel = function getInitiatorWaitersForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (!waiters[channel]) {

        return [];
      }

      return waiters[channel];
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
    , removeApprovedUserForChannel = function removeApprovedUserForChannel(channel, who) {

      if (!channel ||
        !who) {

        throw 'channel name [channel] or user [who] provided are invalid';
      }

      if (approvedUsers[channel]) {

        var indexOfUser = approvedUsers[channel].indexOf(who);

        if (indexOfUser >= 0) {

          approvedUsers[channel].splice(indexOfUser, 1);
        } else {

          /*eslint-disable no-console*/
          console.warn('user [who]', who, 'not in approved users');
          /*eslint-enable no-console*/
        }
      } else {

        throw 'no approved users for channel [channel] ' + channel;
      }
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
    , setOfferForUserInChannel = function setOfferForUserInChannel(channel, who, offer) {

      if (!channel ||
        !who ||
        !offer) {

        throw 'channel name [channel], user [who] or offer [offer] provided are invalid';
      }

      if (offers[channel]) {

        /*eslint-disable no-console*/
        console.warn('There already is an offer for channel', channel, 'identified by', offers[channel]);
        /*eslint-enable no-console*/
      } else {

        offers[channel] = {
          'who': who,
          'offer': offer
        };
      }
    }
    , getOfferForChannel = function getOfferForChannel(channel) {

      if (!channel) {

        throw 'channel name [channel] provided is invalid';
      }

      if (offers[channel]) {

        var toReturn = offers[channel];

        delete offers[channel];
        return toReturn;
      }

      /*eslint-disable no-console*/
      console.warn('Offer for channel', channel, 'isn\'t present.');
      /*eslint-enable no-console*/
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
    , manageInitiator = function manageInitiator(theChannel, theChannelUser, initiator) {

      if (initiator &&
        theChannelUser === initiator) {

        // XXX is the owner of channel. I should kick all the other users.
        removeInitiatorForChannel(theChannel);
      } else {

        removeListenerForChannel(theChannel, theChannelUser);
      }
    }
    , manageInitiatorWaiter = function manageInitiatorWaiter(theChannel, theChannelUser, inititatorWaiters) {

      if (inititatorWaiters) {

        var waitersForInitiatorForChannelLength = inititatorWaiters.length
          , eliminateUserFromInitiatorWaitersInChannel = false
          , usersWaitingForInitiatorIndex = 0
          , aUserWaitingForInitiatorForChannel;

        for (; usersWaitingForInitiatorIndex < waitersForInitiatorForChannelLength; usersWaitingForInitiatorIndex += 1) {

          aUserWaitingForInitiatorForChannel = inititatorWaiters[usersWaitingForInitiatorIndex];
          if (aUserWaitingForInitiatorForChannel === theChannelUser) {

            eliminateUserFromInitiatorWaitersInChannel = true;
            break;
          }
        }

        if (eliminateUserFromInitiatorWaitersInChannel) {

          removeInitiatorWaiterForChannel(theChannel, theChannelUser);
        }
      }
    }
    , manageApprovedUser = function manageApprovedUser(theChannel, theChannelUser, theApprovedUsers) {

      if (theApprovedUsers) {

        var usersApprovedInChannelLength = theApprovedUsers.length
          , eliminateUserFromApprovedInChannel = false
          , usersApprovedInChannelIndex = 0
          , aUserApprovedInChannel;

        for (; usersApprovedInChannelIndex < usersApprovedInChannelLength; usersApprovedInChannelIndex += 1) {

          aUserApprovedInChannel = theApprovedUsers[usersApprovedInChannelIndex];
          if (aUserApprovedInChannel === theChannelUser) {

            eliminateUserFromApprovedInChannel = true;
            break;
          }
        }

        if (eliminateUserFromApprovedInChannel) {

          removeApprovedUserForChannel(theChannel, theChannelUser);
        }
      }
    }
    , isEmpty = function isEmpty(map) {
      for (var key in map) {

        if (map.hasOwnProperty(key)) {

          return false;
        }
      }
      return true;
    }
    , leave = function leave(whoami) {

      var initiatorsKeys = Object.keys(initiators)
        , initiatorsKeysLength = initiatorsKeys.length
        , initiatorsKeysIndex = 0
        , anInitiatorChannel
        , channelInitiator
        , channelInitiatorWaiters
        , approvedUsersInChannel
        , listenersKeys = Object.keys(listeners)
        , listenersKeysIndex = 0
        , listenersKeysLength = listenersKeys.length
        , aListenersChannel
        , aListenersChannelIndex = 0
        , waitersKeys = Object.keys(waiters)
        , waitersKeysIndex = 0
        , waitersKeysLength = waitersKeys.length
        , aWaitersChannel
        , aWaitersChannelIndex = 0
        , approvedUsersKeys = Object.keys(approvedUsers)
        , approvedUsersKeysIndex = 0
        , approvedUsersKeysLength = approvedUsersKeys.length
        , anApprovedUsersChannel
        , anApprovedUsersChannelIndex = 0
        , offersKeys = Object.keys(offers)
        , offersKeysIndex = 0
        , offersKeysLength = offersKeys.length
        , anOffersChannel
        , iceCandidatesKeys = Object.keys(iceCandidates)
        , iceCandidatesKeysIndex = 0
        , iceCandidatesKeysLength = iceCandidatesKeys.length
        , anIceCandidatesChannel
        , anIceCandidatesChannelKeys
        , anIceCandidatesChannelKeysIndex = 0;

      for (; initiatorsKeysIndex < initiatorsKeysLength; initiatorsKeysIndex += 1) {

        anInitiatorChannel = initiatorsKeys[initiatorsKeysIndex];
        if (anInitiatorChannel &&
          anInitiatorChannel === whoami) {

          delete initiators[anInitiatorChannel];
          channelInitiator = getInitiatorForChannel(initiatorsKeysIndex);
          channelInitiatorWaiters = getInitiatorWaitersForChannel(initiatorsKeysIndex);
          approvedUsersInChannel = getApprovedUsersForChannel(initiatorsKeysIndex);
          if (channelInitiator) {

            manageInitiator(initiatorsKeysIndex, aChannelUser, channelInitiator);
          } else {

            removeListenerForChannel(this, initiatorsKeysIndex, aChannelUser);
          }

          if (channelInitiatorWaiters) {

            manageInitiatorWaiter(initiatorsKeysIndex, aChannelUser, channelInitiatorWaiters);
          }

          if (approvedUsersInChannel) {

            manageApprovedUser(initiatorsKeysIndex, aChannelUser, approvedUsersInChannel);
          }
        }
      }

      for (; listenersKeysIndex < listenersKeysLength; listenersKeysIndex += 1) {

        aListenersChannel = listeners[listenersKeys[listenersKeysIndex]];
        for (aListenersChannelIndex = 0; aListenersChannelIndex < aListenersChannel.length; aListenersChannelIndex += 1) {

          if (aListenersChannel[aListenersChannelIndex] &&
            aListenersChannel[aListenersChannelIndex] === whoami) {

            listeners[listenersKeys[listenersKeysIndex]].splice(aListenersChannelIndex, 1);
            if (listeners[listenersKeys[listenersKeysIndex]].length === 0) {

              delete listeners[listenersKeys[listenersKeysIndex]];
            }
          }
        }
      }

      for (; waitersKeysIndex < waitersKeysLength; waitersKeysIndex += 1) {

        aWaitersChannel = waiters[waitersKeys[waitersKeysIndex]];
        for (aWaitersChannelIndex = 0; aWaitersChannelIndex < aWaitersChannel.length; aWaitersChannelIndex += 1) {

          if (aWaitersChannel[aWaitersChannelIndex] &&
            aWaitersChannel[aWaitersChannelIndex] === whoami) {

            waiters[waitersKeys[waitersKeysIndex]].splice(aWaitersChannelIndex, 1);
            if (waiters[waitersKeys[waitersKeysIndex]].length === 0) {

              delete waiters[waitersKeys[waitersKeysIndex]];
            }
          }
        }
      }

      for (; approvedUsersKeysIndex < approvedUsersKeysLength; approvedUsersKeysIndex += 1) {

        anApprovedUsersChannel = approvedUsers[approvedUsersKeys[approvedUsersKeysIndex]];
        for (anApprovedUsersChannelIndex = 0; anApprovedUsersChannelIndex < anApprovedUsersChannel.length; anApprovedUsersChannelIndex += 1) {

          if (anApprovedUsersChannel[anApprovedUsersChannelIndex] &&
            anApprovedUsersChannel[anApprovedUsersChannelIndex] === whoami) {

            approvedUsers[approvedUsersKeys[approvedUsersKeysIndex]].splice(anApprovedUsersChannelIndex, 1);
            if (approvedUsers[approvedUsersKeys[approvedUsersKeysIndex]].length === 0) {

              delete approvedUsers[approvedUsersKeys[approvedUsersKeysIndex]];
            }
          }
        }
      }

      for (; offersKeysIndex < offersKeysLength; offersKeysIndex += 1) {

        anOffersChannel = offers[offersKeys[offersKeysIndex]];
        if (anOffersChannel &&
          anOffersChannel.who === whoami) {

          delete offers[offersKeys[offersKeysIndex]];
        }
      }

      for (; iceCandidatesKeysIndex < iceCandidatesKeysLength; iceCandidatesKeysIndex += 1) {

        anIceCandidatesChannel = iceCandidates[iceCandidatesKeys[iceCandidatesKeysIndex]];
        if (anIceCandidatesChannel) {

          anIceCandidatesChannelKeys = Object.keys(anIceCandidatesChannel);
          for (anIceCandidatesChannelKeysIndex = 0; anIceCandidatesChannelKeysIndex < anIceCandidatesChannelKeys.length; anIceCandidatesChannelKeysIndex += 1) {

            if (anIceCandidatesChannelKeys[anIceCandidatesChannelKeysIndex] &&
              anIceCandidatesChannelKeys[anIceCandidatesChannelKeysIndex] === whoami) {

              delete iceCandidates[iceCandidatesKeys[iceCandidatesKeysIndex]][anIceCandidatesChannelKeys[anIceCandidatesChannelKeysIndex]];
              if (isEmpty(iceCandidates[iceCandidatesKeys[iceCandidatesKeysIndex]])) {

                delete iceCandidates[iceCandidatesKeys[iceCandidatesKeysIndex]];
              }
            }
          }
        }
      }
    };

  module.exports = function signalerExport(saltKey) {

    var comunicator = require('comunicator')(saltKey)
      , addOfferForChannel = function addOfferForChannel(offer, whoami, channel) {

        var waiters = getInitiatorWaitersForChannel(channel)
          , firstWaiter
          , waitersIndex
          , aWaiter;

        if (waiters &&
            waiters.length > 0) {

          firstWaiter = waiters[0];
          if (firstWaiter &&
            firstWaiter.length > 0) {

            comunicator.sendTo(whoami, firstWaiter, {
              'scope': 'offer',
              'channel': channel,
              'data': offer
            });
            removeInitiatorWaiterForChannel(channel, firstWaiter);
          }

          if (waiters.length > 1) {

            for (waitersIndex = 1; waitersIndex < waiters.length; waitersIndex += 1) {

              aWaiter = waiters[waitersIndex];
              comunicator.sendTo(whoami, aWaiter, {
                'scope': 'redo-join',
                'channel': channel
              });
              removeInitiatorWaiterForChannel(channel, aWaiter);
            }
          }
        } else {

          setOfferForUserInChannel(channel, whoami, offer);
        }
      }
      , sendOffersTo = function sendOffersTo(aWebSocket, whoami, channel) {

        var initiator = getInitiatorForChannel(channel)
          , offer = getOfferForChannel(channel)
          , who
          , offerToSend;

        if (offer) {

          who = Object.keys(offer)[0];
          offerToSend = offer[who];
          comunicator.sendTo(whoami, who, {
            'scope': 'offer',
            'channel': channel,
            'data': offer
          });
        } else if (initiator) {

          comunicator.sendTo(whoami, initiator, {
            'scope': 'p2p-inst',
            'channel': channel
          });
        } else {

          addInitiatorWaiterForChannel(channel, whoami);
        }
      }
      , sendAnswerTo = function sendAnswerTo(channel, who, whoami, answer) {

        comunicator.sendTo(whoami, who, {
          'scope': 'answer',
          'channel': channel,
          'data': answer
        });
      }
      , sendCandidatesTo = function sendCandidatesTo(who, whoami, channel) {

        var iceCandidates = getIceCandidatesForUserInChannel(channel, who);

        if (iceCandidates &&
          iceCandidates.length > 0) {

          comunicator.sendTo(whoami, who, {
            'scope': 'candidate',
            'channel': channel,
            'data': iceCandidates
          });
        }
      }
      , sendP2PIsInst = function sendP2PIsInst(channel, who, whoami) {

        comunicator.sendTo(whoami, who, {
          'scope': 'p2p-is-instantiated',
          'channel': channel
        });
      }
      , sendUsersToConnectWithToApproved = function sendUsersToConnectWithToApproved(channel, who, whoami) {

        var initiator = getInitiatorForChannel(channel)
          , listenersForChannel = getListenersForChannel(channel)
          , usersInChannel = Object.keys(listenersForChannel)
          , ownerInChannel = usersInChannel.indexOf(whoami)
          , approvedUserInChannel;

        if (initiator &&
            who &&
            initiator === whoami) {

          if (ownerInChannel >= 0) {

            usersInChannel.splice(ownerInChannel, 1);
            approvedUserInChannel = usersInChannel.indexOf(who);
            if (approvedUserInChannel >= 0) {

              usersInChannel.splice(approvedUserInChannel, 1);
              addApprovedUserForChannel(channel, who);
              comunicator.sendTo(whoami, who, {
                'scope': 'approved',
                'channel': channel,
                'data': usersInChannel
              });
            }
          }
        }
      }
      , sendNotApproval = function sendNotApproval(channel, who, whoami) {

        var initiator = getInitiatorForChannel(channel);

        if (who &&
          initiator === whoami) {

          removeApprovedUserForChannel(channel, who);
          comunicator.sendTo(whoami, who, {
            'scope': 'un-approved',
            'channel': channel
          });
        }
      };

    comunicator.on('comunicator:user-leave', leave);
    comunicator.on('comunicator:message-arrived', function onComunicatorMessage(payload) {
      // { 'whoami': parsedMsg.data.whoami, 'who': parsedMsg.data.who, 'what': parsedMsg.data.what }

      if (payload &&
        payload.whoami &&
        payload.who &&
        payload.what &&
        payload.what.scope) {

        var messageBody = payload.what;

        switch (messageBody.scope) {
          case 'open': {

            /*
            if (parsedMsg.payload) {

              setInitiatorForChannel(messageBody.channel, payload.whoami);
              addOfferForChannel(messageBody.offer, parsedMsg.whoami, messageBody.channel);
              if (parsedMsg.who) {

                sendP2PIsInst(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami);
              }
            }
            */
            break;
          }

          case 'join': {

            /*
            addListenerForChannel(parsedMsg.channel, parsedMsg.whoami);
            sendOffersTo(aWebSocket, parsedMsg.whoami, parsedMsg.channel);
            */
            break;
          }

          case 'answer': {

            /*
            sendAnswerTo(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami, parsedMsg.payload);
            */
            break;
          }

          case 'ice-candidate': {

            /*
            if (parsedMsg.payload &&
              parsedMsg.whoami &&
              parsedMsg.channel) {

              if (directIceCandidates[parsedMsg.channel] &&
                directIceCandidates[parsedMsg.channel][parsedMsg.who] &&
                directIceCandidates[parsedMsg.channel][parsedMsg.who][parsedMsg.whoami]) {

                sockets[parsedMsg.channel][parsedMsg.who].send('candidate', parsedMsg.channel, parsedMsg.who, parsedMsg.whoami, [parsedMsg.payload]);
              } else {

                addIceCandidateForUserInChannel(parsedMsg.channel, parsedMsg.whoami, parsedMsg.payload);
              }
            }
            */
            break;
          }

          default: {

            throw {
              'cause': 'Message arrived un-manageable',
              'target': payload
            };
          }
        }
      } else {

        /*eslint-disable no-console*/
        console.error('problem during message delivery for', payload, 'object');
        /*eslint-enable no-console*/
      }
    });

    return {
      'listenersForChannel': getListenersForChannel
    };
  };


  /*

    , sockets = {};

  module.exports = function exporting() {

    var manageIncomingMessage = function manageIncomingMessage(message, aWebSocket) {

          var parsedMsg = JSON.parse(message);
          //{
          //    'opcode': opcode,
          //    'whoami': whoami,
          //    'token': 'jwt-token',
          //    'who': who,
          //    'channel': channel,
          //    'payload': data
          //}


          console.log('-- incoming --', {
            'opcode': parsedMsg.opcode,
            'whoami': parsedMsg.whoami,
            'token': 'jwt-token',
            'who': parsedMsg.who,
            'channel': parsedMsg.channel
          });


          if (// Mandatory fields
            parsedMsg.opcode &&
            parsedMsg.whoami &&
            parsedMsg.token &&
            parsedMsg.channel) {

            addWebSocketForChannel(aWebSocket, parsedMsg.whoami, parsedMsg.channel);
            //jwt.verify(parsedMsg.token, config.sessionSecretKey, function () {
            switch (parsedMsg.opcode) {

              case 'useIceCandidates':

                sendCandidatesTo(parsedMsg.who, parsedMsg.whoami, parsedMsg.channel);
                getInitiatorAndApprovedUsersForChannel(parsedMsg.channel).then(function onSuccess(response) {

                  if (response.initiator === parsedMsg.whoami) {

                    if (response.approvedUsers) {
                      var approvedUsersIndex = 0
                        , approvedUsersLength = response.approvedUsers.length
                        , anApprovedUser;
                      for (; approvedUsersIndex < approvedUsersLength; approvedUsersIndex += 1) {

                        anApprovedUser = response.approvedUsers[approvedUsersIndex];
                        if (anApprovedUser &&
                          anApprovedUser !== parsedMsg.who) {

                          sockets[parsedMsg.channel][anApprovedUser].send('approved', parsedMsg.channel, parsedMsg.who, parsedMsg.whoami, [parsedMsg.who]);
                        }
                      }
                    }
                  }
                });
                if (!directIceCandidates[parsedMsg.channel]) {

                  directIceCandidates[parsedMsg.channel] = {};
                }

                if (!directIceCandidates[parsedMsg.channel][parsedMsg.whoami]) {

                  directIceCandidates[parsedMsg.channel][parsedMsg.whoami] = {};
                }

                directIceCandidates[parsedMsg.channel][parsedMsg.whoami][parsedMsg.who] = true;
              break;

              case 'approve':

                sendUsersToConnectWithToApproved(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami);
              break;

              case 'unApprove':

                sendNotApproval(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami);
              break;

              case 'leave':

                websocketClosed(aWebSocket);
              break;

              default:


                console.error(parsedMsg.opcode, 'un-manageable.');

            }
            //});
          } else {

            console.error(parsedMsg, 'is an unaccettable message.');
          }
        };
  };
  */
}(require, module, console));

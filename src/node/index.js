/*global require module process console*/
(function withModule(require, module, console) {
  'use strict';

  var initiators = {}
    , listeners = {}
    , waiters = {}
    , approvedUsers = {}
    , offers = {}
    , iceCandidates = {}
    , directIceCandidates = {}
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
        if (!initiatorForChannel) {

          initiators[channel] = who;
        } else {

          console.warn('initiator is already present. The returned value is,', initiatorForChannel);
        }
      }
    , removeInitiatorForChannel = function removeInitiatorForChannel(channel) {

        if (!channel) {

          throw 'channel name [channel] provided is invalid';
        }

        if (channel[channel]) {

          delete initiators[channel];
        } else {

          console.warn('no initiator for channel', channel);
        }
      }
    , addListenerForChannel = function addListenerForChannel(channel, who) {

        if (!channel ||
            !who) {

          throw 'channel name [channel] or user [who] provided are invalid';
        }

        var initiatorForChannel = getInitiatorForChannel(channel);
        if ((initiatorForChannel && initiatorForChannel !== who) ||
          !initiatorForChannel) {

          if (!listeners[channel]) {

            listeners[channel] = [];
          }

          if (listeners[channel].indexOf(who) < 0) {

            listeners[channel].push(who);
          } else {

            console.warn('user [who]', who, 'already in listeners');
          }
        } else {

          console.warn('un-managed scenario...');
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

            console.warn('user [who]', who, 'not in listeners');
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

            console.warn('user [who]', who, 'not in waiters');
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
        } else {

          return waiters[channel];
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

            console.warn('user [who]', who, 'not in approved users');
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
        } else {

          return approvedUsers[channel];
        }
      }
    , setOfferForUserInChannel = function setOfferForUserInChannel(channel, who, offer) {

        if (!channel ||
          !who ||
          !offer) {

          throw 'channel name [channel], user [who] or offer [offer] provided are invalid';
        }

        if (!offers[channel]) {

          offers[channel] = {
            'who': who,
            'offer': offer
          };
        } else {

          console.warn('There already is an offer for channel', channel, 'identified by', offers[channel]);
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
        } else {

          console.warn('Offer for channel', channel, 'isn\'t present.');
        }
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
          , approvedUsers = getApprovedUsersForChannel(channel);
        if (initiator &&
          approvedUsers) {

          return {
            'initiator': initiator,
            'approvedUsers': approvedUsers
          };
        } else {

          console.warn('initiator', initiator,'or approvedUsers', approvedUsers, 'are undefined');
        }
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

          waitersForInitiatorForChannelLength = inititatorWaiters.length;
          eliminateUserFromInitiatorWaitersInChannel = false;
          for (usersWaitingForInitiatorIndex = 0; usersWaitingForInitiatorIndex < waitersForInitiatorForChannelLength; usersWaitingForInitiatorIndex += 1) {

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
    , manageApprovedUser = function manageApprovedUser(theChannel, theChannelUser, approvedUsers) {

        if (approvedUsers) {

          usersApprovedInChannelLength = approvedUsers.length;
          eliminateUserFromApprovedInChannel = false;
          for (usersApprovedInChannelIndex = 0; usersApprovedInChannelIndex < usersApprovedInChannelLength; usersApprovedInChannelIndex += 1) {

            aUserApprovedInChannel = approvedUsers[usersApprovedInChannelIndex];
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
    , leave = function leave(whoami) {

        var initiatorsKeys = Object.keys(initiators)
          , listenersKeys = Object.keys(listeners)
          , waitersKeys = Object.keys(waiters)
          , approvedUsersKeys = Object.keys(approvedUsers)
          , offersKeys = Object.keys(offers)
          , iceCandidatesKeys = Object.keys(iceCandidates)
          , directIceCandidatesKeys = Object.keys(directIceCandidates)
          , initiatorsKeysIndex = 0
          , listenersKeysIndex = 0
          , waitersKeysIndex = 0
          , approvedUsersKeysIndex = 0
          , offersKeysIndex = 0
          , iceCandidatesKeysIndex = 0
          , directIceCandidatesKeysIndex = 0
          , initiatorsKeysLength = initiatorsKeys.length
          , listenersKeysLength = listenersKeys.length
          , waitersKeysLength = waitersKeys.length
          , approvedUsersKeysLength = approvedUsersKeys.length
          , offersKeysLength = offersKeys.length
          , iceCandidatesKeysLength = iceCandidatesKeys.length
          , directIceCandidatesKeysLength = directIceCandidatesKeys.length
          , anInitiatorsChannel
          , aListenersChannel
          , aWaitersChannel
          , anApprovedUsersChannel
          , anOffersChannel
          , anIceCandidatesChannel
          , aDirectIceCandidatesChannel
          , initiatorUsersInChannel

          , initiatorUsersInChannelIndex = 0

          , initiatorUsersInChannelLength

          , anInitiatorUserInChannel;
        for (; initiatorsKeysIndex < initiatorsKeysLength; initiatorsKeysIndex += 1) {

          anInitiatorsChannel = initiatorsKeys[initiatorsKeysIndex];
          if (anInitiatorsChannel) {

            initiatorUsersInChannel = Object.keys(anInitiatorsChannel);
            initiatorUsersInChannelLength = initiatorUsersInChannel.length;
            for (initiatorUsersInChannelIndex = 0; initiatorUsersInChannelIndex < initiatorUsersInChannelLength; initiatorUsersInChannelIndex += 1) {

              anInitiatorUserInChannel = initiatorUsersInChannel[initiatorUsersInChannelIndex];
              if (anInitiatorUserInChannel) {


              }
            }
          }
        }


        var channels = Object.keys(sockets)
          , aChannelIndex = 0
          , aChannel
          , channelUsers
          , channelUsersNames
          , channelUsersIndex
          , aChannelUser
          , channelsLength = channels.length
          , usersInChannelLength
          , waitersForInitiatorForChannelLength
          , eliminateUserFromInitiatorWaitersInChannel
          , usersWaitingForInitiatorIndex
          , aUserWaitingForInitiatorForChannel
          , usersApprovedInChannelLength
          , usersApprovedInChannelIndex
          , aUserApprovedInChannel
          , eliminateUserFromApprovedInChannel;

        for (aChannelIndex = 0; aChannelIndex < channelsLength; aChannelIndex += 1) {

          aChannel = channels[aChannelIndex];
          channelUsers = sockets[aChannel];
          channelUsersNames = Object.keys(channelUsers);
          usersInChannelLength = channelUsersNames.length;
          for (channelUsersIndex = 0; channelUsersIndex < usersInChannelLength; channelUsersIndex += 1) {

            aChannelUser = channelUsersNames[channelUsersIndex];
            if (aWebSocket === sockets[aChannel][aChannelUser]) {

              delete sockets[aChannel][aChannelUser];
              if (directIceCandidates[aChannel] &&
                directIceCandidates[aChannel][aChannelUser]) {

                delete directIceCandidates[aChannel][aChannelUser];
                if (isEmpty(directIceCandidates[aChannel])) {

                  delete directIceCandidates[aChannel];
                }
              }

              if (isEmpty(sockets[aChannel])) {

                delete sockets[aChannel];
              }

              getInitiatorForChannel(aChannel)
                .then(manageInitiator.bind(this, aChannel, aChannelUser))
                .catch(removeListenerForChannel.bind(this, aChannel, aChannelUser));
              getInitiatorWaitersForChannel(aChannel).then(manageInitiatorWaiter.bind(this, aChannel, aChannelUser));
              getApprovedUsersForChannel(aChannel).then(manageApprovedUser.bind(this, aChannel, aChannelUser));
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
            offerToSend = offer[who]
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
              'scope': 'p2p-is-inst',
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
        }
      , isEmpty = function isEmpty(map) {
          for (var key in map) {

            if (map.hasOwnProperty(key)) {

              return false;
            }
          }
          return true;
        }

    return {
      'listenersForChannel': getListenersForChannel
    };
  };


  /*

    , sockets = {};

  module.exports = function exporting() {

    var
      , manageIncomingMessage = function manageIncomingMessage(message, aWebSocket) {

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
              case 'open':

                if (parsedMsg.payload) {

                  setInitiatorForChannel(parsedMsg.channel, parsedMsg.whoami);
                  addOfferForChannel(parsedMsg.payload, parsedMsg.whoami, parsedMsg.channel);
                  if (parsedMsg.who) {

                    sendP2PIsInst(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami);
                  }
                }
              break;

              case 'join':

                addListenerForChannel(parsedMsg.channel, parsedMsg.whoami);
                sendOffersTo(aWebSocket, parsedMsg.whoami, parsedMsg.channel);
              break;

              case 'answer':

                sendAnswerTo(parsedMsg.channel, parsedMsg.who, parsedMsg.whoami, parsedMsg.payload);
              break;

              case 'iceCandidate':

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
              break;

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
        }
      , onRequest = function onRequest(socket) {

          socket.push = socket.send;
          socket.send = function send(opcode, channel, who, whoami, data) {
            if (socket.readyState === socket.OPEN) {

              var toSend = {
                'opcode': opcode,
                'whoami': whoami,
                'who': who,
                'channel': channel,
                'payload': data
              };
              console.log('-- send --', {
                'opcode': opcode,
                'whoami': whoami,
                'who': who,
                'channel': channel
              });
              socket.push(JSON.stringify(toSend));
            } else {

              console.log('Socket is in readyState', socket.readyState);
            }
          };

          socket.on('message', function onMessage(message) {

            manageIncomingMessage(message, socket);
          });

          socket.on('close', function onClose() {

            websocketClosed(socket);
          });
        };
  };
  */
}(require, module, console));

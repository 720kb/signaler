/*global require module process console*/
(function withModule(require, module, console) {
  'use strict';

  var redisDriver = require('redis')
    , redisPort = process.env.REDIS_PORT || 6379
    , redisIp = process.env.REDIS_IP || '127.0.0.1'
    , rtcPort = process.env.RTC_PORT || 9876
    , redis = redisDriver.createClient(redisPort, redisIp, {})
    , constructKeyForChannel = function constructKeyForChannel(channel, domain) {

        return 'channel-' + channel + ':' + domain;
      }
    , listenersField = (function calcListenersField() {

        return 'listeners';
      }())
    , initiatorField = (function calcInitiatorField() {

        return 'channelOwner';
      }())
    , waitersForInitiatorField = (function calcWaitersForInitiatorField() {

        return 'waitersForOwner';
      }())
    , approvedUsersField = (function calcApprovedUsersField() {

        return 'approvedUsers';
      }())
    , constructOffersField = function constructOffersField(who) {

        return who + '-offer';
      }
    , constructIceCadindatesFieldsForUser = function constructIceCadindatesFieldsForUser(who) {

        return who + '-iceCadidates';
      }
    , getInitiatorForChannel = function getInitiatorForChannel(channel) {
        var channelInitiatorKey = constructKeyForChannel(channel, initiatorField);
        return new Promise(function deferred(resolve, reject) {

          redis.get(channelInitiatorKey, function onResult(err, channelInitiator) {

            if (!err &&
              channelInitiator) {

              resolve(channelInitiator);
            } else {

              reject('Problems in retrieve initiator for channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , setInitiatorForChannel = function setInitiatorForChannel(channel, who) {
        var channelInitiatorKey = constructKeyForChannel(channel, initiatorField);
        getInitiatorForChannel(channel).catch(function onError() {

          redis.set(channelInitiatorKey, who);
        });
      }
    , removeInitiatorForChannel = function removeInitiatorForChannel(channel) {
        var channelInitiatorKey = constructKeyForChannel(channel, initiatorField);
        redis.del(channelInitiatorKey);
      }
    , addListenerForChannel = function addListenerForChannel(channel, who) {
        var listenersForChannel = constructKeyForChannel(channel, listenersField);
        getInitiatorForChannel(channel).then(function onSuccess(channelInitiator) {

          if (channelInitiator !== who) {

            redis.sadd(listenersForChannel, who);
          }
        }).catch(function onFailure() {

          redis.sadd(listenersForChannel, who);
        });
      }
    , removeListenerForChannel = function removeListenerForChannel(channel, who) {
        var listenersForChannel = constructKeyForChannel(channel, listenersField);
        redis.srem(listenersForChannel, who);
      }
    , getListenersForChannel = function getListenersForChannel(channel) {
        var listenersForChannel = constructKeyForChannel(channel, listenersField);
        return new RSVP.Promise(function deferred(resolve, reject) {

          redis.smembers(listenersForChannel, function onResult(err, channelMembers) {

            if (!err &&
              channelMembers) {

              resolve(channelMembers);
            } else {

              reject('Problems in retrieve listeners for channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , addInitiatorWaiterForChannel = function addInitiatorWaiterForChannel(channel, who) {
        var initiatorWaiterForChannel = constructKeyForChannel(channel, waitersForInitiatorField);
        redis.sadd(initiatorWaiterForChannel, who);
      }
    , removeInitiatorWaiterForChannel = function removeInitiatorWaiterForChannel(channel, who) {
        var initiatorWaiterForChannel = constructKeyForChannel(channel, waitersForInitiatorField);
        redis.srem(initiatorWaiterForChannel, who);
      }
    , getInitiatorWaitersForChannel = function getInitiatorWaitersForChannel(channel) {
        var initiatorWaiterForChannel = constructKeyForChannel(channel, waitersForInitiatorField);
        return new RSVP.Promise(function deferred(resolve, reject) {

          redis.smembers(initiatorWaiterForChannel, function onResult(err, inititatorWaiters) {

            if (!err &&
              inititatorWaiters) {

              resolve(inititatorWaiters);
            } else {

              reject('Problems in retrieve initiator waiters for channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , addApprovedUserForChannel = function addApprovedUserForChannel(channel, who) {
        var approvedUsersForChannel = constructKeyForChannel(channel, approvedUsersField);
        redis.sadd(approvedUsersForChannel, who);
      }
    , removeApprovedUserForChannel = function removeApprovedUserForChannel(channel, who) {
        var approvedUsersForChannel = constructKeyForChannel(channel, approvedUsersField);
        redis.srem(approvedUsersForChannel, who);
      }
    , getApprovedUsersForChannel = function getApprovedUsersForChannel(channel) {
        var approvedUsersForChannel = constructKeyForChannel(channel, approvedUsersField);
        return new RSVP.Promise(function deferred(resolve, reject) {

          redis.smembers(approvedUsersForChannel, function onResult(err, approvedUsers) {

            if (!err &&
              approvedUsers) {

              resolve(approvedUsers);
            } else {

              reject('Problems in retrieve approved users for channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , setOfferForUserInChannel = function setOfferForUserInChannel(channel, who, offer) {
        var userInChannelOfferKey = constructKeyForChannel(channel, constructOffersField(who));
        redis.set(userInChannelOfferKey, JSON.stringify(offer));
      }
    , getOfferForChannel = function getOfferForChannel(channel) {
        var userInChannelOfferKey = 'channel-' + channel + ':*-offer'
          , evalString = 'local key = redis.call(\'keys\', \'' + userInChannelOfferKey + '\')[1]; if key then local value = redis.call(\'get\', key); if value then redis.call(\'del\', key); return {key, value}; end end';
        return new RSVP.Promise(function deferred(resolve, reject) {

          redis.eval(evalString, 0, function onResult(err, anOfferKeyValue) {

            if (!err &&
              anOfferKeyValue) {

              var regExp = /\d+:(\d+)/;
              resolve({
                'key': regExp.exec(anOfferKeyValue[0])[1],
                'value': JSON.parse(anOfferKeyValue[1])
              });
            } else {

              reject('Problems in retrieve offer from channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , addIceCandidateForUserInChannel = function addIceCandidateForUserInChannel(channel, who, iceCandidate) {
        var iceCandidateForUserAndChannel = constructKeyForChannel(channel, constructIceCadindatesFieldsForUser(who));
        redis.lpush(iceCandidateForUserAndChannel, JSON.stringify(iceCandidate));
      }
    , getIceCandidatesForUserInChannel = function getIceCandidatesForUserInChannel(channel, who) {
        var iceCandidateForUserAndChannel = constructKeyForChannel(channel, constructIceCadindatesFieldsForUser(who))
          , evalString = 'local key = redis.call(\'llen\', \'' + iceCandidateForUserAndChannel + '\'); if key then local value = redis.call(\'lrange\', \'' + iceCandidateForUserAndChannel + '\', 0, key); if value then redis.call(\'del\', \'' + iceCandidateForUserAndChannel + '\'); return value; end end';

        return new RSVP.Promise(function deferred(resolve, reject) {

          redis.eval(evalString, 0, function onResult(err, iceCandidates) {

            if (!err &&
              iceCandidates) {

              var iceCandidatesLength = iceCandidates.length
                , aJSONIceCandidateIndex
                , aJSONIceCandidate
                , toReturn = [];
              for (aJSONIceCandidateIndex = 0; aJSONIceCandidateIndex < iceCandidatesLength; aJSONIceCandidateIndex += 1) {

                aJSONIceCandidate = iceCandidates[aJSONIceCandidateIndex];
                toReturn.push(JSON.parse(aJSONIceCandidate));
              }

              resolve(toReturn);
            } else {

              reject('Problems in retrieve iceCandidate for user ' + who + ' from channel ' + channel + ' - ' + err);
            }
          });
        });
      }
    , getInitiatorAndApprovedUsersForChannel = function getInitiatorAndApprovedUsersForChannel(channel) {
        var promises = {
          'initiator': getInitiatorForChannel(channel),
          'approved': getApprovedUsersForChannel(channel)
        };

        return new RSVP.Promise(function deferred(resolve, reject) {
          RSVP.hashSettled(promises).then(function deferred(results) {

            if (results.initiator.state === 'fulfilled' && results.approved.state === 'fulfilled') {

              var initiator = results.initiator.value
                , approvedUsers = results.approved.value;

              resolve({
                'initiator': initiator,
                'approvedUsers': approvedUsers
              });
            } else {

              reject('Something goes wrong :(...');
            }
          });
        });
      }
    , isEmpty = function isEmpty(map) {
        for (var key in map) {

          if (map.hasOwnProperty(key)) {

            return false;
          }
        }
        return true;
      }
    , sockets = {}
    , directIceCandidates = {};

  module.exports = function exporting() {

    var websocketClosed = function websocketClosed(aWebSocket) {

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
            , eliminateUserFromApprovedInChannel
            , manageListener = function manageListener(theChannel, theChannelUser) {
                removeListenerForChannel(theChannel, theChannelUser);
              }
            , manageInitiator = function manageInitiator(theChannel, theChannelUser, initiator) {

                if (initiator &&
                  theChannelUser === initiator) {

                    // XXX is the owner of channel. I should kick all the other users.
                    removeInitiatorForChannel(theChannel);
                } else {

                  manageListener(theChannel, theChannelUser);
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
              };

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
                  .catch(manageListener.bind(this, aChannel, aChannelUser));
                getInitiatorWaitersForChannel(aChannel).then(manageInitiatorWaiter.bind(this, aChannel, aChannelUser));
                getApprovedUsersForChannel(aChannel).then(manageApprovedUser.bind(this, aChannel, aChannelUser));
              }
            }
          }
        }
      , addWebSocketForChannel = function addWebSocketForChannel(aWebSocket, whoami, channel) {
          if (!sockets[channel]) {

            sockets[channel] = {};
          }
          sockets[channel][whoami] = aWebSocket;
        }
      , addOfferForChannel = function addOfferForChannel(offer, whoami, channel) {
          getInitiatorWaitersForChannel(channel).then(function onSuccess(waiters) {

            var firstWaiter
              , waitersIndex
              , aWaiter;
            if (waiters &&
              waiters.length > 0) {

              firstWaiter = waiters[0];
              if (firstWaiter &&
                firstWaiter.length > 0) {

                sockets[channel][firstWaiter].send('offer', channel, firstWaiter, whoami, offer);
                removeInitiatorWaiterForChannel(channel, firstWaiter);
              }

              if (waiters.length > 1) {

                for (waitersIndex = 1; waitersIndex < waiters.length; waitersIndex += 1) {

                  aWaiter = waiters[waitersIndex];

                  sockets[channel][aWaiter].send('redoJoin', channel, aWaiter, whoami);
                  removeInitiatorWaiterForChannel(channel, aWaiter);
                }
              }
            } else {

              setOfferForUserInChannel(channel, whoami, offer);
            }
          });
        }
      , sendOffersTo = function sendOffersTo(aWebSocket, whoami, channel) {
          var promises = {
            'initiator': getInitiatorForChannel(channel),
            'offer': getOfferForChannel(channel)
          };

          RSVP.hashSettled(promises).then(function deferred(results) {

            if (results.offer.state === 'fulfilled') {

              var who = results.offer.value.key
                , offerToSend = results.offer.value.value;
              aWebSocket.send('offer', channel, whoami, who, offerToSend);
            } else if (results.initiator.state === 'fulfilled') {

              sockets[channel][results.initiator.value].send('p2pInst', channel, results.initiator.value, whoami);
            } else {

              addInitiatorWaiterForChannel(channel, whoami);
            }
          });
        }
      , addCandidateForChannel = function addCandidateForChannel(iceCandidate, whoami, channel) {

          addIceCandidateForUserInChannel(channel, whoami, iceCandidate);
        }
      , sendCandidatesTo = function sendCandidatesTo(who, whoami, channel) {
          getIceCandidatesForUserInChannel(channel, who).then(function onSuccess(iceCandidates) {

            if (iceCandidates &&
              iceCandidates.length > 0 &&
              sockets[channel] &&
              sockets[channel][whoami]) {

              sockets[channel][whoami].send('candidate', channel, whoami, who, iceCandidates);
            }
          });
        }
      , sendAnswerTo = function sendAnswerTo(channel, who, whoami, answer) {
          if (sockets[channel] &&
            sockets[channel][who]) {

            sockets[channel][who].send('answer', channel, who, whoami, answer);
          }
        }
      , sendP2PIsInst = function sendP2PIsInst(channel, who, whoami) {
          if (sockets[channel] &&
            sockets[channel][who]) {

            sockets[channel][who].send('p2pIsInst', channel, who, whoami);
          } else {

            console.error('Params not valid');
          }
        }
      , sendUsersToConnectWithToApproved = function sendUsersToConnectWithToApproved(channel, who, whoami) {
          getInitiatorForChannel(channel).then(function onSuccess(initiator) {

            if (who &&
              initiator === whoami) {

              var usersInChannel = Object.keys(sockets[channel])
                , ownerInChannel = usersInChannel.indexOf(whoami)
                , approvedUserInChannel;

              if (ownerInChannel >= 0) {

                usersInChannel.splice(ownerInChannel, 1);
                approvedUserInChannel = usersInChannel.indexOf(who);
                if (approvedUserInChannel >= 0) {

                  usersInChannel.splice(approvedUserInChannel, 1);
                  addApprovedUserForChannel(channel, who);
                  sockets[channel][who].send('approved', channel, who, whoami, usersInChannel);
                }
              }
            }
          });
        }
      , sendNotApproval = function sendNotApproval(channel, who, whoami) {
          getInitiatorForChannel(channel).then(function onSuccess(initiator) {

            if (who &&
              initiator === whoami) {

              removeApprovedUserForChannel(channel, who);
              sockets[channel][who].send('unApproved', channel, who, whoami);
            }
          });
        }
      , manageIncomingMessage = function manageIncomingMessage(message, aWebSocket) {

          var parsedMsg = JSON.parse(message);
          /*{
              'opcode': opcode,
              'whoami': whoami,
              'token': 'jwt-token',
              'who': who,
              'channel': channel,
              'payload': data
          }*/

          /*eslint-disable no-console*/
          console.log('-- incoming --', {
            'opcode': parsedMsg.opcode,
            'whoami': parsedMsg.whoami,
            'token': 'jwt-token',
            'who': parsedMsg.who,
            'channel': parsedMsg.channel
          });
          /*eslint-enable no-console*/

          if (/* Mandatory fields */
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

                    addCandidateForChannel(parsedMsg.payload, parsedMsg.whoami, parsedMsg.channel);
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

                /*eslint-disable no-console*/
                console.error(parsedMsg.opcode, 'un-manageable.');
                /*eslint-enable no-console*/
            }
            //});
          } else {

            /*eslint-disable no-console*/
            console.error(parsedMsg, 'is an unaccettable message.');
            /*eslint-enable no-console*/
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

    wss.on('connection', onRequest);
    process.on('SIGTERM', function onSigTerm(exitCallback) {

      redis.quit();
      if (exitCallback) {

        exitCallback();
      }
    });

    return {
      'listenersForChannel': getListenersForChannel
    };
  };
}(require, module, console));

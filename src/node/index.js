/*global require,module,console,JSON*/
(function withModule(require, module, console, JSON) {
  'use strict';

  var channels = {};

  module.exports = function exportingFunction(saltKey) {

    var comunicator = require('comunicator')(saltKey)
    , onComunicatorMessage = function onComunicatorMessage(payload) {

      // { 'whoami': parsedMsg.data.whoami, 'who': parsedMsg.data.who, 'what': parsedMsg.data.what }
      if (payload &&
        payload.whoami &&
        payload.who &&
        payload.what &&
        payload.what.type) {

        var messageBody = payload.what
        , messageType = messageBody.type
        , theChannel
        , theUser;

        switch (messageType) {

          case 'create-channel': {

            if (messageBody.channel) {

              theChannel = messageBody.channel;
              theUser = payload.whoami;
              if (!channels[theChannel]) {

                channels[theChannel] = [];
              }

              channels[theChannel].push({
                'user': theUser,
                'role': 'master',
                'channel': theChannel
              });
            } else {

              throw 'Missing mandatory <channel> value';
            }
            break;
          }

          case 'join-channel': {

            if (messageBody.channel) {

              theChannel = messageBody.channel;
              theUser = payload.whoami;
              if (!channels[theChannel]) {

                channels[theChannel] = [];
              }

              channels[theChannel].push({
                'user': theUser,
                'role': 'slave',
                'channel': theChannel
              });
            } else {

              throw 'Missing mandatory <channel> value';
            }
            break;
          }

          case 'offer': {

            if (messageBody.channel &&
              messageBody.offer) {

              comunicator.sendTo(payload.whoami, payload.who, {
                'type': 'take-offer',
                'channel': messageBody.channel,
                'offer': messageBody.offer
              });
            } else {

              throw 'Missing mandatory <channel> and <offer> values';
            }
            break;
          }

          case 'answer': {

            if (messageBody.channel &&
              messageBody.answer) {

              comunicator.sendTo(payload.whoami, payload.who, {
                'type': 'take-answer',
                'channel': messageBody.channel,
                'answer': messageBody.answer
              });
            } else {

              throw 'Missing mandatory <channel> and <answer> values';
            }
            break;
          }

          case 'use-ice-candidates': {

            theChannel = channels[messageBody.channel];
            theChannel.forEach(function iterator(anElement) {

              if (anElement &&
                anElement.user === payload.who) {

                comunicator.sendTo(payload.whoami, payload.who, {
                  'type': 'take-candidates',
                  'channel': messageBody.channel,
                  'candidates': messageBody.candidates
                });
              }
            });
            break;
          }

          case 'approve': {

            theChannel = channels[messageBody.channel];
            theChannel.forEach(function iterator(anElement) {

              if (anElement &&
                anElement.user === payload.who &&
                !anElement.approved) {

                anElement.approved = true;
              } else if (anElement.role !== 'master') {

                comunicator.sendTo(payload.who, anElement.user, {
                  'type': 'approved',
                  'channel': anElement.channel
                });
              }
            });
            break;
          }

          case 'un-approve': {

            theChannel = channels[messageBody.channel];
            theChannel.forEach(function iterator(anElement) {

              if (anElement &&
                anElement.user === payload.who &&
                anElement.approved) {
                var usersInChannelExceptApproved = theChannel.filter(function filtering(anElementToFilter) {

                  if (anElementToFilter.user !== payload.who &&
                    anElementToFilter.role !== 'master') {

                    return true;
                  }
                }).map(function mapping(anElementToMap) {

                  return anElementToMap.user;
                });

                delete anElement.approved;
                comunicator.sendTo(payload.whoami, payload.who, {
                  'type': 'you-are-un-approved',
                  'channel': anElement.channel,
                  'users': usersInChannelExceptApproved
                });
              } else if (anElement.role === 'slave') {

                comunicator.sendTo(payload.who, anElement.user, {
                  'type': 'un-approved',
                  'channel': anElement.channel
                });
              }
            });
            break;
          }

          case 'leave-channel': {

            theChannel = channels[messageBody.channel];
            for (var i = theChannel.length - 1; i >= 0; i -= 1) {

              theUser = theChannel[i];
              if (theUser &&
                theUser.user === payload.whoami) {

                channels[messageBody.channel].splice(i, 1);
              }
            }
            break;
          }

          default: {

            throw 'Message arrived un-manageable ' + JSON.stringify(payload);
          }
        }
      } else {

        throw 'Problem during message delivery for' + JSON.stringify(payload);
      }
    }
    , onChannelChange = function onChannelChange(changes) {

      if (changes) {

        changes.forEach(function iterator(aChange) {

          if (aChange &&
            aChange.type &&
            aChange.object) {

            switch (aChange.type) {

              //{ type: 'splice', object: [ [Object], [Object] ], index: 1, removed: [], addedCount: 1 }
              case 'splice': {
                var theElement
                , usersInChannelIndex = 0
                , usersInChannelLength = aChange.object.length
                , aUserInChannel;

                if (aChange.addedCount > 0) {

                  theElement = aChange.object[aChange.index];
                  if (theElement.role === 'master') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel &&
                        aUserInChannel.role === 'slave') {

                        comunicator.sendTo(aUserInChannel.user, theElement.user, {
                          'type': 'do-handshake',
                          'channel': aUserInChannel.channel
                        });
                      }
                    }
                  } else if (theElement.role === 'slave') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel &&
                        aUserInChannel.role === 'master') {

                        comunicator.sendTo(theElement.user, aUserInChannel.user, {
                          'type': 'do-handshake',
                          'channel': aUserInChannel.channel
                        });
                        break;
                      }
                    }
                  }
                } else { //initiator is gone

                  theElement = aChange.removed[0];
                  if (theElement.role === 'master') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel &&
                        aUserInChannel.role === 'slave') {

                        comunicator.sendTo(theElement.user, aUserInChannel.user, {
                          'type': 'initiator-quit',
                          'channel': aUserInChannel.channel
                        });
                      }
                    }
                  } else if (theElement.role === 'slave') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel) {

                        comunicator.sendTo(theElement.user, aUserInChannel.user, {
                          'type': 'slave-quit',
                          'channel': aUserInChannel.channel
                        });
                      }
                    }
                  }
                }
                break;
              }

              //{ type: 'update', object: [ 33, 2, 3 ], name: '0', oldValue: 1 }
              case 'update': {

                console.log(aChange);
                break;
              }

              default: {

                throw 'Un-managed observable type ' + JSON.stringify(aChange);
              }
            }
          } else {

            throw 'Observable object structure is changed ' + JSON.stringify(aChange);
          }
        });
      } else {

        throw 'No changes but observe is launched';
      }
    }
    , onChannelsChange = function onChannelsChange(changes) {

      if (changes) {

        changes.forEach(function iterator(aChange) {

          if (aChange &&
            aChange.type &&
            aChange.object &&
            aChange.name) {

            switch (aChange.type) {

              case 'add': {

                Array.observe(aChange.object[aChange.name], onChannelChange);
                break;
              }

              case 'update': {

                if (aChange.oldValue) {

                  Array.unobserve(aChange.oldValue[aChange.name], onChannelChange);
                }

                Array.observe(aChange.object[aChange.name], onChannelChange);
                break;
              }

              case 'delete': {

                if (aChange.oldValue) {

                  Array.unobserve(aChange.oldValue[aChange.name], onChannelChange);
                }
                break;
              }
              default: {

                throw 'Un-managed observable type ' + JSON.stringify(aChange);
              }
            }
          } else {

            throw 'Observable object structure is changed ' + JSON.stringify(aChange);
          }
        });
      } else {

        throw 'No changes but observe is launched';
      }
    };

    //comunicator.on('comunicator:user-leave', onLeave);
    comunicator.on('comunicator:message-arrived', onComunicatorMessage);
    Object.observe(channels, onChannelsChange);
  };
}(require, module, console, JSON));

/*global require,module,console,JSON,setInterval*/
(function withModule(require, module, console, JSON, setInterval) {
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

          case 'ice-candidate': {

            if (messageBody.channel) {

              theChannel = channels[messageBody.channel];
              theChannel.forEach(function iterator(anElement) {

                if (anElement &&
                  anElement.user === payload.who) {

                  if (anElement.useDirectlyIceCandidates) {

                    comunicator.sendTo(payload.whoami, payload.who, {
                      'type': 'take-candidates',
                      'channel': messageBody.channel,
                      'candidates': [messageBody.candidate]
                    });
                  } else {

                    if (!anElement.iceCandidates) {

                      anElement.iceCandidates = [];
                    }
                    anElement.iceCandidates.push(messageBody.candidate);
                  }
                }
              });
            }
            break;
          }

          case 'use-ice-candidates': {

            theChannel = channels[messageBody.channel];
            theChannel.forEach(function iterator(anElement) {

              if (anElement &&
                anElement.user === payload.who) {

                if (anElement.iceCandidates &&
                anElement.iceCandidates.length > 0) {

                  comunicator.sendTo(payload.whoami, payload.who, {
                    'type': 'take-candidates',
                    'channel': messageBody.channel,
                    'candidates': anElement.iceCandidates.splice(0, anElement.iceCandidates.length)
                  });
                } else {

                  anElement.useDirectlyIceCandidates = true;
                }
              }
            });
            break;
          }

          case 'reset-candidates': {

            theChannel = channels[messageBody.channel];
            theChannel.forEach(function iterator(anElement) {

              if (anElement &&
                anElement.user === payload.who) {

                console.info('\r\nRESET', anElement, '\r\n');
                if (anElement.iceCandidates &&
                  anElement.iceCandidates.length > 0) {

                  anElement.iceCandidates.splice(0, anElement.iceCandidates.length);
                } else {

                  delete anElement.useDirectlyIceCandidates;
                }
              }
            });
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

                if (aChange.addedCount > 0) {
                  var theElement = aChange.object[aChange.index]
                  , usersInChannelIndex = 0
                  , usersInChannelLength = aChange.object.length
                  , aUserInChannel;

                  if (theElement.role === 'master') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel &&
                        aUserInChannel.role === 'slave') {

                        comunicator.sendTo(aUserInChannel.user, theElement.user, {
                          'type': 'master-handshake',
                          'channel': aUserInChannel.channel
                        });
                        break;
                      }
                    }
                  } else if (theElement.role === 'slave') {

                    for (; usersInChannelIndex < usersInChannelLength; usersInChannelIndex += 1) {

                      aUserInChannel = aChange.object[usersInChannelIndex];
                      if (aUserInChannel &&
                        aUserInChannel.role === 'master') {

                        comunicator.sendTo(theElement.user, aUserInChannel.user, {
                          'type': 'master-handshake',
                          'channel': aUserInChannel.channel
                        });
                        break;
                      }
                    }
                  }
                } else {

                  //TODO notify the users that he is gone...
                  console.log('aChange.addedCount === 0');
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
    /*setInterval(function logChannels() {

      console.info('\r\nChannels dump', channels, '\r\n');
    }, 5000);*/
  };
}(require, module, console, JSON, setInterval));

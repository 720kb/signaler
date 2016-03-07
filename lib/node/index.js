/*global module,require,console*/

const signalerState = {
    'channels': {}
  }
  , channelObserver = require('./channels')(signalerState);

module.exports = comunicator => {

  if (!comunicator) {

    throw new Error('Comunicator object missing');
  }

  channelObserver.forEach(element => {

    console.info(element);
  });

  comunicator
    .filter(element => element.type === 'message-arrived')
    .forEach(element => {

      // { 'whoami': parsedMsg.data.whoami, 'who': parsedMsg.data.who, 'what': parsedMsg.data.what }
      if (element &&
        element.whoami &&
        element.who &&
        element.what &&
        element.what.type) {

        const messageBody = element.what
          , messageType = messageBody.type;
        let theChannel
          , theUser;

        switch (messageType) {

          case 'create-channel': {

            if (messageBody.channel) {

              theChannel = messageBody.channel;
              theUser = element.whoami;
              if (!signalerState.channels[theChannel]) {

                signalerState.channels[theChannel] = [];
              }

              signalerState.channels[theChannel].push({
                'user': theUser,
                'role': 'master',
                'channel': theChannel
              });
            } else {

              throw new Error('Missing mandatory <channel> value');
            }
            break;
          }

          case 'join-channel': {

            if (messageBody.channel) {

              theChannel = messageBody.channel;
              theUser = element.whoami;
              if (!signalerState.channels[theChannel]) {

                signalerState.channels[theChannel] = [];
              }

              signalerState.channels[theChannel].push({
                'user': theUser,
                'role': 'slave',
                'channel': theChannel
              });
            } else {

              throw new Error('Missing mandatory <channel> value');
            }
            break;
          }

          case 'offer': {

            if (messageBody.channel &&
              messageBody.offer) {

              comunicator.sendTo(element.whoami, element.who, {
                'type': 'take-offer',
                'channel': messageBody.channel,
                'offer': messageBody.offer
              });
            } else {

              throw new Error('Missing mandatory <channel> and <offer> values');
            }
            break;
          }

          case 'answer': {

            if (messageBody.channel &&
              messageBody.answer) {

              comunicator.sendTo(element.whoami, element.who, {
                'type': 'take-answer',
                'channel': messageBody.channel,
                'answer': messageBody.answer
              });
            } else {

              throw new Error('Missing mandatory <channel> and <answer> values');
            }
            break;
          }

          case 'use-ice-candidates': {

            theChannel = signalerState.channels[messageBody.channel];
            theChannel.forEach(anElement => {

              if (anElement &&
                anElement.user === element.who) {

                comunicator.sendTo(element.whoami, element.who, {
                  'type': 'take-candidates',
                  'channel': messageBody.channel,
                  'candidates': messageBody.candidates
                });
              }
            });
            break;
          }

          case 'approve': {

            theChannel = signalerState.channels[messageBody.channel];
            theChannel.forEach(anElement => {

              if (anElement &&
                anElement.user === element.who &&
                !anElement.approved) {

                anElement.approved = true;
              } else if (anElement.role !== 'master') {

                comunicator.sendTo(element.who, anElement.user, {
                  'type': 'approved',
                  'channel': anElement.channel
                });
              }
            });
            break;
          }

          case 'un-approve': {

            theChannel = signalerState.channels[messageBody.channel];
            theChannel.forEach(anElement => {

              if (anElement &&
                anElement.user === element.who &&
                anElement.approved) {
                const usersInChannelExceptApproved = theChannel.filter(anElementToFilter => {

                  if (anElementToFilter.user !== element.who &&
                    anElementToFilter.role !== 'master') {

                    return true;
                  }
                }).map(anElementToMap => {

                  return anElementToMap.user;
                });

                delete anElement.approved;
                comunicator.sendTo(element.whoami, element.who, {
                  'type': 'you-are-un-approved',
                  'channel': anElement.channel,
                  'users': usersInChannelExceptApproved
                });
              } else if (anElement.role === 'slave') {

                comunicator.sendTo(element.who, anElement.user, {
                  'type': 'un-approved',
                  'channel': anElement.channel
                });
              }
            });
            break;
          }

          case 'leave-channel': {

            theChannel = signalerState.channels[messageBody.channel];
            for (let theChannelIndex = theChannel.length - 1; theChannelIndex >= 0; theChannelIndex -= 1) {

              theUser = theChannel[theChannelIndex];
              if (theUser &&
                theUser.user === element.whoami) {

                signalerState.channels[messageBody.channel].splice(theChannelIndex, 1);
              }
            }
            break;
          }

          default: {

            throw new Error(`Message arrived un-manageable ${JSON.stringify(element)}`);
          }
        }
      } else {

        throw new Error(`Problem during message delivery for ${JSON.stringify(element)}`);
      }
    });
  comunicator
    .filter(element => element.type === 'user-leave')
    .forEach(element => {

      console.info(element, signalerState.channels);//TODO: fix this!
      /*for (const aChannel of signalerState.channels) {

        if (aChannel &&
          aChannel[0] &&
          aChannel[1]) {
          const aChannelName = aChannel[0]
            , usersInChannel = aChannel[1]
            , usersInChannelLength = usersInChannel.length;

          for (let usersInChannelIndex = usersInChannelLength - 1; usersInChannelIndex >= 0; usersInChannelIndex -= 1) {
            let aUserInChannel = usersInChannel[usersInChannelIndex];

            if (aUserInChannel &&
              aUserInChannel.user === element.whoami) {

              usersInChannel.splice(usersInChannelIndex, 1);
            }
          }
        }
      }*/
    });
};

/*

var onChannelChange = function onChannelChange(changes) {

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

Object.observe(channels, onChannelsChange);
*/

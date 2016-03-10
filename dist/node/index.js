'use strict';

/*global module,process,require*/

var ObservableState = require('./observable-state');

module.exports = function (comunicator) {

  if (!comunicator) {

    throw new Error('Comunicator object missing');
  }
  var signalerState = new ObservableState();

  signalerState.filter(function (element) {
    return element.type === 'added';
  }).map(function (element) {
    return element.value;
  }).forEach(function (element) {
    var doSend = undefined;

    if (element.role === 'master') {

      doSend = function doSend(aChannelElement) {

        if (aChannelElement.role === 'slave') {

          comunicator.sendTo(aChannelElement.user, element.user, {
            'type': 'do-handshake',
            'channel': aChannelElement.channel
          });
          console.info(aChannelElement, 'to', element.user, 'on', aChannelElement.channel);
        } else {

          console.info(aChannelElement, 'skipped');
        }
      };
    } else if (element.role === 'slave') {

      doSend = function doSend(aChannelElement) {

        if (aChannelElement.role === 'master') {

          comunicator.sendTo(element.user, aChannelElement.user, {
            'type': 'do-handshake',
            'channel': aChannelElement.channel
          });
          console.info(element.user, 'to', aChannelElement.user, 'on', aChannelElement.channel);
        } else {

          console.info(aChannelElement, 'skipped');
        }
      };
    }

    var channel = signalerState.getChannelInState(element.channel),
        channelElements = Object.keys(channel),
        channelElementsLength = channelElements.length;
    for (var channelIndex = 0; channelIndex < channelElementsLength; channelIndex += 1) {
      var aChannelElement = channelElements[channelIndex];

      doSend(channel[aChannelElement]);
    }
  });

  comunicator.filter(function (element) {
    return element.type === 'message-arrived';
  }).forEach(function (element) {

    // { 'whoami': parsedMsg.data.whoami, 'who': parsedMsg.data.who, 'what': parsedMsg.data.what }
    if (element && element.whoami && element.who && element.what && element.what.type) {
      (function () {
        var messageBody = element.what,
            messageType = messageBody.type;

        switch (messageType) {

          case 'create-channel':
            {

              if (messageBody.channel) {
                var theChannel = messageBody.channel,
                    theUser = element.whoami;

                if (!signalerState.containsInState(theChannel)) {

                  signalerState.addChannelInState(theChannel);
                } else if (signalerState.getChannelInState(theChannel).master && signalerState.getChannelInState(theChannel).master.user !== theUser) {

                  process.nextTick(function () {

                    throw new Error('There is already a master user for this channel');
                  });
                }

                signalerState.getChannelInState(theChannel).master = {
                  'user': theUser,
                  'role': 'master',
                  'channel': theChannel
                };
              } else {

                throw new Error('Missing mandatory <channel> value');
              }
              break;
            }

          case 'join-channel':
            {

              if (messageBody.channel) {
                (function () {
                  var theChannel = messageBody.channel,
                      theUser = element.whoami;

                  if (!signalerState.containsInState(theChannel)) {

                    signalerState.addChannelInState(theChannel);
                  } else if (signalerState.getChannelInState(theChannel).master && signalerState.getChannelInState(theChannel).master.user === theUser) {

                    process.nextTick(function () {

                      throw new Error('The user ' + theUser + ' can be either master or slave');
                    });
                  }

                  signalerState.getChannelInState(theChannel)[theUser] = {
                    'user': theUser,
                    'role': 'slave',
                    'channel': theChannel
                  };
                })();
              } else {

                throw new Error('Missing mandatory <channel> value');
              }
              break;
            }

          case 'offer':
            {

              if (messageBody.channel && messageBody.offer) {

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

          case 'answer':
            {

              if (messageBody.channel && messageBody.answer) {

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

          case 'use-ice-candidates':
            {
              var theChannel = signalerState.channels[messageBody.channel];

              theChannel.forEach(function (anElement) {

                if (anElement && anElement.user === element.who) {

                  comunicator.sendTo(element.whoami, element.who, {
                    'type': 'take-candidates',
                    'channel': messageBody.channel,
                    'candidates': messageBody.candidates
                  });
                }
              });
              break;
            }

          case 'approve':
            {
              var theChannel = signalerState.channels[messageBody.channel];

              theChannel.forEach(function (anElement) {

                if (anElement && anElement.user === element.who && !anElement.approved) {

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

          case 'un-approve':
            {
              var _ret3 = function () {
                var theChannel = signalerState.channels[messageBody.channel];

                theChannel.forEach(function (anElement) {

                  if (anElement && anElement.user === element.who && anElement.approved) {
                    var usersInChannelExceptApproved = theChannel.filter(function (anElementToFilter) {

                      if (anElementToFilter.user !== element.who && anElementToFilter.role !== 'master') {

                        return true;
                      }
                    }).map(function (anElementToMap) {

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
                return 'break';
              }();

              if (_ret3 === 'break') break;
            }

          case 'leave-channel':
            {
              var theChannel = signalerState.channels[messageBody.channel];

              for (var theChannelIndex = theChannel.length - 1; theChannelIndex >= 0; theChannelIndex -= 1) {
                var theUser = theChannel[theChannelIndex];

                if (theUser && theUser.user === element.whoami) {

                  signalerState.channels[messageBody.channel].splice(theChannelIndex, 1);
                }
              }
              break;
            }

          default:
            {

              throw new Error('Message arrived un-manageable ' + JSON.stringify(element));
            }
        }
      })();
    } else {

      throw new Error('Problem during message delivery for ' + JSON.stringify(element));
    }
  });

  comunicator.filter(function (element) {
    return element.type === 'user-leave';
  }).forEach(function (element) {

    console.info(element, signalerState.channels); //TODO: fix this!
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
//# sourceMappingURL=index.js.map

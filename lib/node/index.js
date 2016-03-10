/*global module,process,require*/

const ObservableState = require('./observable-state');

module.exports = comunicator => {

  if (!comunicator) {

    throw new Error('Comunicator object missing');
  }
  const signalerState = new ObservableState();

  signalerState
    .filter(element => element.type === 'added')
    .map(element => element.value)
    .forEach(element => {
      let doSend;
      const channel = signalerState.getChannelInState(element.channel)
        , channelElements = Object.keys(channel)
        , channelElementsLength = channelElements.length;

      if (element.role === 'master') {

        doSend = aChannelElement => {

          if (aChannelElement.role === 'slave') {

            comunicator.sendTo(aChannelElement.user, element.user, {
              'type': 'do-handshake',
              'channel': aChannelElement.channel
            });
          }
        };
      } else if (element.role === 'slave') {

        doSend = aChannelElement => {

          if (aChannelElement.role === 'master') {

            comunicator.sendTo(element.user, aChannelElement.user, {
              'type': 'do-handshake',
              'channel': aChannelElement.channel
            });
          }
        };
      }

      for (let channelIndex = 0; channelIndex < channelElementsLength; channelIndex += 1) {
        const aChannelElement = channelElements[channelIndex];

        doSend(channel[aChannelElement]);
      }
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

        switch (messageType) {

          case 'create-channel': {

            if (messageBody.channel) {
              const theChannel = messageBody.channel
                , theUser = element.whoami;

              if (!signalerState.containsInState(theChannel)) {

                signalerState.addChannelInState(theChannel);
              } else if (signalerState.getChannelInState(theChannel).master &&
                signalerState.getChannelInState(theChannel).master.user !== theUser) {

                process.nextTick(() => {

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

          case 'join-channel': {

            if (messageBody.channel) {
              const theChannel = messageBody.channel
                , theUser = element.whoami;

              if (!signalerState.containsInState(theChannel)) {

                signalerState.addChannelInState(theChannel);
              } else if (signalerState.getChannelInState(theChannel).master &&
                signalerState.getChannelInState(theChannel).master.user === theUser) {

                process.nextTick(() => {

                  throw new Error(`The user ${theUser} can be either master or slave`);
                });
              }

              signalerState.getChannelInState(theChannel)[theUser] = {
                'user': theUser,
                'role': 'slave',
                'channel': theChannel
              };
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
            const theChannel = signalerState.channels[messageBody.channel];

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
            const theChannel = signalerState.channels[messageBody.channel];

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
            const theChannel = signalerState.channels[messageBody.channel];

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
            const theChannel = signalerState.channels[messageBody.channel];

            for (let theChannelIndex = theChannel.length - 1; theChannelIndex >= 0; theChannelIndex -= 1) {
              const theUser = theChannel[theChannelIndex];

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

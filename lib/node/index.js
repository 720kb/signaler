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
    .filter(element => element.role === 'master')
    .forEach(element => {
      if (element.channel &&
        element.user) {

        const channel = signalerState.getChannelInState(element.channel)
          , channelElements = Object.keys(channel);

        channelElements
          .forEach(userIdentification => {
            const userInChannelDescription = channel[userIdentification];

            if (userInChannelDescription.role === 'slave') {

              comunicator.sendTo(userInChannelDescription.user, element.user, {
                'type': 'do-handshake',
                'channel': userInChannelDescription.channel
              });
            }
          });
      } else {

        process.nextTick(() => {

          throw new Error('Missing mandatory fields channel and user');
        });
      }
    });

  signalerState
    .filter(element => element.type === 'added')
    .map(element => element.value)
    .filter(element => element.role === 'slave')
    .forEach(element => {
      if (element.channel &&
        element.user) {

        const channel = signalerState.getChannelInState(element.channel)
          , channelElements = Object.keys(channel);

        channelElements
          .forEach(userIdentification => {
            const userInChannelDescription = channel[userIdentification];

            if (userInChannelDescription.role === 'master') {

              comunicator.sendTo(element.user, userInChannelDescription.user, {
                'type': 'do-handshake',
                'channel': userInChannelDescription.channel
              });
            }
          });
      } else {

        process.nextTick(() => {

          throw new Error('Missing mandatory fields channel and user');
        });
      }
    });

  signalerState
    .filter(element => element.type === 'quit')
    .forEach(element => {

      comunicator.broadcast(element.value, {
        'type': 'i-quit',
        'channel': element.channel
      });
    });

  signalerState
    .filter(element => element.type === 'master-quit')
    .forEach(element => {

      comunicator.broadcast(element.value, {
        'type': 'master-quits',
        'channel': element.channel
      });
    });

  comunicator
    .filter(element => element.type === 'message-arrived' &&
      element.what &&
      element.what.type === 'create-channel')
    .map(element => ({
      'channel': element.what.channel,
      'whoami': element.whoami
    }))
    .forEach(element => {
      if (element.channel) {
        const theChannel = element.channel
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
    });

  comunicator
    .filter(element => element.type === 'message-arrived' &&
      element.what &&
      element.what.type === 'join-channel')
    .map(element => ({
      'channel': element.what.channel,
      'whoami': element.whoami
    }))
    .forEach(element => {
      if (element.channel) {
        const theChannel = element.channel
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
    });

  comunicator
    .filter(element => element.type === 'message-arrived' &&
      element.what &&
      element.what.type === 'leave-channel')
    .forEach(element => {
      const theChannel = signalerState.getChannelInState(element.what.channel)
        , theChannelKeys = Object.keys(theChannel)
        , theChannelKeysLength = theChannelKeys.length;

      for (let theChannelKeysIndex = 0; theChannelKeysIndex < theChannelKeysLength; theChannelKeysIndex += 1) {
        const aChannelUser = theChannelKeys[theChannelKeysIndex];

        if (theChannel[aChannelUser] &&
          theChannel[aChannelUser].user === element.whoami) {

          delete theChannel[aChannelUser];
        }
      }
    });

  comunicator
    .filter(element => element.type === 'user-leave')
    .forEach(element => {

      console.info(element, signalerState);//TODO: fix this!
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

  /*comunicator
    .filter(element => element.type === 'message-arrived' &&
      element.what &&
      element.what.type === 'approve')
    .forEach(element => {
      const theChannel = signalerState.channels[element.channel];

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
    });

  comunicator
    .filter(element => element.type === 'message-arrived' &&
      element.what &&
      element.what.type === 'un-approve')
    .forEach(element => {
      const theChannel = signalerState.channels[element.channel];

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
    });*/
};

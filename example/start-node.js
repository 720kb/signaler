/*global __dirname,require,console*/
(function withModule() {
  'use strict';

  const salt = 'kjwf788fu38l102ijllwefliuh98hegfj98usjsjsnwe%&kjnwef$kjwnflllyyyuii'
    , jwt = require('jsonwebtoken')
    , Hapi = require('hapi')
    , Inert = require('inert')
    , hapiComunicator = require('comunicator').hapiComunicator
    , Singaler = require('../dist/node')
    , server = new Hapi.Server()
    , path = require('path')
    , publicFolder = path.resolve(__dirname, '', 'www');

  server.connection({
    'host': '::',
    'port': 3000
  });

  server.connection({
    'host': '::',
    'port': 3001,
    'labels': [
      'comunicator'
    ]
  });

  server.register([
    Inert,
    {
      'register': hapiComunicator,
      'options': {
        'connectionName': 'comunicator',
        'jwtSalt': salt
      }
    }], () => {
      const signaler = Singaler(server.comunicator);

      server.route({
        'method': 'GET',
        'path': '/token',
        'handler': (request, reply) => {

          const userID = parseInt(Math.random() * 100000000, 10)
            , token = jwt.sign({
              'user': userID
            }, salt);

          reply({
            token,
            userID
          });
        }
      });

      server.route({
        'method': 'GET',
        'path': '/{param*}',
        'handler': {
          'directory': {
            'path': publicFolder,
            'listing': false
          }
        }
      });

      server.start(() => {

        console.info(signaler);
        server.connections.forEach(element => {

          console.info(`Server running at: ${element.info.uri}`);
        });
      });
    });
}());

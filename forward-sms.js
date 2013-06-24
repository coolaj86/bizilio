(function () {
  "use strict";

  var config = require('./config').fooaccount
    , connect = require('connect')
    , Twilio = require('twilio')
    , twilio = new Twilio.RestClient(config.id, config.auth)
    , app = connect()
    , port = '8080'
    , server
    ;

  function sms(forwardTo, forwardFrom, body) {
    // Use this convenient shorthand to send an SMS:
    twilio.sendSms(
      { to: forwardTo
      , from: config.number
      , body: body += ' from: ' + forwardFrom
      }
    , function(error, message) {
        if (!error) {
          console.log('Success! The SID for this SMS message is:');
          console.log(message.sid);
   
          console.log('Message sent on:');
          console.log(message.dateCreated);
        }
        else {
          console.log('Oops! There was an error.');
        }
      }
    );
  }

  app.use(connect.json());
  app.use(connect.urlencoded());
  app.use(connect.bodyParser());
  app.use('/twilio/forwardsms', function (req, res, next) {
    if (!/^POST$/i.test(req.method)) {
      next();
    }
    res.setHeader('Content-Type', 'application/xml');
    res.end('<Response></Response>');
    sms(config.forwardTo, req.body.From, req.body.Body);
  });
  server = app.listen(port, function () {
    console.log('listening', server.address());
  });
}());

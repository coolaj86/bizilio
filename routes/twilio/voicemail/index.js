(function () {
  "use strict";

  var voicemail = module.exports
    , Twilio = require('twilio')
    , config
    , twilio
    , realsendemail
    ;

  function forwardVoicemailViaEmail(caller, mp3, body) {
    var subject
      , msg
      ;

    subject = "Voicemail from " + caller ;
    msg = ""
      + "\n" + caller + "\n\n"
      + mp3
      + "\n\n\n\n"
      + body
      ;

    realsendemail(config.forwardEmailTo, subject, msg);
  }

  function forwardVoicemailViaSms(caller, mp3) {
    // Use this convenient shorthand to send an SMS:
    twilio.sendSms(
      { to: config.forwardTo
      , from: config.number
              //             15 +   12   +  1  + 122 = 150
      , body: "Voicemail from " + caller + " " + mp3
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

  voicemail.init = function init(opts) {
    realsendemail = opts.mail;
    config = opts.config;
    twilio = new Twilio.RestClient(config.id, config.auth);
  };

  // Accept a voicemail and record the message
  voicemail.create = function (req, res) {
    var resp = new Twilio.TwimlResponse()
      ;

    //resp.play('http://chunkhost.coolaj86.com:8080/voicemail.wav');
    resp.play('/voicemail.wav');
    resp.record({ action: '/twilio/voicemail/forward', maxLength: 150 }); //, transcribe: true });

    // Actually respond
    res.setHeader('Content-Type', 'application/xml');
    res.write(resp.toString());
    res.end();
  };

  voicemail.forward = function (req, res, next) {
    if (!/^POST$/i.test(req.method)) {
      next();
    }

    // Both of these methods are simply best-effort (and no callback).
    // TODO Could store them in a database and retry or something, but keeping it simple for now
    // RecordingUrl: 'http://api.twilio.com/2010-04-01/Accounts/AC08e198a865cfa0bada6c2b7d5b41b02a/Recordings/REbd0c0c8a0c552687959102baac212933'
    forwardVoicemailViaSms(req.body.Caller, req.body.RecordingUrl);
    forwardVoicemailViaEmail(req.body.Caller, req.body.RecordingUrl, req.body);
  };
}());

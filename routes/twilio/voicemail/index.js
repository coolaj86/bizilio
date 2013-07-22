(function () {
  "use strict";

  var voicemail = module.exports
    , Twilio = require('twilio')
    , config
    , twilio
    , realsendemail
    ;

  function forwardVoicemailViaEmail(caller, mp3, text, body) {
    var subject
      , msg
      ;

    subject = "Voicemail from " + caller ;
    msg = ""
      + "\n" + caller + "\n\n"
      + mp3 + "\n\n"
      + (text ? (text + "\n\n") : '')
      + "\n\n\n\n"
      + body
      ;

    realsendemail(config.forwardEmailTo, subject, msg);
  }

  function forwardVoicemailViaSms(caller, mp3, text) {
    var obj
      ;

    obj = {
      to: config.forwardTo
    , from: config.number
            //             15 +   12   +  1  + 122 = 150
    , body: "Voicemail from " + caller + " " + mp3 + (text ? (" " + text) : "")
    };

    twilio.sendSms(
      obj
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
    resp.record({
      action: '/twilio/voicemail/forward?wait=true'
    , transcribeCallback: '/twilio/voicemail/forward'
    , maxLength: 150
    , transcribe: true
      // TODO remove beep from my recording
    , playBeep: false
      // end recording if the person doesn't speak within 5 seconds
    , timeout: 5
    , method: 'POST'
    });

    // Actually respond
    res.setHeader('Content-Type', 'application/xml');
    res.write(resp.toString());
    res.end();
  };

  voicemail.forward = function (req, res) {
    var resp = new Twilio.TwimlResponse()
      ;

    // Both of these methods are simply best-effort (and no callback).
    // TODO Could store them in a database and retry or something, but keeping it simple for now
    // RecordingUrl: 'http://api.twilio.com/2010-04-01/Accounts/AC08e198a865cfa0bada6c2b7d5b41b02a/Recordings/REbd0c0c8a0c552687959102baac212933'

    // Don't do anything until the transcription is complete
    if (req.query.wait) { 
      res.setHeader('Content-Type', 'application/xml');
      res.write(resp.toString());
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'application/xml');
    res.write(resp.toString());
    res.end();

    // Recording + Transcript
    forwardVoicemailViaSms(
      req.body.Caller
    , req.body.RecordingUrl
    , req.body.TranscriptionText
    );
    forwardVoicemailViaEmail(
      req.body.Caller
    , req.body.RecordingUrl
    , req.body.TranscriptionText
    , JSON.stringify(req.body, null, '  ')
    );
  };
}());

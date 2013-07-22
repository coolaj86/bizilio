(function () {
  "use strict";

  var  sms = module.exports
    , config
    , Twilio = require('twilio')
    , twilio
    , mpms = {}
    , realsendemail
    ;

  function forwardSmsViaEmail(texter, sms, raw) {
    var subject
      , msg
      ;

    subject = "SMS from " + texter ;
    msg = ""
      + "\n" + texter + "\n\n"
      + sms
      + "\n\n\n\n"
      + raw
      ;

    realsendemail(config.forwardEmailTo, subject, msg);
  }

  function forwardSmsViaSms(texter, sms) {
    // Use this convenient shorthand to send an SMS:
    twilio.sendSms(
      { to: config.forwardTo
      , from: config.number
        // put the number first in case the message gets truncated
      , body: 'From: ' + texter + " " + sms
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

  sms.init = function init(opts) {
    realsendemail = opts.mail;
    config = opts.config;
    twilio = new Twilio.RestClient(config.id, config.auth);
  };
  sms.forward = function (req, res, next) {
    if (!/^POST$/i.test(req.method)) {
      next();
    }

    res.setHeader('Content-Type', 'application/xml');

    // TODO say this is an automated system and prompt for a time to call
    res.end('<Response></Response>');

    // Forward via SMS immediately
    console.log('SMS Body\n', req.body);
    forwardSmsViaSms(req.body.From, req.body.Body);

    // Forward via e-mail once all parts come in
    function send() {
      forwardSmsViaEmail(from, msg, req.body);
      delete mpms[from];
    }

    // test case
    // /\((\d+)\/(\d+)\)/.exec("(2/5)and then we'll be able to live in peace.")
    var parts = /\((\d+)\/(\d+)\)/.exec(req.body.Body)
      , x
      , total
      , from = req.body.From
      , msg = req.body.Body
      , mpm // multi-part sms
      ;

    // Sometimes a message comes in many parts
    // if this message looks like it has many parts,
    // then wait to send it
    if (parts) {
      console.log('multipart sms');
      mpm = mpms[from] = mpms[from] || { parts: [] };
      x = parts[1];
      total = parts[2];

      // clear the timeout, if any
      clearTimeout(mpm._timeout);

      // sometimes the messages come out-of-order
      // putting the messages in order causes the length to be incorrect
      // realLength is the cure
      mpm.parts.realLength = mpm.parts.realLength || 0;
      mpm.parts[x] = msg;
      mpm.parts.realLength += 1;

      // join all the parts together in case this is the last message
      msg = mpm.parts.join('\n\n');

      // sometimes message 1 and 3 come, but 2 gets lost in the ether
      // (at least that's been my experience with google voice)
      // this timeout sends the partial message parts
      if (mpm.parts.realLength !== total) {
        mpm._timeout = setTimeout(send, 30 * 1000);
        return;
      }
    }

    send();
  };
}());

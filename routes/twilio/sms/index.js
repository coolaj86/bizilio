(function () {
  "use strict";

  var  sms = module.exports
    , config
    , Twilio = require('twilio')
    , twilio
    , mpms = {}
    , realsendemail
    , forEachAsync = require('forEachAsync')
    , splitOnWordBoundary = require('./utils').splitOnWordBoundary
    , maxMsgSize = 160 - "(xx/yy)".length
    , maxMsgWait = 10 * 1000
    ;

  // Carriers will chunk out SMS from the phone,
  // but when sending it manually, we must chunk it out ourselves
  function forwardSmsViaSms(caller, _text) {
    var obj
        //  23 =      9      +   12   +  2
      , prefix = "Msg from " + caller + ": "
      , text = (_text ? (" " + _text) : "")
      , body = (prefix + text)
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
      , bodies = []
      ;

    function sendSms(obj, next) {
      twilio.sendSms(
        obj
      , function(error, message) {
          if (!error) {
            console.log('Success! The SID for this SMS message is:');
            console.log(message.sid);
     
            console.log('Message sent on:');
            console.log(message.dateCreated);
            next();
          }
          else {
            console.log('Oops! There was an error.');
            console.error(error);
          }
        }
      );
    }

    bodies = splitOnWordBoundary(body, maxMsgSize);

    forEachAsync(bodies, function (next, body, i) {
      obj = {
        to: config.forwardTo
      , from: config.number
      , body: "(" + (i + 1) + "/" + bodies.length + ")" + body
      };
      sendSms(obj, next);
    });
  }

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

    // Forward via e-mail once all parts come in
    function send() {
      forwardSmsViaSms(from, msg);
      forwardSmsViaEmail(from, msg, JSON.stringify(req.body, null, '  '));
      delete mpms[from];
    }

    // test case
    // /^\((\d+)\/(\d+)\)/.exec("(2/5)and then we'll be able to live in peace.")
    // /^\((\d+)\/(\d+)\)/.exec("40% (2/5) and then we'll be able to live in peace.")
    var mpm // multi-part sms
      , x
      , total
      , from = req.body.From
      , msg = req.body.Body
      , parts = /^\((\d+)\/(\d+)\)/.exec(msg)
      ;

    // Sometimes a message comes in many parts
    // if this message looks like it has many parts,
    // then wait to send it
    if (parts) {
      mpm = mpms[from] = mpms[from] || { parts: [] };
      x = parseInt(parts[1], 10);
      total = parseInt(parts[2], 10);

      // clear the timeout, if any
      clearTimeout(mpm._timeout);

      // sometimes the messages come out-of-order
      // putting the messages in order causes the length to be incorrect
      // realLength is the cure
      mpm.parts.realLength = mpm.parts.realLength || 0;
      mpm.parts[x] = msg.split('').splice(parts[0].length).join('');
      mpm.parts.realLength += 1;

      // join all the parts together in case this is the last message
      msg = mpm.parts.join('\n');

      // sometimes message 1 and 3 come, but 2 gets lost in the ether
      // (at least that's been my experience with google voice)
      // this timeout sends the partial message parts
      if (mpm.parts.realLength !== total) {
        mpm._timeout = setTimeout(send, maxMsgWait);
        return;
      }
    }

    send();
  };
}());

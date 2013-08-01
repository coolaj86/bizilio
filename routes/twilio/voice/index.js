(function () {
  "use strict";

  // Send a text message right away with the number
  
  var voice = module.exports
    , config
    , twilio
    , realsendemail
    , api
    , privMount
    ;

  function forwardRecordedCallViaEmail(caller, mp3, body) {
    var subject
      , msg
      ;

    subject = "Recorded Call with " + caller ;
    msg = ""
      + "\n" + caller + "\n\n"
      + mp3
      + "\n\n\n\n"
      + body
      ;

    realsendemail(config.forwardEmailTo, subject, msg);
  }

  /*
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
  */

  voice.init = function (opts) {
    privMount = opts.mount;
    api = opts.api;
    realsendemail = opts.mail;
    config = opts.config;
    twilio = opts.client;
  };

  /*
   * PUBLIC API - SHOULD REQUIRE AUTHENTICATION
   *
   * WARNING these resources should require authorization
   */

  // POST /twilio/voice/dialout
  // First use case: the rep is the initiator and caller
  // Second use case: the customer is the initiator, but requesting a call from a rep
  voice.dialout = function (req, res) {
    console.log('dialout (call rep, then call customer)');
    var caller = config.forwardTo // the rep will call the customer // req.body.caller
      , callee = req.body.callee
      , search = '?callee=' + encodeURIComponent(callee)
      ;

    //host = req.headers.host;
    twilio.calls.post(
      { to: caller
      , from: config.number
      // this is already recorded on the outbound side
      //, record: true
      , url: 'http://' + config.host + privMount + '/voice/screen' + search
      }
    , function (err, result) {
        // TODO link call ids and respond back to the browser when the rep has answered or has declined
        console.log('dialout', result.status, result.message, result.code);
        res.send({ "success": true });
      }
    );
  };


  /*
   * PRIVATE API - these resources talk to Twilio
   */
  voice.connectrep = function createCallRepTwiMl(req, res) {
    console.log('call is not complete');
    // Tell the Rep to press any key to accept
    // 7200 == 2 hours
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      ;
      
    response = ""
      + '<Response>'
      + '<Dial timeLimit="7200" callerId="' + config.number
        + '" record="true" action="' + privMount + '/voice?tried=true">'
      + '<Number url="' + privMount + '/voice/screen">'
      + config.forwardTo
      + '</Number>'
      + '</Dial>'
      + '</Response>'
      ;

    console.log('DEBUG response:', response);

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  voice.voicemail = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      ;

    console.log('redirect to voicemail');
    // redirect to voicemail
    response += ""
      + "<Response>"
      + '<Redirect method="POST">' + "/twilio/voicemail" + "</Redirect>"
      + "</Response>"
      ;

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  // POST ' + privMount + '/voice?tried=true
  // ?caller=somenumber
  voice.create = function (req, res) {
    if (req.query.tried && 'completed' !== req.body.DialCallStatus) {
      voice.voicemail(req, res);
    } else if (!req.body || 'completed' !== req.body.DialCallStatus) {
      voice.connectrep(req, res);
    } else {
      voice.recordings(req, res);
      return;
    }
  };

  voice.recordings = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , caller
      ;


    console.log('completed');
    // Send recorded conversanion
    caller = req.query.customerNumber || req.body.Caller;
    forwardRecordedCallViaEmail(caller, req.body.RecordingUrl, JSON.stringify(req.body, null, '  '));
    response += ""
      + '<Response><Hangup/></Response>'
      ;

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  /*
  // From Customer to Rep
  voice.dialin = function (req, res) {
    // first send email/text to rep, then call
    // IfMachine hangup
    console.log('dialin (calls the customer first and then the rep)');
  };
  */

  voice.miss = function (req, res) {
    // for dialout, this doesn't need to do anything
    // send email to rep
    // send text to customer
    res.send('<Response></Response>');
    //redirect = '<Redirect>' + privMount + '/voice/missed?customerNumber=' + req.query.callee + '</Redirect>';
  };

  // POST /twilio/voice/screen
  // Ensure that this is a person and not voicemail
  // https://www.twilio.com/docs/howto/callscreening
  voice.screen = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , callback = req.query.callback
      , search = ''
      , redirect = ''
      ;

    if (callback) {
      callback = '<Redirect method="POST">' + callback + '</Redirect>';
    }

    // This block is to handle the Dialin vs Dialout issue
    // If the customer is dialing in from web click-to-call it means that they get called first
    // If the customer uses a dialout click-to-call, the rep gets called first
    //
    // TODO req.body includes Called / To and Caller / From,
    // CallSid, and Direction (inbound/outbound)
    // With a little bit of session logic on CallSid
    // we could reasonably cut back on the query parameter passing
    if (req.query.callee) {
      search = '?callee=' + encodeURIComponent(req.query.callee);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>' + privMount + '/voice/miss?customerNumber=' + req.query.callee + '</Redirect>';
      }
    } else if (req.query.caller) {
      search = '?caller=' + encodeURIComponent(req.query.caller);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>' + privMount + '/voice/miss?customerNumber=' + req.query.caller + '</Redirect>';
      }
    }

    // Tell the Rep to press any key to accept
    // The node api can't do this
    response += ""
      + '<Response><Gather action="' + privMount + '/voice/connect'
        + search + '" finishOnKey="any digit" numDigits="1">'
      + '<Say>Press any key to accept this call</Say>'
      + '</Gather>'
      // TODO instead of hanging up, redirect to voicemail?
      // otherwise it's left to the fallback url to pickup the voicemail
      //+ '<Hangup/>'
      + (callback || redirect || '')
      + '</Response>'
      ;

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  // POST ' + privMount + '/voice/connect
  voice.connect = function (req, res) {
    var response
      , dial = ''
      ;

    if (req.query.callee) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="' + privMount + '/voice?customerNumber=' + encodeURIComponent(req.query.callee)
        + '">'
        + req.query.callee + '</Dial>'
        ;
    } else if (req.query.caller) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="' + privMount + '/voice' // ?customerNumber=' req.body.Caller??
        + '">'
        + req.query.callee + '</Dial>'
        ;
    }
    // Tell the rep that they're being connected
    response = ""
      + '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<Response>'
      + '<Say>Connecting</Say>'
      + dial
      + '</Response>'
      ;

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };
}());

(function () {
  "use strict";

  // Send a text message right away with the number
  
  var voice = module.exports
    , config
    , Twilio = require('twilio')
    , twilio
    , realsendemail
    /*
    , nums = [
        "801-360-4427" // me
      //, "317-426-6525" // me
      , "435-890-9307" // sis
      //, "435-890-9305" // ma
      ]
    , forEachAsync = require('forEachAsync')
    */
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
    realsendemail = opts.mail;
    config = opts.config;
    twilio = new Twilio.RestClient(config.id, config.auth);
  };
  /*
  function makeCalls() {
    forEachAsync(nums, function (next, num, i) {
      var call
        ;

      call = {
        to: num
      , from: config.number
      };
      if (0 === i) {
        call.url = 'http://chunkhost.coolaj86.com:3000/conference.xml?host=true';
      } else {
        call.url = 'http://chunkhost.coolaj86.com:3000/conference.xml';
      }
      twilio.makeCall(call, function (err, resp) {
        if (err) {
          console.error(err);
        }
        console.log('added caller', num, Object.keys(resp));
        next();
      });
    }).then(function () {
      console.log('all callers dialed');
    });
  }
  */

  // POST /twilio/voice/conference
  // conference.xml
  voice.conference = function (req, res) {
    // POST
    var resp = ""
      ;

    // TODO gather a pin from host before calling other callers
    resp += "<Response>";
    if (/host=true/.test(req.url)) {
      resp += '  <Dial record="true" action="/twilio/voice/mailbox">\n';
    } else {
      resp += "  <Dial>\n";
    }
    resp += "    <Conference>AJtheDJconf</Conference>\n";
    resp += "  </Dial>\n";
    resp += "</Response>\n";
    res.setHeader('Content-Type', 'application/xml');
    res.write(resp);
    res.end();
  };


  function createCallRepTwiMl() {
    // Tell the Rep to press any key to accept
    // 7200 == 2 hours
    var response
      ;
      
    response = ""
      + '<Response>'
      + '<Dial timeLimit="7200" callerId="' + config.number + '" record="true" action="/twilio/voice?tried=true">'
      + '<Number url="/twilio/voice/screen">'
      + config.forwardTo
      + '</Number>'
      + '</Dial>'
      + '</Response>'
      ;

    console.log('DEBUG response:', response);

    return response;
  }

  // POST /twilio/voice?tried=true
  // ?caller=somenumber
  voice.create = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , caller
      ;

    if (req.query.tried && 'completed' !== req.body.DialCallStatus) {
      console.log('redirect to voicemail');
      // redirect to voicemail
      response += ""
        + "<Response>"
        + '<Redirect method="POST">' + "/twilio/voicemail" + "</Redirect>"
        + "</Response>"
        ;
    } else if (!req.body || 'completed' !== req.body.DialCallStatus) {
      console.log('call is not complete');
      response += createCallRepTwiMl();
    } else {
      console.log('completed');
      // Send recorded conversanion
      if (req.query) {
        caller = req.query.customerNumber || req.body.Caller;
      }
      forwardRecordedCallViaEmail(caller, req.body.RecordingUrl, JSON.stringify(req.body, null, '  '));
      response += ""
        + '<Response><Hangup/></Response>'
        ;
    }

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  // POST /twilio/voice/dialout
  // WARNING this resource should require authorization
  // First use case: the rep is the initiator and caller
  // Second use case: the customer is the initiator, but requesting a call from a rep
  voice.dialout = function (req, res) {
    console.log('dialout (call rep, then call customer)');
    var caller = config.forwardTo // the rep will call the customer // req.body.caller
      , callee = req.body.callee
      , twilio = new Twilio.RestClient(config.id, config.auth)
      , search = '?callee=' + encodeURIComponent(callee)
      ;

    //host = req.headers.host;
    twilio.calls.post(
      { to: caller
      , from: config.number
      // this is already recorded on the outbound side
      //, record: true
      , url: 'http://' + config.host + '/twilio/voice/screen' + search
      }
    , function (err, result) {
        // TODO link call ids and respond back to the browser when the rep has answered or has declined
        console.log('dialout', result.status, result.message, result.code);
        res.send({ "success": true });
      }
    );
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
    //redirect = '<Redirect>/twilio/voice/missed?customerNumber=' + req.query.callee + '</Redirect>';
  };

  // POST /twilio/voice/screen
  // Ensure that this is a person and not voicemail
  // https://www.twilio.com/docs/howto/callscreening
  voice.screen = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , search = ''
      , redirect = ''
      ;

    // TODO when is the customerNumber req.body.Caller?
    // and aren't both included anyway?
    // probably just needs something more like customer=caller
    if (req.query.callee) {
      search = '?callee=' + encodeURIComponent(req.query.callee);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>/twilio/voice/miss?customerNumber=' + req.query.callee + '</Redirect>';
      }
    } else if (req.query.caller) {
      search = '?caller=' + encodeURIComponent(req.query.caller);
      if ('customer' === req.query.initiator) {
        redirect = '<Redirect>/twilio/voice/miss?customerNumber=' + req.query.caller + '</Redirect>';
      }
    }

    // Tell the Rep to press any key to accept
    // The node api can't do this
    response += ""
      + '<Response><Gather action="/twilio/voice/connect' + search + '" finishOnKey="any digit" numDigits="1">'
      + '<Say>Press any key to accept this call</Say>'
      + '</Gather>'
      // TODO instead of hanging up, redirect to voicemail?
      // otherwise it's left to the fallback url to pickup the voicemail
      + '<Hangup/>'
      + '</Response>'
      ;

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };

  // POST /twilio/voice/connect
  voice.connect = function (req, res) {
    var response
      , dial = ''
      ;

    if (req.query.callee) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="/twilio/voice?customerNumber=' + encodeURIComponent(req.query.callee)
        + '">'
        + req.query.callee + '</Dial>'
        ;
    } else if (req.query.caller) {
      dial = '<Dial record="true" callerId="' + config.number + '"'
        + ' action="/twilio/voice' // ?customerNumber=' req.body.Caller??
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

  // POST /twilio/voice
  voice.blah = function (req, res) {
    var resp = new Twilio.TwimlResponse()
      , response
      ;

    //+ '<Response><Dial><Number sendDigits="1001">' // extension
    //+ '<Response><Dial record="true" callerId="+1' + config.number.replace(/-/, '') + '"><Number>'
    resp.dial(config.forwardTo, { timeout: 90, callerId: config.number, record: true });
    response = '<xml version="1.0" encoding="UTF-8"?>\n'
      //+ '<Response><Dial><Number>'
      + '<Response><Dial action="/twilio/voice/screen"><Number>'
      + config.forwardTo
      + '</Number></Dial></Response>'
      ;

    console.log(response);
    // RecordingUrl: 'http://api.twilio.com/2010-04-01/Accounts/AC08e198a865cfa0bada6c2b7d5b41b02a/Recordings/REbd0c0c8a0c552687959102baac212933'
    response = resp.toString();

    res.setHeader('Content-Type', 'application/xml');
    res.write(response);
    res.end();
  };
}());

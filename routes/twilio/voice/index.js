(function () {
  "use strict";

  // Send a text message right away with the number
  
  var voice = module.exports
    , config
    , Twilio = require('twilio')
    , twilio
    , realsendemail
    , host = 'chunkhost.coolaj86.com:3000'
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


  // POST /twilio/voice?tried=true
  voice.create = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
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
      // Tell the Rep to press any key to accept
      // 7200 == 2 hours
      response += ""
        + '<Response>'
        + '<Dial timeLimit="7200" callerId="' + config.number + '" record="true" action="/twilio/voice?tried=true">'
        + '<Number url="/twilio/voice/screen">'
        + config.forwardTo
        + '</Number>'
        + '</Dial>'
        + '</Response>'
        ;
      console.log('DEBUG response:', response);
    } else {
      console.log('completed');
      // Send recorded conversanion
      forwardRecordedCallViaEmail(req.body.Caller, req.body.RecordingUrl, JSON.stringify(req.body, null, '  '));
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
  voice.dialout = function (req, res) {
    console.log('dialout');
    var caller = req.body.caller
      , callee = req.body.callee
      , twilio = new Twilio.RestClient(config.id, config.auth)
      ;

    // host = req.headers['host']
    twilio.calls.post(
      { to: caller
      , from: config.number
      // this is already recorded on the outbound side
      //, record: true
      , url: 'http://' + host + '/twilio/voice/screen?dial=' + encodeURIComponent(callee)
      }
    , function (err, result) {
        // Something fishy about this result...
        // methinks it's not a plain js obj,
        // but a mutant that doesn't .toJSON() easily
        console.log('dialout', result);
        res.send({ "success": true });
      }
    );
  };

  // POST /twilio/voice/screen
  // Ensure that this is a person and not voicemail
  // https://www.twilio.com/docs/howto/callscreening
  voice.screen = function (req, res) {
    var response = '<?xml version="1.0" encoding="UTF-8"?>\n'
      , search = ''
      ;

    if (req.query.dial) {
      search = '?dial=' + encodeURIComponent(req.params.dial);
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

    if (req.params.dial) {
      dial = '<Dial record="true" callerId="' + config.number + '" action="/twilio/voice">' + req.params.dial + '</Dial>';
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

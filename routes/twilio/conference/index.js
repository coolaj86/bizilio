(function () {
  "use strict";

  // How to mute or kick someone out: http://www.twilio.com/docs/api/rest/participant
  // How to view conference http://www.twilio.com/docs/api/rest/conference#list

  var conference = module.exports
    , config
    , Twilio = require('twilio')
    , twilio
    , realsendemail
    , host = 'chunkhost.coolaj86.com:3000'
    , db = {}
    , api
    , privMount
    ;

  function forwardRecordedConferenceViaEmail(caller, mp3, body) {
    var subject
      , msg
      ;

    // TODO get list of callers
    subject = "Recorded Conference on " + (new Date().toLocaleString()) ;
    msg = ""
      + "\n" + caller + "\n\n"
      + mp3
      + "\n\n\n\n"
      + body
      ;

    realsendemail(config.forwardEmailTo, subject, msg);
  }

  conference.init = function (opts) {
    privMount = opts.mount;
    api = opts.api;
    realsendemail = opts.mail;
    config = opts.config;
    twilio = new Twilio.RestClient(config.id, config.auth);
  };

  /*
   * PUBLIC API - SHOULD REQUIRE AUTHENTICATION
   *
   * WARNING these resources should require authorization
   */
  conference.create = function (req, res) {
    var call
      , num = req.body.callee
      ;

    if (0 === Object.keys(db).length) {
      num = config.forwardTo; // the rep
    }

    call = {
      to: num
    , from: config.number
      // ifMachine may increase latency and isn't guaranteed to work
    , ifMachine: 'Hangup'
    };

    call.url = 'http://' + host + privMount + '/conference/join';
    twilio.makeCall(call, function (err, resp) {
      if (err) {
        console.error(err);
        res.send({ success: false, error: err.toString() });
        return;
      }

      console.log('added caller', num, Object.keys(resp));
      res.send({ success: true });
    });
  };

  /*
   * PRIVATE API - these resources talk to Twilio
   */
  // These can be stateful rather than restful because we're not showing
  // a resource, we're interacting with events / functions / RPC
  // POST /conference/join
  conference.join = function (req, res) {
    // POST
    var resp = ""
        // TODO, if it's the first person to join
      , record = ''
      ;

    if (0 === Object.keys(db).length) {
      // participant info can also be gathered via api call
      req.call.conf = db;
      req.call.conf.name = req.body.name || 'AJtheDJconf';
      record = 'record="true" action="' + privMount + '/conference/end" endConferenceOnExit="true"';
      db.host = req.call;
    } else {
      db[req.call.sid] = req.call;
    }

    // TODO screen hoster
    resp += "<Response>";
    resp += '  <Dial ' + record + ' >\n';
    resp += '    <Conference>' + db.name + '</Conference>\n';
    resp += "  </Dial>\n";
    resp += "</Response>\n";
    res.setHeader('Content-Type', 'application/xml');
    res.write(resp);
    res.end();
  };

  // someone hung up
  conference.leave = function (req, res) {
    var resp = new Twilio.TwimlResponse()
      ;

    // TODO conference roulette - everytime some leaves, dial someone else at random
    res.setHeader('Content-Type', 'application/xml');
    res.end(resp.toString());
  };

  conference.end = function (req, res) {
    var resp = new Twilio.TwimlResponse()
      ;

    // TODO manual 'endOnConferenceExit' for kicks
    /*
    api.conferences.list({ friendlyName: req.call.conf.name }).participants(function (error, data) {
      api.conferences('someSid').participants('someSid').delete(function () {})
      console.log(data);
    });
    */
    forwardRecordedConferenceViaEmail(req.call.conf.name, req.body.RecordingUrl, JSON.stringify(req.body, null, '  '));
    res.setHeader('Content-Type', 'application/xml');
    res.end(resp.toString());
  };
}());

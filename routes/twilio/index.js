(function () {
  "use strict";

  var twilio = module.exports
    , db = {}
    , MAX_CALL_TIME = 3 * 60 * 60 * 1000
    , SESSION_CLEANUP_INTERVAL = 1 * 60 * 60 * 1000
    , Twilio = require('twilio')
    ;

  // clear stale sessions from memory
  function cleanSessions() {
    var now = Date.now
      ;

    Object.keys(db).forEach(function (key) {
      db[key] = db[key] || { touchedAt: 0 };

      if (db[key].completed) {
        delete db[key];
      } else if ((now - db[key].touchedAt) > MAX_CALL_TIME) {
        delete db[key];
      }
    });
  }
  setInterval(cleanSessions, SESSION_CLEANUP_INTERVAL);

  function getSession(req, res, next) {
    var callSid
      , smsSid
      ;

    if (!req.body) {
      console.log('[EMPTY] no body');
      return next;
    }

    callSid = req.body.CallSid;
    if (req.body.CallSid) {
      db[callSid] = db[callSid] || { sid: callSid, ops: [] };
      req.call = db[callSid];
      req.call.touchedAt = Date.now();
    }

    smsSid = req.body.smsSid;
    if (req.body.SmsSid) {
      db[smsSid] = db[smsSid] || { sid: smsSid, ops: [] };
      req.sms = db[smsSid];
      req.sms.touchedAt = Date.now();
    }
    
    next();
  }

  twilio.session = function () {
    return getSession;
  };
  twilio.sms = require('./sms');
  twilio.voice = require('./voice');
  twilio.voicemail = require('./voicemail');
  twilio.conference = require('./conference');

  twilio.init = function (_opts) {
    var opts = {}
      ;

    // prevent the parent from getting stuff that maybe it shouldn't
    Object.keys(_opts).forEach(function (key) {
      opts[key] = _opts[key];
    });
    opts.client = new Twilio.RestClient(opts.config.id, opts.config.auth);
    opts.api = twilio;
    opts.mount = opts.mount || '/twilio';
    twilio.sms.init(opts);
    twilio.voice.init(opts);
    twilio.voicemail.init(opts);
    twilio.conference.init(opts);
  };
}());

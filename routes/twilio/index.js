(function () {
  "use strict";

  var twilio = module.exports
    , config = require('./config.twilio.json')
    ;

  twilio.sms = require('./sms');
  twilio.voice = require('./voice');
  twilio.voicemail = require('./voicemail');

  twilio.init = function (opts) {
    opts.config = config;
    twilio.sms.init(opts);
    twilio.voice.init(opts);
    twilio.voicemail.init(opts);
  };
}());

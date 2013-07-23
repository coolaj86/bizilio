(function () {
  "use strict";

  var twilio = module.exports
    ;

  twilio.sms = require('./sms');
  twilio.voice = require('./voice');
  twilio.voicemail = require('./voicemail');

  twilio.init = function (opts) {
    twilio.sms.init(opts);
    twilio.voice.init(opts);
    twilio.voicemail.init(opts);
  };
}());

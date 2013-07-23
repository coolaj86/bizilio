(function () {
  "use strict";

  var email = module.exports
    , config
    , realsendemail
    ;

  function sendEmail(opts, cb) {
    realsendemail(
      config.forwardTo  // to
    , opts.replyTo      // replyTo
    , opts.subject      // subject
    , opts.text         // text
    , cb
    );
  }

  email.init = function (opts) {
    config = opts.config;
    realsendemail = opts.inquire;
  };

  // TODO add verimail
  email.create = function (req, res) {
    console.log('content-type', req.headers['content-type']);
    if (/urlencoded/.test(req.headers['content-type'])) {
      //next();
      res.end('the s is for sucks');
    }

    var obj = {}
      , name = (req.body.name || '').replace(/\s+/g, ' ')
      , addr = (req.body.email || '').replace(/\s+/g, ' ')
      , phone = (req.body.phone || '').replace(/\s+/g, ' ')
      , subject = "Web msg from " + (addr || phone)
      , text = (req.body.msg || '') + '\n' + name + '\n' + addr + "\n" + phone
      ;

    if (/^\S+@\S+\.\S+/.test(addr)) {
      obj.replyTo = addr;
    }

    obj.subject = subject;
    obj.text = text;
    sendEmail(obj, function (err, resp) {
      res.send({
        "success": !err
      , "errors": err && [err.toString()] || []
      , "result": resp
      });
    });
  };
}());

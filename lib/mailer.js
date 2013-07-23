(function () {
  "use strict";

  // Test with a gmail account first
  // https://github.com/coolaj86/node-examples-js/tree/master/standalone-mailer
  // https://github.com/coolaj86/node-examples-js/blob/master/standalone-mailer/mailed.js
  // npm install -g mailed

  var nodemailer = require('nodemailer')
    , config
    , smtp
    ;

  function defaultCb(err, resp) {
    console.error(err);
    console.log(resp);
  }

  function init(opts) {
    config = opts.config;
    smtp = nodemailer.createTransport('SMTP', {
      host: config.host // required
    , port: config.port // optional, defaults to 25 or 465
    , ssl: config.ssl
    , user: config.user
    , pass: config.pass
    });
  }

  function inquire(to, from, subject, text, cb) {
    // TODO
    cb = cb || defaultCb;
    //console.log("AJ didn't check in. Sending alert!");
    var headers
      ;

    headers = {
    // Note that in the real world the e-mail strings must be sanatized of chars such as '\n' and ','.
      "to": to // emails.join(',')
    , "replyTo": from
    , "sender": config.sender // add this to your e-mail aliases
    , "subject": subject
    , "text": text
  //, "html": unused
  //, "attachments": attachments
    };

    // Know that nodemailer keeps the connection open by default,
    // hence the eventloop will be waiting and the program will not exit
    smtp.sendMail(headers, function (err, resp) {
      if (err) {
        cb(err, resp);
        //console.error(err.message || 'Didn\'t work');
        return;
      }
      if (resp) {
        //console.log('Sent mail. <(^_^<) W00T!');
        cb(null, resp);
      }

      // if you don't want to use this transport object anymore, uncomment following line
      //smtpTransport.close(); // shut down the connection pool, no more messages
    });
  }

  function mail(to, subject, text, cb) {
    // TODO
    cb = cb || defaultCb;
    //console.log("AJ didn't check in. Sending alert!");
    var headers
      ;

    headers = {
    // Note that in the real world the e-mail strings must be sanatized of chars such as '\n' and ','.
      "to": to // emails.join(',')
    , "replyTo": config.replyTo
    , "sender": config.sender // add this to your e-mail aliases
    , "subject": subject
    , "text": text
  //, "html": unused
  //, "attachments": attachments
    };

    // Know that nodemailer keeps the connection open by default,
    // hence the eventloop will be waiting and the program will not exit
    smtp.sendMail(headers, function (err, resp) {
      if (err) {
        cb(err, resp);
        //console.error(err.message || 'Didn\'t work');
        return;
      }
      if (resp) {
        //console.log('Sent mail. <(^_^<) W00T!');
        cb(null, resp);
      }

      // if you don't want to use this transport object anymore, uncomment following line
      //smtpTransport.close(); // shut down the connection pool, no more messages
    });
  }

  module.exports.init = init;
  module.exports.mail = mail;
  module.exports.inquire = inquire;
}());

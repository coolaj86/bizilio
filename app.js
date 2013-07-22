"use strict";

/**
 * Module dependencies.
 */

var express = require('express')
  , twilio = require('./routes/twilio')
  , http = require('http')
  , path = require('path')
  , app = express()
  , port = process.env.PORT || 3000
  , mailer = require('./lib/mailer')
  ;

// all environments
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
// only urlencoded forms need csrf, I think
// ditch bodyParser in favor of json only parser
//app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

//mailer.init();
twilio.init({ mail: mailer.mail });

// Incoming SMS
app.post('/twilio/sms/forward', twilio.sms.forward);

// Incoming Call
app.post('/twilio/voice', twilio.voice.create);
app.post('/twilio/voice/screen', twilio.voice.screen);
app.post('/twilio/voice/connect', twilio.voice.connect);

// Voicemail
app.post('/twilio/voicemail', twilio.voicemail.create);
app.post('/twilio/voicemail/forward', twilio.voicemail.forward);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

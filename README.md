Daplie is Taking Back the Internet!
--------------

[![](https://daplie.github.com/igg/images/ad-developer-rpi-white-890x275.jpg?v2)](https://daplie.com/preorder/)

Stop serving the empire and join the rebel alliance!

* [Invest in Daplie on Wefunder](https://daplie.com/invest/)
* [Pre-order Cloud](https://daplie.com/preorder/), The World's First Home Server for Everyone

Bizilio
===

All the Twilio snippets you could ever want for a small business (well, getting there).

Note that there are still a few differences between the documentation and the implementation,
but they're coming together.

Benefits of Bizilio
===

See <https://github.com/coolaj86/bizilio>

Right now this is mostly just a call, voicemail, and text forwarding service.

* If you call the twilio number, it forwards to the primary rep via their cell
* The rep knows it's a business call because the number displayed will be the twilio number
* Screens reps to make ensure they intended to answer (no butt answers, no answering machine mishaps)
* All calls are recorded (because sometimes you leave something out of your notes)
* At the end of each call the phone number, recording, and data are sent to the rep
* Text messages are forwarded to the primary rep via e-mail and text
* Text messages are therefore searchable!!!
* Transcribes voicemail to email (along with recording)

Things have baked

* Allows reps to click-to-call customers
* Allows reps to joint-host a conference call

And things to come

* Forward from number on Google Adwords, Craigslist, KSL, to any **available** rep.
* Allows customers to click-to-call reps

Installation
===

```bash
# Clone
git clone https://github.com/coolaj86/bizilio
pushd bizilio

# Configure
rsync -a config.twilio.default.json config.twilio.json
vim config.twilio.json

# Start on port 8020
node app 8020

# Start as a system service
rsync -a bizilio.conf /etc/init/
sudo service bizilio start
```

Get your SID and TOKEN from <https://www.twilio.com/user/account>

config.twilio.json:
```javascript
{ "number": "(555) 222-9999"
, "id": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
, "auth": "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
, "forwardTo": "555-444-7777"
, "forwardEmailTo": "rep@example.com"
, "host": "example.com:3000"
, "restfulMount": "/twilio"
, "statefulMount": "/its-a-secret"
}
```

Twilio Web Hooks
===

Click on a number at <https://www.twilio.com/user/account/phone-numbers/incoming>

Or edit an app at <https://www.twilio.com/user/account/apps>

  * VOICE
    * Request: POST https://#{host}/twilio/voice
    * Fallback: POST https://#{host}/twilio/voicemail
    * Status: TODO
  
  * SMS
    * Request: POST https://#{host}/twilio/sms/forward
    * Fallback: TODO
    * Status: TODO

RESTful API
===

The RESTful API is mostly stuff that the web browser will interface with.

**WARNING:** most of the RESTful APIs should be protected (via authn / authz)

### Click-to-Call - outbound (screen rep, then call customer)

```bash
curl http://localhost:3000/twilio/voice/dialout \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "callee": "+15559994444" }'
```

Uses `config.json.forwardTo` as the rep.

The call will be dropped if the rep doesn't answer.

The call will be recorded (and emailed to rep) if the customer answers.

### Create conference

Create the conference and call the rep to join

`app.post('/twilio/conference', twilio.conference.create);`

```bash
curl http://#{host}/twilio/conference \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "name": "ConferenceThing" }'
```
### Add to the conference

Once the rep has joined, invite others

```bash
curl http://#{host}/twilio/conference \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{ "name": "ConferenceThing", "number": "555-444-2222" }'
```

The rep records the call, and the conference exits when the rep hangs up.

# STATEful API

A lot of the interaction that goes on between Twilio and the server is very stateful.

You really don't need to know about any of it to use bizilio,
but the resultant snippets are pretty useful.

A note about the `statefulMount`:
Since none of these resources are useful to the user's broswser and
will never be accessed that way,
and since they are all interconnected and aware of eachother,
it makes sense that they should have a secret route,
just so no one can try anything clever like POSTing messages that
look like valid TwilML, that might have disagreeable consequences.

Unrefined api:

```javascript
// Incoming Call
app.post('/twilio/voice', twilio.voice.create);
app.post('/twilio/voice/screen', twilio.voice.screen);
app.post('/twilio/voice/connect', twilio.voice.connect);
//app.post('/twilio/voice/forward', twilio.voice.forward);

// Voicemail
app.post('/twilio/voicemail', twilio.voicemail.create);
app.post('/twilio/voicemail/forward', twilio.voicemail.forward);

// Email
app.post('/email', email.create);
```

# TODO

Require HTTP Basic Auth <https://www.twilio.com/docs/security>

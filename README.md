Twillio Forward SMS
===

Twilio provides a TwiMLet to forward voice calls,
but it doesn't provide one for SMS.

Although it's not possible to directly forward SMS
(by displaying the number of the original sender
in the forwarded message),
it's certainly possible to append the number to the
forwarded message.

## Usage

copy `config.default.js` to `config.js`
and then set your twilio SMS receive callback to
`http://yourserver.com/twilio/forwardsms`

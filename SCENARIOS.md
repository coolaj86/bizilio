# Scenarios & Expectations

## Incoming Call

1. The customer calls the Twilio number seen on Google Adwords.
2. The rep's cell rings (with Twilio number showing)
3. If the rep doesn't answer in a timely fashion, the customer is redirected to voicemail
4. If the rep's phone is dead and goes straight to voicemail, the call screening fails (the any key is not pressed)
5. If the rep answers and presses the any key, the customer is connected
6. The voicemail + transcription OR customer number + recording url + call details are emailed to the rep

## Incoming Text (SMS)

1. The customer dials the number on Google Adwords
2. The rep is forwarded the message, with the number of the caller

## DialOut

Here's the definition of a DialOut:

  * The rep gets called first
  * The rep must answer by pressing a key
  * The customer gets dialed
  * hence we dial out from the business to the customer

This can go two ways:

  1. A rep wants to dial a customer
    * the screening isn't strictly necessary, but it's more reliable and has lower latency than `IfMachine`
  2. A customer hits click-to-call

What if...

  * The person doesn't answer (scenario 1)?
    * It should just go to the machine and let the rep leave a message, right?

  * The rep doesn't answer (scenario 2)?
    * should it dial the person to voicemail?
    * should it send an e-mail to the rep?

Conference
===

Two reps are going to be on a call together for training

1. Master Rep starts the conference (dials himself)
  * The conference ends with Master Rep leaves
  * The recording happens on the side of Master Rep
2. Master Rep dials his apprentice
3. Master Rep dials the customer

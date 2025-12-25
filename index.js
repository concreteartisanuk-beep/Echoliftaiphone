const express = require('express')
const VoiceResponse = require('twilio').twiml.VoiceResponse
const Anthropic = require('@anthropic-ai/sdk')

const app = express()
app.use(express.urlencoded({ extended: false }))

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const calls = new Map()

app.post('/voice/incoming', function(req, res) {
  calls.set(req.body.CallSid, [])
  const response = new VoiceResponse()
  const gather = response.gather({
    input: 'speech',
    action: '/voice/process',
    method: 'POST',
    language: 'en-GB'
  })
  gather.say({ voice: 'Polly.Amy' }, 'Hello thank you for calling EchoLift AI')
  res.type('text/xml').send(response.toString())
})

app.post('/voice/process', async function(req, res) {
  const speech = req.body.SpeechResult || 'hello'
  const callId = req.body.CallSid
  let history = calls.get(callId) || []
  history.push({ role: 'user', content: speech })
  
  let aiResponse = 'Visit echoliftai.co.uk'
  try {
    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'You are a receptionist for EchoLift AI. We help UK businesses with AI phone systems, social media management, and video marketing. Be helpful and brief.',
      messages: history
    })
    aiResponse = result.content[0].text
  } catch (error) {
    console.log('Error:', error)
  }
  
  history.push({ role: 'assistant', content: aiResponse })
  calls.set(callId, history)
  
  const response = new VoiceResponse()
  const gather = response.gather({
    input: 'speech',
    action: '/voice/process',
    method: 'POST',
    language: 'en-GB'
  })
  gather.say({ voice: 'Polly.Amy' }, aiResponse)
  res.type('text/xml').send(response.toString())
})

app.post('/voice/status', function(req, res) {
  res.sendStatus(200)
})

app.get('/', function(req, res) {
  res.send('EchoLift AI Phone System Active')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, function() {
  console.log('EchoLift AI ready on port ' + PORT)
})

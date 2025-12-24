const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const activeCalls = new Map();

const PROMPT = `You are the receptionist for EchoLift AI, a UK digital marketing agency.

We offer three main services:

1. AI Phone Systems - £199 to £599 per month
   Answer every call 24/7, book appointments, never miss a customer

2. Social Media Management - £299 to £999 per month
   Done-for-you content creation and posting across all platforms

3. Professional Videos - £299 per video
   Scroll-stopping promo videos for social media

When someone calls:
- Greet them warmly
- Ask how you can help
- Answer their questions about services and pricing
- If they want to book a consultation, collect their name, business name, phone number and email
- Be professional but friendly
- Keep responses under 30 seconds when spoken

Our website is echoliftai.co.uk`;

async function getAIResponse(conversationHistory) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      system: PROMPT,
      messages: conversationHistory
    });
    return response.content[0].text;
  } catch (error) {
    console.error('Anthropic API Error:', error);
    return "I apologize, I'm having technical difficulties. Please visit our website at echoliftai.co.uk or I can have someone call you back.";
  }
}

app.post('/voice/incoming', (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;
  
  console.log('📞 Incoming call from:', from);
  
  activeCalls.set(callSid, []);
  
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: 'speech',
    action: '/voice/process',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-GB'
  });
  
  gather.say({
    voice: 'Polly.Amy',
    language: 'en-GB'
  }, 'Hello, thank you for calling EchoLift AI. How can I help you today?');
  
  twiml.say('I did not catch that. How can I help you?');
  twiml.redirect('/voice/process');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/voice/process', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult;
  
  console.log('Caller said:', speechResult);
  
  const twiml = new VoiceResponse();
  
  if (!speechResult) {
    twiml.say('I did not hear anything. How can I help you?');
    twiml.redirect('/voice/incoming');
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }
  
  let history = activeCalls.get(callSid) || [];
  history.push({ role: 'user', content: speechResult });
  
  const aiResponse = await getAIResponse(history);
  
  history.push({ role: 'assistant', content: aiResponse });
  activeCalls.set(callSid, history);
  
  console.log('AI responded:', aiResponse);
  
  const gather = twiml.gather({
    input: 'speech',
    action: '/voice/process',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-GB'
  });
  
  gather.say({
    voice: 'Polly.Amy',
    language: 'en-GB'
  }, aiResponse);
  
  twiml.say('Thank you for calling EchoLift AI. Have a great day!');
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});

app.post('/voice/status', (req, res) => {
  const callSid = req.body.CallSid;
  const duration = req.body.CallDuration;
  
  console.log('Call ended. Duration:', duration, 'seconds');
  
  const history = activeCalls.get(callSid);
  if (history) {
    console.log('Conversation transcript:');
    history.forEach((msg) => {
      const speaker = msg.role === 'user' ? 'CALLER' : 'AI';
      console.log(speaker + ':', msg.content);
    });
    activeCalls.delete(callSid);
  }
  
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('<h1>EchoLift AI Phone System</h1><p>System is running!</p>');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'EchoLift AI Phone System',
    activeCalls: activeCalls.size
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('EchoLift AI Phone System running on port', PORT);
});

module.exports = app;
```

const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.urlencoded({ extended: false }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const activeCalls = new Map();

async function getAIResponse(history) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'You are a receptionist for EchoLift AI. We offer AI phone systems, social media management, and video marketing to UK businesses. Be friendly and helpful. Keep responses under 30 seconds.',
      messages: history
    });
    return response.content[0].text;
  } catch (error) {
    return "Sorry, technical issue. Please visit echoliftai.co.uk";
  }
}

app.post('/voice/incoming', (req, res) => {
  console.log('Call received');
  activeCalls.set(req.body.CallSid, []);
  const twiml = new VoiceResponse();
  const gather = twiml.gather({ input: 'speech', action: '/voice/process', method: 'POST', language: 'en-GB' });
  gather.say({ voice: 'Polly.Amy' }, 'Hello, thank you for calling EchoLift AI. How can I help you?');
  res.type('text/xml').send(twiml.toString());
});

app.post('/voice/process', async (req, res) => {
  const speech = req.body.SpeechResult;
  const callSid = req.body.CallSid;
  let history = activeCalls.get(callSid) || [];
  history.push({ role: 'user', content: speech || 'hello' });
  const aiResponse = await getAIResponse(history);
  history.push({ role: 'assistant', content: aiResponse });
  activeCalls.set(callSid, history);
  const twiml = new VoiceResponse();
  const gather = twiml.gather({ input: 'speech', action: '/voice/process', method: 'POST', language: 'en-GB' });
  gather.say({ voice: 'Polly.Amy' }, aiResponse);
  twiml.say('Thank you for calling!');
  res.type('text/xml').send(twiml.toString());
});

app.post('/voice/status', (req, res) => res.sendStatus(200));
app.get('/', (req, res) => res.send('EchoLift AI Phone System Running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
```

4. Scroll down and click **"Commit changes"**

---

## STEP 3: Check Render Deployment

1. Go to Render dashboard
2. Click your service
3. Wait 2-3 minutes for auto-deploy
4. Look for **"Deploy succeeded"** or **"Live"**

**You should see in logs:**
```
Server running on port 3000

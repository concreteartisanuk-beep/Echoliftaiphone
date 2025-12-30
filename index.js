const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.urlencoded({ extended: false }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store conversations in memory (use database in production)
const conversations = {};

// Initial call handler
app.post('/voice', (req, res) => {
  const response = new VoiceResponse();
  
  const gather = response.gather({
    input: 'speech',
    action: '/process-speech',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-GB'
  });
  
  gather.say({
    voice: 'Google.en-GB-Neural2-A'
  }, 'Hello! I\'m your AI assistant. How can I help you today?');
  
  // Fallback if no response
  response.say('I didn\'t hear anything. Goodbye!');
  
  res.type('text/xml');
  res.send(response.toString());
});

// Process speech and get AI response
app.post('/process-speech', async (req, res) => {
  const response = new VoiceResponse();
  
  const userSpeech = req.body.SpeechResult;
  const callSid = req.body.CallSid;
  
  console.log(`User said: ${userSpeech}`);
  
  if (!userSpeech || userSpeech.trim() === '') {
    response.say('I didn\'t catch that. Let me try again.');
    response.redirect('/voice');
    res.type('text/xml');
    res.send(response.toString());
    return;
  }
  
  // Initialize conversation history for this call
  if (!conversations[callSid]) {
    conversations[callSid] = [];
  }
  
  // Add user message to history
  conversations[callSid].push({
    role: 'user',
    content: userSpeech
  });
  
  try {
    // Get AI response from Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: conversations[callSid]
    });
    
    const aiResponse = message.content[0].text;
    console.log(`AI said: ${aiResponse}`);
    
    // Add AI response to history
    conversations[callSid].push({
      role: 'assistant',
      content: aiResponse
    });
    
    // Speak the AI response
    response.say({
      voice: 'Google.en-GB-Neural2-A'
    }, aiResponse);
    
    // Continue the conversation
    const gather = response.gather({
      input: 'speech',
      action: '/process-speech',
      method: 'POST',
      speechTimeout: 'auto',
      language: 'en-GB'
    });
    
    gather.say({
      voice: 'Google.en-GB-Neural2-A'
    }, 'Is there anything else I can help you with?');
    
    // Hangup option
    response.say('Thank you for calling. Goodbye!');
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    response.say('I\'m sorry, I\'m having technical difficulties. Please try again later.');
  }
  
  res.type('text/xml');
  res.send(response.toString());
});

// Health check
app.get('/', (req, res) => {
  res.send('AI Voice Agent is running!');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

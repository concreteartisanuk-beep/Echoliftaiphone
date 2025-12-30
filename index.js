const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.urlencoded({ extended: false }));

// DEBUGGING - Check if API key exists
console.log('=== ENVIRONMENT CHECK ===');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('ANTHROPIC_API_KEY value:', process.env.ANTHROPIC_API_KEY ? 
  process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 
  'UNDEFINED - NOT SET!');
console.log('========================');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store conversations in memory (use database in production)
const conversations = {};

// Initial call handler
app.post('/voice', (req, res) => {
  console.log('=== INCOMING CALL ===');
  console.log('Call from:', req.body.From);
  console.log('Call to:', req.body.To);
  console.log('===================');
  
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
  }, 'Hello! I\'m Nelly, your AI assistant from EchoLift. How can I help you today?');
  
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
      system: `You are Nelly, a friendly and professional AI assistant for EchoLift. EchoLift provides AI-powered services to help small businesses grow their online presence and handle customer communications.

ABOUT ECHOLIFT:
We specialize in three core services:
1. AI Voice Agents - Automated phone systems that answer calls 24/7
2. AI Promotional Videos - Professional marketing videos created quickly and affordably
3. Social Media Management - Complete social media presence with AI-powered content

OUR PRICING:

AI VOICE AGENT PACKAGES:
- Starter: £299/month - Up to 100 calls, basic FAQ responses, business hours only
- Professional: £599/month (Most Popular) - Up to 300 calls, 24/7 availability, appointment booking
- Enterprise: £1,199/month - Unlimited calls, multi-language, CRM integration

AI VIDEO PACKAGES:
- Social Starter: £149 per video (15-30 seconds)
- Business Bundle: £399 for 3 videos (30-60 seconds each)
- Monthly Content: £799/month for 8 videos
- Premium Production: £1,499 per video (60-120 seconds, cinematic quality)

SOCIAL MEDIA MANAGEMENT:
- Essentials: £499/month - 2 platforms, 12 posts monthly
- Growth: £899/month (Most Popular) - 3 platforms, 20 posts monthly, includes Reels
- Premium: £1,599/month - 4 platforms, daily posting, paid ad management

BUNDLE PACKAGES (Best Value):
- Small Business Complete: £1,299/month (Save £399) - Voice Agent Starter + 4 videos + Social Media Essentials
- Growth Accelerator: £2,199/month (Save £699) - Voice Agent Pro + 8 videos + Social Media Growth
- Enterprise Domination: £3,499/month (Save £1,098) - Everything unlimited with premium features

YOUR ROLE:
- Answer questions about our services clearly and concisely
- Recommend the right package based on the caller's needs
- For specific questions about implementation or custom needs, offer to have someone call them back
- Be warm, helpful, and professional
- Keep responses brief since this is a phone call (2-3 sentences maximum)
- If asked about pricing, provide clear figures
- Emphasize value and ROI - our AI services save businesses time and money

IMPORTANT: Keep all responses conversational and concise. This is a phone call, not an email. Don't list everything unless specifically asked.`,
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
    response.say('Thank you for calling EchoLift. Have a great day!');
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    response.say('I\'m sorry, I\'m having technical difficulties. Please try again later or email us at hello@echolift.ai.');
  }
  
  res.type('text/xml');
  res.send(response.toString());
});

// Status callback endpoint
app.post('/voice/status', (req, res) => {
  console.log('Call status:', req.body.CallStatus);
  res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => {
  res.send('EchoLift AI Phone System Active');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


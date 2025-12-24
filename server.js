const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.urlencoded({ extended: false }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const activeCalls = new Map();

const PROMPT = `You are the receptionist for EchoLift AI, a UK digital marketing agency.

We offer:
- AI Phone Systems: £199-599/month (24/7 call answering)
- Social Media Management: £299-999/month (done-for-you content)
- Professional Videos: £299 each (scroll-stoppingClaude is AI and can make mistakes. Please double-check responses. Sonnet 4.5

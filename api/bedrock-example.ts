/**
 * Example Bedrock API endpoint
 * 
 * This demonstrates how to use AWS Bedrock Claude in a Vercel serverless function.
 * 
 * Endpoint: POST /api/bedrock-example
 * 
 * Request body:
 * {
 *   "message": "Your message to Claude",
 *   "stream": false,
 *   "temperature": 0.7,
 *   "maxTokens": 1024
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { invokeClaude, invokeClaudeStream, type ClaudeMessage } from '../src/lib/ai/bedrock-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      message, 
      stream = false, 
      temperature = 0.7,
      maxTokens = 1024,
      systemPrompt,
      conversationHistory = []
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Build the message array
    const messages: ClaudeMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Handle streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullText = '';
      
      try {
        const response = await invokeClaudeStream(
          messages,
          (chunk) => {
            fullText += chunk;
            // Send each chunk as a Server-Sent Event
            res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
          },
          {
            maxTokens,
            temperature,
            system: systemPrompt
          }
        );

        // Send final metadata
        res.write(`data: ${JSON.stringify({ 
          done: true, 
          fullText,
          usage: response.usage,
          stopReason: response.stop_reason
        })}\n\n`);
        
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
        res.end();
      }
    } 
    // Handle non-streaming response
    else {
      const response = await invokeClaude(messages, {
        maxTokens,
        temperature,
        system: systemPrompt
      });

      return res.status(200).json({
        success: true,
        response: response.content[0]?.text || '',
        usage: response.usage,
        stopReason: response.stop_reason,
        model: response.model
      });
    }
  } catch (error: any) {
    console.error('Bedrock API error:', error);
    
    // Handle specific AWS errors
    if (error.name === 'ValidationException') {
      return res.status(400).json({ 
        error: 'Invalid request parameters',
        details: error.message 
      });
    }
    
    if (error.name === 'ModelNotReadyException') {
      return res.status(503).json({ 
        error: 'Model not ready. Please ensure model access is granted in AWS Bedrock console.',
        details: error.message 
      });
    }
    
    if (error.name === 'ThrottlingException') {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        details: error.message 
      });
    }

    if (error.name === 'AccessDeniedException') {
      return res.status(403).json({ 
        error: 'Access denied. Please check IAM permissions.',
        details: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

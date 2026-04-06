# AWS Bedrock Claude - Quick Reference

## Installation Complete! ✅

You now have AWS Bedrock Claude integrated into your project.

## Quick Start

### 1. Set up your `.env.local` file:

```bash
# Copy the example file if you haven't already
cp .env.example .env.local

# Add your AWS credentials:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

### 2. Test your setup:

```bash
npm run test:bedrock
```

This will run 4 tests to verify your Bedrock connection works properly.

## Usage Examples

### Simple Chat

```typescript
import { chat } from './src/lib/ai/bedrock-client';

const response = await chat('What is AWS Bedrock?', {
  systemPrompt: 'You are a helpful assistant.',
  maxTokens: 200,
  temperature: 0.7
});

console.log(response);
```

### Direct Model Invocation

```typescript
import { invokeClaude } from './src/lib/ai/bedrock-client';

const response = await invokeClaude([
  { role: 'user', content: 'Hello, Claude!' }
], {
  maxTokens: 1024,
  temperature: 1.0,
  system: 'You are a creative assistant.'
});

console.log(response.content[0].text);
console.log('Tokens used:', response.usage);
```

### Streaming Response

```typescript
import { invokeClaudeStream } from './src/lib/ai/bedrock-client';

await invokeClaudeStream([
  { role: 'user', content: 'Write me a story' }
], (chunk) => {
  // Process each chunk as it arrives
  process.stdout.write(chunk);
}, {
  maxTokens: 2048,
  temperature: 0.9
});
```

### Multi-turn Conversation

```typescript
import { chat, type ClaudeMessage } from './src/lib/ai/bedrock-client';

const history: ClaudeMessage[] = [];

// Turn 1
const response1 = await chat('My name is Alex', {
  conversationHistory: history
});
history.push({ role: 'user', content: 'My name is Alex' });
history.push({ role: 'assistant', content: response1 });

// Turn 2
const response2 = await chat('What is my name?', {
  conversationHistory: history
});
console.log(response2); // Should remember "Alex"
```

### Cost Estimation

```typescript
import { estimateCost } from './src/lib/ai/bedrock-client';

const inputTokens = 100;
const outputTokens = 200;

const cost = estimateCost(inputTokens, outputTokens);
console.log(`Estimated cost: $${cost.toFixed(6)}`);
```

## Available Models

| Model | Model ID | Best For |
|-------|----------|----------|
| **Claude 3.5 Sonnet** (Recommended) | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Best balance of speed, capability, and cost |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229` | Complex reasoning tasks |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307` | Fast, cost-effective responses |

## Configuration Options

### Message Format
```typescript
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### Invocation Options
```typescript
{
  maxTokens?: number;        // Max output tokens (default: 4096)
  temperature?: number;      // 0-1, controls randomness (default: varies)
  system?: string;           // System prompt
  topP?: number;            // Nucleus sampling (0-1)
  topK?: number;            // Top-K sampling
  stopSequences?: string[]; // Stop generation at these sequences
}
```

## Common Patterns

### Agent-style Usage
```typescript
const systemPrompt = `You are an AI coding assistant. 
Follow these guidelines:
- Write clean, maintainable code
- Explain complex concepts clearly
- Suggest best practices`;

const response = await chat(userQuery, {
  systemPrompt,
  maxTokens: 4096,
  temperature: 0.7
});
```

### Code Generation
```typescript
const response = await invokeClaude([
  {
    role: 'user',
    content: 'Write a TypeScript function that validates email addresses'
  }
], {
  temperature: 0.3, // Lower temp for more deterministic code
  maxTokens: 1024
});
```

### Creative Writing
```typescript
const response = await invokeClaude([
  { role: 'user', content: 'Write a creative product description' }
], {
  temperature: 0.9, // Higher temp for more creativity
  maxTokens: 500
});
```

## Error Handling

```typescript
try {
  const response = await invokeClaude(messages);
  console.log(response.content[0].text);
} catch (error) {
  if (error.name === 'ValidationException') {
    console.error('Invalid request parameters');
  } else if (error.name === 'ModelNotReadyException') {
    console.error('Model access not granted in Bedrock console');
  } else if (error.name === 'ThrottlingException') {
    console.error('Rate limit exceeded, retry with backoff');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Troubleshooting

### "Access Denied" Error
1. Check AWS credentials in `.env.local`
2. Verify IAM permissions include `bedrock:InvokeModel`
3. Ensure model access is granted in AWS Bedrock console

### "Model Not Found" Error
1. Verify `BEDROCK_MODEL_ID` is spelled correctly
2. Check the model is available in your AWS region
3. Confirm model access has been granted

### Slow Performance
1. Choose a region closer to your location
2. Use Claude 3 Haiku for faster responses
3. Reduce `maxTokens` parameter

## Next Steps

- [ ] Complete AWS Bedrock setup (see `AWS_BEDROCK_SETUP.md`)
- [ ] Run `npm run test:bedrock` to verify setup
- [ ] Integrate into your agent workflows
- [ ] Set up cost monitoring in AWS Console
- [ ] Implement error handling and retries

## Resources

- [Full Setup Guide](./AWS_BEDROCK_SETUP.md)
- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Pricing Calculator](https://aws.amazon.com/bedrock/pricing/)

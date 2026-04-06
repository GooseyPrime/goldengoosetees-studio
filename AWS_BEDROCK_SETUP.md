# AWS Bedrock Setup Guide for Claude

This guide will help you set up AWS Bedrock to use Claude models as your AI agent backend.

## Prerequisites

- AWS Account with Bedrock access
- AWS CLI installed (optional but recommended)
- Node.js SDK packages (already installed)

## Step 1: Enable Bedrock Model Access

1. **Log into AWS Console**: https://console.aws.amazon.com/
2. **Navigate to AWS Bedrock**: Search for "Bedrock" in the services search
3. **Request Model Access**:
   - Click on "Model access" in the left sidebar
   - Click "Manage model access" or "Request model access"
   - Select the Claude models you want to use:
     - ✅ Claude 3.5 Sonnet (recommended for agents)
     - ✅ Claude 3 Opus (for complex reasoning)
     - ✅ Claude 3 Haiku (for fast responses)
   - Click "Request model access" or "Save changes"
   - Wait for approval (usually instant for Claude models)

## Step 2: Create IAM User for Bedrock Access

### Option A: Using AWS Console

1. Go to **IAM Console**: https://console.aws.amazon.com/iam/
2. Click **Users** → **Create user**
3. User name: `bedrock-app-user` (or your preferred name)
4. Click **Next**
5. **Set permissions**:
   - Select "Attach policies directly"
   - Search for and select: `AmazonBedrockFullAccess`
   - (Alternative: Create custom policy with minimal permissions - see below)
6. Click **Next** → **Create user**
7. **Create Access Keys**:
   - Click on the newly created user
   - Go to **Security credentials** tab
   - Click **Create access key**
   - Select "Application running outside AWS"
   - Click **Next** → **Create access key**
   - ⚠️ **SAVE THESE CREDENTIALS** - you won't see the secret key again:
     - Access Key ID: `AKIA...`
     - Secret Access Key: `abc123...`

### Option B: Minimal Permissions Policy (Recommended for Production)

If you want to follow the principle of least privilege, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    }
  ]
}
```

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local` (if you haven't already):
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your AWS credentials:
   ```bash
   # AWS BEDROCK
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
   AWS_SECRET_ACCESS_KEY=abc123...your-secret-access-key
   
   # Choose your preferred Claude model
   BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
   ```

3. **Important**: Add `.env.local` to `.gitignore` (should already be there)

## Step 4: Available Claude Models on Bedrock

| Model | Model ID | Best For |
|-------|----------|----------|
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Balanced performance & cost, great for agents |
| Claude 3.5 Sonnet v1 | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Previous version |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229` | Complex reasoning, highest capability |
| Claude 3 Sonnet | `anthropic.claude-3-sonnet-20240229` | Fast and capable |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307` | Fastest, most cost-effective |

## Step 5: Test Your Setup

Create a simple test script to verify your Bedrock connection:

```typescript
// scripts/test-bedrock.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

async function testBedrock() {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  });

  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "Hello! Please respond with 'AWS Bedrock is working!' if you can read this."
      }
    ]
  };

  try {
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(payload),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('✅ Success! Response:', responseBody.content[0].text);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBedrock();
```

Run it:
```bash
npx tsx scripts/test-bedrock.ts
```

## Step 6: Regional Availability

AWS Bedrock is available in specific regions. Supported regions for Claude models:

- `us-east-1` (US East - N. Virginia) ✅ Recommended
- `us-west-2` (US West - Oregon)
- `ap-southeast-1` (Singapore)
- `ap-northeast-1` (Tokyo)
- `eu-central-1` (Frankfurt)
- `eu-west-3` (Paris)

Choose the region closest to your application for lowest latency.

## Security Best Practices

1. **Never commit credentials**: Ensure `.env.local` is in `.gitignore`
2. **Use AWS Secrets Manager** (Production): For production, consider using AWS Secrets Manager or Parameter Store
3. **Rotate keys regularly**: Set up key rotation every 90 days
4. **Use minimal permissions**: Use the custom policy instead of `AmazonBedrockFullAccess`
5. **Enable CloudTrail**: Monitor API usage for security auditing
6. **Set up billing alerts**: AWS Bedrock charges per token, set up alerts in AWS Billing

## Pricing

Claude models on Bedrock use token-based pricing:

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| Claude 3.5 Sonnet | $0.003 | $0.015 |
| Claude 3 Opus | $0.015 | $0.075 |
| Claude 3 Haiku | $0.00025 | $0.00125 |

## Troubleshooting

### Error: "Access Denied"
- Check that model access is enabled in Bedrock console
- Verify IAM permissions include `bedrock:InvokeModel`
- Confirm credentials are correctly set in `.env.local`

### Error: "Model not found"
- Verify the `BEDROCK_MODEL_ID` matches exactly (case-sensitive)
- Check that the model is available in your selected region
- Confirm model access has been granted in Bedrock console

### Error: "Throttling"
- Bedrock has rate limits by model and region
- Implement exponential backoff in your code
- Consider requesting quota increases in AWS Console

### Slow Response Times
- Choose a region closer to your deployment
- Use Claude 3 Haiku for faster responses
- Reduce `max_tokens` parameter

## Next Steps

Once configured, you can:
1. Integrate Bedrock Claude into your agent workflows
2. Replace existing AI providers with Bedrock
3. Set up streaming responses for better UX
4. Implement token counting and cost tracking
5. Create wrapper functions for consistent API calls

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude on Bedrock Guide](https://docs.anthropic.com/claude/docs/claude-on-amazon-bedrock)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)

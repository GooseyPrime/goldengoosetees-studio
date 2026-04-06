# Continue.dev + AWS Bedrock Setup Guide

This guide shows you how to configure Continue.dev VS Code extension to use AWS Bedrock Claude models instead of buying credits.

## Prerequisites

- ✅ VS Code installed
- ✅ Continue.dev extension installed
- ✅ AWS account with Bedrock access
- ✅ AWS access keys with Bedrock permissions

## Step 1: Find Your Continue Config File

The Continue configuration file location depends on your OS:

- **Windows**: `C:\Users\YourUsername\.continue\config.json`
- **macOS**: `~/.continue/config.json`
- **Linux**: `~/.continue/config.json`

Or open it directly in VS Code:
1. Open Continue sidebar (Cmd/Ctrl + L)
2. Click the gear icon (⚙️) at bottom
3. Click "Edit config.json"

## Step 2: Configure AWS Bedrock

Replace the contents of `config.json` with this configuration:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet (Bedrock)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "profile": "default"
    },
    {
      "title": "Claude 3 Opus (Bedrock)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-opus-20240229",
      "region": "us-east-1",
      "profile": "default"
    },
    {
      "title": "Claude 3 Haiku (Bedrock)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-haiku-20240307",
      "region": "us-east-1",
      "profile": "default"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude 3 Haiku Autocomplete",
    "provider": "bedrock",
    "model": "anthropic.claude-3-haiku-20240307",
    "region": "us-east-1",
    "profile": "default"
  },
  "customCommands": [
    {
      "name": "test",
      "prompt": "Write a comprehensive set of unit tests for the highlighted code. Use the same testing framework as the rest of the codebase and maintain existing patterns."
    },
    {
      "name": "docs",
      "prompt": "Write comprehensive documentation for the highlighted code. Include docstrings, parameter descriptions, return values, and usage examples."
    },
    {
      "name": "fix",
      "prompt": "Analyze the highlighted code for bugs and issues. Explain what's wrong and provide a corrected version."
    },
    {
      "name": "optimize",
      "prompt": "Optimize the highlighted code for better performance and readability. Explain your changes."
    }
  ],
  "allowAnonymousTelemetry": false,
  "embeddingsProvider": {
    "provider": "bedrock",
    "model": "amazon.titan-embed-text-v1",
    "region": "us-east-1",
    "profile": "default"
  }
}
```

## Step 3: Set Up AWS Credentials

Continue.dev uses AWS CLI credentials. Set them up using **one of these methods**:

### Option A: AWS CLI Configuration (Recommended)

1. Install AWS CLI: https://aws.amazon.com/cli/

2. Run:
   ```bash
   aws configure
   ```

3. Enter your credentials:
   ```
   AWS Access Key ID: YOUR_ACCESS_KEY_ID
   AWS Secret Access Key: YOUR_SECRET_ACCESS_KEY
   Default region name: us-east-1
   Default output format: json
   ```

This creates `~/.aws/credentials` and `~/.aws/config` files.

### Option B: Environment Variables

Add to your system environment variables:

**Windows (PowerShell)**:
```powershell
[System.Environment]::SetEnvironmentVariable('AWS_ACCESS_KEY_ID', 'YOUR_ACCESS_KEY', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_SECRET_ACCESS_KEY', 'YOUR_SECRET_KEY', 'User')
[System.Environment]::SetEnvironmentVariable('AWS_REGION', 'us-east-1', 'User')
```

**macOS/Linux (add to `~/.bashrc` or `~/.zshrc`)**:
```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_REGION=us-east-1
```

### Option C: Named Profile in Continue Config

If using a non-default AWS profile:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "profile": "my-bedrock-profile"
    }
  ]
}
```

Then in `~/.aws/credentials`:
```
[my-bedrock-profile]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

## Step 4: Restart VS Code

After configuring, **restart VS Code** completely for changes to take effect.

## Step 5: Test Continue

1. Open any code file
2. Open Continue sidebar (Cmd/Ctrl + L or Cmd/Ctrl + I)
3. Select "Claude 3.5 Sonnet (Bedrock)" from model dropdown
4. Type a question like: "Explain this code"
5. Should work without asking for credits!

## Available Models

| Model | ID | Use Case | Speed | Cost |
|-------|-----|----------|-------|------|
| **Claude 3.5 Sonnet** | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Best for coding | Fast | Low |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229` | Complex problems | Slower | High |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307` | Quick answers, autocomplete | Fastest | Lowest |

## Continue.dev Features with Bedrock

### Chat (Cmd/Ctrl + L)
Ask questions about code, get explanations, request changes.

### Edit (Cmd/Ctrl + I)
Highlight code and describe changes in natural language.

### Tab Autocomplete
AI-powered code completion as you type (uses Haiku model).

### Custom Commands (Cmd/Ctrl + Shift + P → Continue)
- `/test` - Generate tests
- `/docs` - Write documentation  
- `/fix` - Debug issues
- `/optimize` - Improve code

### Slash Commands
- `/edit` - Edit highlighted code
- `/comment` - Add comments
- `/share` - Share context
- `/cmd` - Run terminal commands

## Troubleshooting

### "Error: AccessDeniedException"
- **Cause**: AWS credentials not configured or IAM permissions missing
- **Fix**: 
  1. Run `aws configure` and enter credentials
  2. Verify IAM user has `AmazonBedrockFullAccess` policy
  3. Restart VS Code

### "Error: Model not found"
- **Cause**: Model access not enabled in AWS Bedrock Console
- **Fix**: 
  1. Go to AWS Bedrock Console
  2. Click "Model access" → "Manage model access"
  3. Enable Claude models
  4. Wait for approval (usually instant)

### "Still asking for credits"
- **Cause**: Config not loaded or wrong provider
- **Fix**:
  1. Verify `config.json` has `"provider": "bedrock"`
  2. Check model dropdown shows "Claude 3.5 Sonnet (Bedrock)"
  3. Completely restart VS Code (not just reload window)
  4. Check AWS credentials with: `aws bedrock list-foundation-models`

### "Slow responses"
- **Cause**: Region too far from your location
- **Fix**: Change `region` to closer one:
  - US East: `us-east-1`
  - US West: `us-west-2`
  - Europe: `eu-central-1`
  - Asia: `ap-northeast-1`

### "Rate limit errors"
- **Cause**: Too many requests
- **Fix**: Bedrock has rate limits by model
  - Wait a moment between requests
  - Use Haiku for quick queries
  - Request quota increase in AWS Console if needed

## Advanced Configuration

### Multiple Regions

```json
{
  "models": [
    {
      "title": "Claude Sonnet (US East)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1"
    },
    {
      "title": "Claude Sonnet (Europe)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "eu-central-1"
    }
  ]
}
```

### Custom Context Length

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "contextLength": 200000
    }
  ]
}
```

### Temperature Control

```json
{
  "models": [
    {
      "title": "Claude (Creative)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "temperature": 0.9
    },
    {
      "title": "Claude (Precise)",
      "provider": "bedrock",
      "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "temperature": 0.3
    }
  ]
}
```

## Cost Optimization

### Use Haiku for Quick Tasks
Set Haiku as default for autocomplete and simple queries (25x cheaper than Opus).

### Monitor Usage
- Check AWS Cost Explorer regularly
- Set up billing alerts in AWS Console
- Use `estimateCost()` if building tracking tools

### Expected Costs
For typical developer usage (8 hours/day):
- Haiku autocomplete: ~$0.50-2/day
- Sonnet chat: ~$2-5/day
- Opus (if used): ~$10-20/day

Much cheaper than GitHub Copilot ($10/month) or Cursor Pro ($20/month) if you code a lot!

## Next Steps

1. ✅ Configure Continue's `config.json`
2. ✅ Set up AWS credentials
3. ✅ Restart VS Code
4. ✅ Test with Cmd/Ctrl + L
5. ✅ Try custom commands
6. ✅ Set up billing alerts in AWS

## Resources

- [Continue.dev Docs](https://continue.dev/docs)
- [Continue Bedrock Provider](https://continue.dev/docs/reference/Model%20Providers/bedrock)
- [AWS Bedrock Regions](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-regions.html)
- [Claude Models List](https://docs.anthropic.com/claude/docs/models-overview)

---

**You're all set!** You now have a powerful AI coding assistant without subscription fees - you only pay for what you use through AWS. 🚀

# Troubleshooting Image Generation Issues

## Quick Diagnosis

If you're still seeing console errors after deploying these fixes, use this guide to diagnose the issue.

## Common Error Messages & Solutions

### 1. "404 Not Found" for `/api/ai/design-phase-message`
**Status**: ✅ FIXED in this PR
**What it was**: Endpoint didn't exist
**What we did**: Created the endpoint
**If still occurring**: Ensure the latest code is deployed

### 2. "Chat API error: 503 Service Unavailable"
**Status**: ✅ EXPECTED if API keys not configured
**What it means**: No AI provider API keys are configured
**Solution**: Set at least one of these environment variables:
```bash
GEMINI_API_KEY=your-key-here
# OR
OPENAI_API_KEY=your-key-here
# OR
OPENROUTER_API_KEY=your-key-here
```

### 3. "Image generation not configured"
**Status**: ✅ EXPECTED if API keys not configured
**What it means**: Neither GEMINI_API_KEY nor OPENAI_API_KEY is set
**Solution**: Set at least one:
```bash
GEMINI_API_KEY=your-key-here
# OR
OPENAI_API_KEY=your-key-here
```

### 4. "Initial message generation failed"
**Cause**: Chat API is unavailable (see #2 above)
**Solution**: Configure AI provider API keys

### 5. Chrome Extension Errors (chrome-extension://invalid/)
**Status**: ⚠️ UNRELATED to our code
**What it means**: Browser extensions trying to inject scripts
**Impact**: None on functionality - can be ignored
**Solution**: Disable browser extensions or add them to ignore list

### 6. "TypeError: Cannot read properties of undefined (reading 'messenger')"
**Status**: ⚠️ LIKELY from browser extensions
**What it means**: Extension code failing to find expected properties
**Impact**: Doesn't affect our application
**Solution**: These are safe to ignore or disable the extensions

## Verifying the Fix

### Step 1: Check API Endpoints
Make a test request to verify endpoints respond correctly:

```bash
# Test chat endpoint (should return 503 if no keys configured)
curl -X POST http://localhost:5173/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Test design-phase-message endpoint (should return 200)
curl -X POST http://localhost:5173/api/ai/design-phase-message \
  -H "Content-Type: application/json" \
  -d '{"type":"creating","concept":"test design"}'

# Test generate-design endpoint (should return 503 if no keys configured)
curl -X POST http://localhost:5173/api/ai/generate-design \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test design"}'
```

### Step 2: Verify Environment Variables
Check that your deployment platform has these variables set:

**Required for AI features:**
- `GEMINI_API_KEY` (recommended) OR
- `OPENAI_API_KEY`

**Optional for enhanced features:**
- `OPENROUTER_API_KEY` (for content moderation & IP checking)

**Required for data persistence:**
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Check Network Tab
Open browser DevTools → Network tab and look for:
- All API requests should return proper status codes (200, 400, 503)
- No more 404 errors for `/api/ai/design-phase-message`
- 503 errors should have clear error messages in response body

## Expected Behavior After Fix

### With API Keys Configured:
✅ Chat endpoint returns AI-generated responses
✅ Image generation creates designs
✅ Initial messages load successfully
✅ All API calls return 200 OK

### Without API Keys:
✅ Chat endpoint returns 503 with clear error message
✅ Image generation returns 503 with clear error message
✅ design-phase-message returns fallback messages (200 OK)
✅ Content moderation/IP check fail open (allow requests)

## Getting API Keys

### Gemini (Recommended)
1. Visit https://makersuite.google.com/app/apikey
2. Create or select a project
3. Generate API key
4. Set as `GEMINI_API_KEY` environment variable

### OpenAI (Fallback)
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. Set as `OPENAI_API_KEY` environment variable

### OpenRouter (Optional)
1. Visit https://openrouter.ai/keys
2. Create API key
3. Set as `OPENROUTER_API_KEY` environment variable

## Still Having Issues?

1. Check the console logs on the server (not browser)
2. Verify environment variables are set in deployment platform
3. Ensure code is fully deployed (check git commit SHA)
4. Clear browser cache and reload
5. Check if the issue is from a browser extension (test in incognito mode)

## Contact

If issues persist after following this guide, please provide:
- Error messages from browser console
- Network tab screenshots showing failed requests
- Confirmation that environment variables are set
- Whether testing locally or on deployed environment

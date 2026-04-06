/**
 * Test script for AWS Bedrock Claude integration
 * 
 * Run with: npx tsx scripts/test-bedrock.ts
 */

import { invokeClaude, invokeClaudeStream, chat, estimateCost } from '../src/lib/ai/bedrock-client';

async function testBasicInvoke() {
  console.log('🧪 Test 1: Basic Claude invocation...\n');
  
  try {
    const response = await invokeClaude([
      {
        role: 'user',
        content: 'Hello! Please respond with exactly: "AWS Bedrock is working perfectly!"'
      }
    ], {
      maxTokens: 100,
      temperature: 0.7
    });

    console.log('✅ Success!');
    console.log('Response:', response.content[0]?.text);
    console.log('\nUsage:');
    console.log(`  Input tokens: ${response.usage.input_tokens}`);
    console.log(`  Output tokens: ${response.usage.output_tokens}`);
    console.log(`  Estimated cost: $${estimateCost(response.usage.input_tokens, response.usage.output_tokens).toFixed(6)}`);
    console.log(`  Stop reason: ${response.stop_reason}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testStreamingInvoke() {
  console.log('\n\n🧪 Test 2: Streaming invocation...\n');
  
  try {
    let fullText = '';
    
    console.log('Response (streaming): ');
    
    const response = await invokeClaudeStream([
      {
        role: 'user',
        content: 'Write a haiku about cloud computing. Make it tech-themed.'
      }
    ], (chunk) => {
      process.stdout.write(chunk);
      fullText += chunk;
    }, {
      maxTokens: 200,
      temperature: 1.0
    });

    console.log('\n\n✅ Streaming complete!');
    console.log(`\nUsage:`);
    console.log(`  Input tokens: ${response.usage.input_tokens}`);
    console.log(`  Output tokens: ${response.usage.output_tokens}`);
    console.log(`  Estimated cost: $${estimateCost(response.usage.input_tokens, response.usage.output_tokens).toFixed(6)}`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Error:', error);
    return false;
  }
}

async function testChatHelper() {
  console.log('\n\n🧪 Test 3: Chat helper function...\n');
  
  try {
    const response = await chat(
      'What is AWS Bedrock in one sentence?',
      {
        systemPrompt: 'You are a helpful AI assistant that provides concise answers.',
        maxTokens: 100,
        temperature: 0.5
      }
    );

    console.log('✅ Success!');
    console.log('Response:', response);
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function testConversation() {
  console.log('\n\n🧪 Test 4: Multi-turn conversation...\n');
  
  try {
    const conversationHistory = [
      { role: 'user' as const, content: 'My name is Alex.' },
      { role: 'assistant' as const, content: 'Nice to meet you, Alex! How can I help you today?' },
    ];

    const response = await chat(
      'What is my name?',
      {
        conversationHistory,
        maxTokens: 50,
        temperature: 0.3
      }
    );

    console.log('✅ Success!');
    console.log('Response:', response);
    console.log('\n(Should remember the name "Alex")');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  AWS Bedrock Claude Integration Test Suite');
  console.log('═══════════════════════════════════════════════\n');

  // Check environment variables
  console.log('📋 Environment check:');
  console.log(`  AWS_REGION: ${process.env.AWS_REGION || '❌ Not set'}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`  BEDROCK_MODEL_ID: ${process.env.BEDROCK_MODEL_ID || 'Using default (Claude 3.5 Sonnet)'}\n`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ Missing AWS credentials. Please set them in your .env.local file.');
    console.error('   See AWS_BEDROCK_SETUP.md for instructions.\n');
    process.exit(1);
  }

  const tests = [
    testBasicInvoke,
    testStreamingInvoke,
    testChatHelper,
    testConversation,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Test Results');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${tests.length}\n`);

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Please check:');
    console.log('  1. AWS credentials are correct');
    console.log('  2. Bedrock model access is enabled in AWS Console');
    console.log('  3. IAM permissions include bedrock:InvokeModel');
    console.log('  4. The model ID is correct for your region\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! AWS Bedrock is configured correctly.\n');
    process.exit(0);
  }
}

runAllTests();

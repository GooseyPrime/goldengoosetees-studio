/// <reference types="node" />
/**
 * AWS Bedrock Claude Client
 * 
 * A typed client for invoking Claude models via AWS Bedrock.
 * Supports both streaming and non-streaming responses.
 */

import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  type InvokeModelCommandOutput 
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  modelId?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequestPayload {
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Initialize Bedrock Runtime Client
 */
export function createBedrockClient(config?: BedrockConfig): BedrockRuntimeClient {
  const region = config?.region || process.env.AWS_REGION || 'us-east-1';
  
  const credentials = (config?.accessKeyId && config?.secretAccessKey) ? {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    sessionToken: config.sessionToken,
  } : {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };

  return new BedrockRuntimeClient({ region, credentials });
}

/**
 * Invoke Claude model (non-streaming)
 */
export async function invokeClaude(
  messages: ClaudeMessage[],
  options?: {
    config?: BedrockConfig;
    maxTokens?: number;
    temperature?: number;
    system?: string;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
  }
): Promise<ClaudeResponse> {
  const client = createBedrockClient(options?.config);
  const modelId = options?.config?.modelId 
    || process.env.BEDROCK_MODEL_ID 
    || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  const payload: ClaudeRequestPayload & { anthropic_version: string } = {
    anthropic_version: 'bedrock-2023-05-31',
    messages,
    max_tokens: options?.maxTokens || 4096,
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.topP !== undefined && { top_p: options.topP }),
    ...(options?.topK !== undefined && { top_k: options.topK }),
    ...(options?.system && { system: options.system }),
    ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
  };

  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody as ClaudeResponse;
  } catch (error) {
    console.error('Bedrock invocation error:', error);
    throw error;
  }
}

/**
 * Invoke Claude model with streaming
 */
export async function invokeClaudeStream(
  messages: ClaudeMessage[],
  onChunk: (text: string) => void,
  options?: {
    config?: BedrockConfig;
    maxTokens?: number;
    temperature?: number;
    system?: string;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
  }
): Promise<ClaudeResponse> {
  const client = createBedrockClient(options?.config);
  const modelId = options?.config?.modelId 
    || process.env.BEDROCK_MODEL_ID 
    || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  const payload: ClaudeRequestPayload & { anthropic_version: string } = {
    anthropic_version: 'bedrock-2023-05-31',
    messages,
    max_tokens: options?.maxTokens || 4096,
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.topP !== undefined && { top_p: options.topP }),
    ...(options?.topK !== undefined && { top_k: options.topK }),
    ...(options?.system && { system: options.system }),
    ...(options?.stopSequences && { stop_sequences: options.stopSequences }),
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    const response = await client.send(command);
    
    let fullResponse: ClaudeResponse | null = null;
    
    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            onChunk(chunk.delta.text);
          }
          
          if (chunk.type === 'message_stop') {
            // Final message metadata is usually in message_start event
            // We'll construct it from accumulated data
          }
          
          if (chunk.type === 'message_start') {
            fullResponse = chunk.message;
          }
        }
      }
    }

    if (!fullResponse) {
      throw new Error('No response received from streaming');
    }

    return fullResponse;
  } catch (error) {
    console.error('Bedrock streaming error:', error);
    throw error;
  }
}

/**
 * Simple helper to chat with Claude
 */
export async function chat(
  userMessage: string,
  options?: {
    config?: BedrockConfig;
    systemPrompt?: string;
    conversationHistory?: ClaudeMessage[];
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const messages: ClaudeMessage[] = [
    ...(options?.conversationHistory || []),
    { role: 'user', content: userMessage }
  ];

  const response = await invokeClaude(messages, {
    config: options?.config,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    system: options?.systemPrompt,
  });

  return response.content[0]?.text || '';
}

/**
 * Get estimated cost for a request
 */
export function estimateCost(inputTokens: number, outputTokens: number, modelId?: string): number {
  const model = modelId || process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 0.003, output: 0.015 },
    'anthropic.claude-3-5-sonnet-20240620-v1:0': { input: 0.003, output: 0.015 },
    'anthropic.claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'anthropic.claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
    'anthropic.claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  };

  const rates = pricing[model] || pricing['anthropic.claude-3-5-sonnet-20241022-v2:0'];
  
  const inputCost = (inputTokens / 1000) * rates.input;
  const outputCost = (outputTokens / 1000) * rates.output;
  
  return inputCost + outputCost;
}

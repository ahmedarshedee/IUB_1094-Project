import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const router = express.Router();
console.log('[AI router] module loaded');

// AI Provider implementations
const aiProviders = {
  // Groq (Primary Provider) - Fast LLM inference
  async groq(prompt, apiKey) {
    const groq = new Groq({ apiKey });
    // Try multiple Groq models
    const modelsToTry = [
      'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile',
      'llama-3-8b-8192',
      'mixtral-8x7b-32768',
    ];
    
    for (const modelName of modelsToTry) {
      try {
        const chat = await groq.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        });
        
        const text = chat.choices[0]?.message?.content;
        
        if (text && text.trim()) {
          return { text: text.trim(), model: modelName, provider: 'groq' };
        }
      } catch (err) {
        // If model not available, try next one
        if (err.message?.includes('model') || err.message?.includes('404')) {
          continue;
        }
        throw err;
      }
    }
    
    throw new Error('All Groq models failed');
  },
  // Google Gemini
  async gemini(prompt, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ];
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        if (text && text.trim()) {
          return { text: text.trim(), model: modelName, provider: 'gemini' };
        }
      } catch (err) {
        continue;
      }
    }
    throw new Error('All Gemini models failed');
  },

  // OpenAI GPT (Primary Provider)
  async openai(prompt, apiKey) {
    // Try GPT-4 first, fallback to GPT-3.5-turbo
    const modelsToTry = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'];
    
    for (const modelName of modelsToTry) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          // If model not available, try next one
          if (error.error?.code === 'model_not_found' || response.status === 404) {
            continue;
          }
          throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        
        if (text && text.trim()) {
          return { text: text.trim(), model: modelName, provider: 'openai' };
        }
      } catch (err) {
        // If it's not a model_not_found error, throw it
        if (!err.message.includes('model_not_found') && !err.message.includes('404')) {
          throw err;
        }
        continue;
      }
    }
    
    throw new Error('All OpenAI models failed');
  },

  // Anthropic Claude (via API)
  async claude(prompt, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    const data = await response.json();
    const text = data.content[0]?.text;
    
    if (!text) {
      throw new Error('No response from Claude');
    }
    
    return { text: text.trim(), model: 'claude-3-haiku-20240307', provider: 'claude' };
  },
};

// Log all incoming requests
router.use((req, res, next) => {
  console.log(`[AI router] ${req.method} ${req.path}`);
  next();
});

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  console.log('[AI] /generate endpoint called');
  console.log('[AI] Request body:', JSON.stringify(req.body));
  
  try {
    const { prompt, provider = 'auto' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    console.log('[AI] Prompt:', prompt.substring(0, 100));
    console.log('[AI] Provider preference:', provider);

    // Determine which provider to use (auto-detect or use specified)
    let providersToTry = [];
    
    if (provider === 'auto' || !provider) {
      // Auto-detect: try providers in order of preference (Groq first)
      providersToTry = ['groq', 'openai', 'gemini', 'claude'];
    } else {
      // Use specified provider
      providersToTry = [provider.toLowerCase()];
    }

    let result = null;
    let lastError = null;

    // Try each provider until one works
    for (const providerName of providersToTry) {
      try {
        console.log(`[AI] Trying provider: ${providerName}`);
        
        let apiKey;
        switch (providerName) {
          case 'groq':
            apiKey = process.env.GROQ_API_KEY;
            break;
          case 'openai':
            apiKey = process.env.OPENAI_API_KEY;
            break;
          case 'gemini':
            apiKey = process.env.GEMINI_API_KEY || process.env.BARD_API_KEY;
            break;
          case 'claude':
            apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
            break;
          default:
            continue;
        }

        if (!apiKey) {
          console.log(`[AI] No API key found for ${providerName}, skipping...`);
          continue;
        }

        // Call the provider
        if (aiProviders[providerName]) {
          result = await aiProviders[providerName](prompt, apiKey);
          console.log(`[AI] ✅ Success with ${providerName} (${result.model})`);
          console.log('[AI] Generated text length:', result.text.length);
          break;
        }
      } catch (providerErr) {
        console.error(`[AI] ❌ Provider ${providerName} failed:`, providerErr.message);
        lastError = providerErr.message;
        continue;
      }
    }

    if (!result) {
      console.error('[AI] All providers failed:', lastError);
      return res.status(500).json({ 
        error: `Failed to generate content. Error: ${lastError || 'All providers failed'}. Please ensure at least one AI API key is configured in your .env file (GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY).` 
      });
    }

    // Return in expected format (compatible with existing client code)
    return res.status(200).json({
      candidates: [{
        content: {
          parts: [{
            text: result.text
          }]
        }
      }],
      provider: result.provider,
      model: result.model
    });

  } catch (err) {
    console.error('[AI] Unexpected error:', err);
    return res.status(500).json({ 
      error: err.message || 'AI proxy error' 
    });
  }
});

// Health check endpoint
router.get('/ping', (req, res) => {
  return res.json({ ok: true, ts: Date.now() });
});

// Test endpoint to verify Gemini API is working
router.post('/test', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.BARD_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not found in environment variables',
        envCheck: {
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
          BARD_API_KEY: !!process.env.BARD_API_KEY
        }
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent('Say "Hello, Gemini is working!"');
    const response = await result.response;
    const text = response.text();

    return res.json({ 
      success: true, 
      message: 'Gemini API is working!',
      response: text,
      apiKeyLength: apiKey.length
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Gemini API test failed',
      message: error.message,
      details: error.toString()
    });
  }
});

export default router;

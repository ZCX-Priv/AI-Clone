/* 全局配置：按“模型ID: 模型别名”，设置中展示别名，保存时使用模型ID */
/* 提示：
   1) 仅将你要使用的提供方 enabled 设为 true（建议只启用一个）
   2) 本应用当前按 OpenAI Chat Completions 格式调用（POST /v1/chat/completions + SSE data: 流）
      - openai / xAI / deepseek：原生兼容
      - google：使用其 OpenAI 兼容端点 v1beta/openai/chat/completions
      - anthropic：官方 API 非 OpenAI 兼容，若直连恐不通；可用代理或通过 openrouter 调用
   3) {API_KEY}/{REFERER} 会由脚本动态替换
*/
const API_CONFIG = {
  // 1) OpenAI
  openai: {
    name: 'OpenAI',
    enabled: false,
    baseURL: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    defaultModel: 'gpt-4o-mini',
    models: {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o mini',
      'gpt-4.1': 'GPT-4.1',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}',
      'X-Title': 'AI Clone'
    }
  },

  // 2) Google (OpenAI 兼容层)
  google: {
    name: 'Google',
    enabled: false,
    // Google 提供 OpenAI 兼容端点（需申请相应权限）
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    apiKey: '',
    defaultModel: 'gemini-1.5-flash',
    models: {
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro'
    },
    headers: {
      'Content-Type': 'application/json',
      // 某些兼容层支持 Authorization，官方更多使用 x-goog-api-key
      'Authorization': 'Bearer {API_KEY}',
      'x-goog-api-key': '{API_KEY}'
    }
  },

  // 3) Anthropic（建议通过 OpenRouter 使用；直连需自备 OpenAI 兼容代理）
  anthropic: {
    name: 'Anthropic',
    enabled: false,
    // 官方端点为 /v1/messages（非 OpenAI 兼容，仅占位）
    baseURL: 'https://api.anthropic.com/v1/messages',
    apiKey: '',
    defaultModel: 'claude-3-5-sonnet',
    models: {
      'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
      'claude-3-opus': 'Claude 3 Opus',
      'claude-3-sonnet': 'Claude 3 Sonnet',
      'claude-3-haiku': 'Claude 3 Haiku'
    },
    headers: {
      'Content-Type': 'application/json',
      // 官方使用 x-api-key 与 anthropic-version；若使用 OpenAI 兼容代理，请改为 Authorization
      'x-api-key': '{API_KEY}',
      'anthropic-version': '2023-06-01'
    }
  },

  // 4) xAI
  xai: {
    name: 'xAI',
    enabled: false,
    baseURL: 'https://api.x.ai/v1/chat/completions',
    apiKey: '',
    defaultModel: 'grok-2-mini',
    models: {
      'grok-2': 'Grok-2',
      'grok-2-mini': 'Grok-2 Mini'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}',
      'X-Title': 'AI Clone'
    }
  },

  // 5) DeepSeek
  deepseek: {
    name: 'DeepSeek',
    enabled: false,
    baseURL: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    defaultModel: 'deepseek-chat',
    models: {
      'deepseek-chat': 'DeepSeek-Chat',
      'deepseek-reasoner': 'DeepSeek-Reasoner'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}',
      'X-Title': 'AI Clone'
    }
  },

  // 6) OpenRouter（
  openrouter: {
      name: 'OpenRouter',
      enabled: false, 
      baseURL: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: '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', 
      defaultModel: 'deepseek/deepseek-chat-v3-0324:free', 
      models: {
          'deepseek/deepseek-chat-v3-0324:free': 'DeepSeek V3',
          'deepseek/deepseek-chat-v3.1:free': 'DeepSeek V3.1',
          'deepseek/deepseek-r1-0528:free': 'DeepSeek R1',
          'qwen/qwq-32b:free': '通义千问 QwQ',
          'qwen/qwen3-235b-a22b:free': '通义千问 3.0',
          'z-ai/glm-4.5-air:free': 'GLM-4.5 Air',
          'moonshotai/kimi-k2:free': 'Kimi K2',
          'tencent/hunyuan-a13b-instruct:free': '混元 A13B',
          'openai/gpt-oss-20b:free': 'GPT-OSS'
      },
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {API_KEY}',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'NextAI'
      }
  },

  // 7) Pollinations
  pollinations: {
    name: 'Pollinations',
    enabled: true,
    baseURL: 'https://text.pollinations.ai/openai/v1/chat/completions',
    apiKey: '38DJtIV7dXrRdYNl',
    defaultModel: 'deepseek',
    models: {
        'openai': 'OpenAI',
        'openai-fast': 'OpenAI Fast',
        'openai-large': 'OpenAI Large',
        'openai-reasoning': 'GPT o4',
        'gemini': 'Gemini flash',
        'evil': 'Evil',
        'mistral': 'Mistral AI',
        'deepseek': 'DeepSeek',
        'deepseek-reasoning': 'DeepSeek R1'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {API_KEY}',
      'X-Title': 'AI Clone'
    }
  },

  // 8) Chat Anywhere
  chatanywhere: {
      name: 'Chat Anywhere',
      enabled: false,
      baseURL: 'https://api.chatanywhere.tech/v1/chat/completions',
      apiKey: 'sk-tPKcHK1b3gkjJ0873tB7btBlIbbW2nnaEb54L8YNS6KmbxB0', 
      defaultModel: 'deepseek-v3', 
      models: {
          'gpt-3.5-turbo': 'GPT-3.5 Turbo',
          'gpt-4o': 'GPT-4o',
          'gpt-4o-mini': 'GPT-4o Mini',
          'gpt-4.1': 'GPT-4.1',
          'gpt-4.1-mini': 'GPT-4.1 Mini',
          'gpt-4.1-nano': 'GPT-4.1 Nano',
          'gpt-5': 'GPT-5',
          'gpt-5-mini': 'GPT-5 Mini',
          'gpt-5-nano': 'GPT-5 Nano',
          'deepseek-v3': 'DeepSeek V3 Lite',
          'deepseek-r1': 'DeepSeek R1 Lite'
      },
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {API_KEY}'
      }
  },
  
  // 9) ModelScope
  modelscope: {
      name: 'ModelScope',
      enabled: false,
      baseURL: 'https://api-inference.modelscope.cn/v1/chat/completions',
      apiKey: 'ms-1fc29858-708b-43ff-90a1-26a05483c77b', 
      defaultModel: 'deepseek-ai/DeepSeek-V3.1', 
      models: {
          'deepseek-ai/DeepSeek-V3':'DeepSeek V3',
          'deepseek-ai/DeepSeek-V3.1':'DeepSeek-V3.1',
          'deepseek-ai/DeepSeek-R1':'DeepSeek-R1',
          'Qwen/Qwen3-30B-A3B-Thinking-2507':'通义千问 3.0 mini',
          'Qwen/Qwen3-235B-A22B-Instruct-2507':'通义千问 3.0',
          'Qwen/Qwen3-235B-A22B-Thinking-2507':'通义千问 3.0 推理版',
          'ZhipuAI/GLM-4.5':'GLM-4.5'
      },
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {API_KEY}'
      }
  },

  // 10) Groq
  groq: {
      name: 'groq',
      enabled: false,
      baseURL: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: '', 
      defaultModel: 'moonshotai/kimi-k2-instruct-0905', 
      models: {
          'openai/gpt-oss-20b':'GPT-OSS mini',
          'openai/gpt-oss-120b':'GPT-OSS',
          'moonshotai/kimi-k2-instruct-0905':'Kimi K2'
      },
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer {API_KEY}'
      }
  },  

};
export interface ModelOption {
  value: string;
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  category: 'latest' | 'standard' | 'legacy';
  description?: string;
  isRecommended?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // Latest OpenAI Models (User specified models)
  {
    value: 'gpt-5-nano-2025-08-07',
    label: 'GPT-5 Nano (Latest)',
    provider: 'openai',
    category: 'latest',
    description: 'Most recent, optimized for speed and cost',
    isRecommended: true
  },
  {
    value: 'gpt-5-mini-2025-08-07',
    label: 'GPT-5 Mini (Latest)',
    provider: 'openai',
    category: 'latest',
    description: 'Enhanced capabilities with balanced performance'
  },
  {
    value: 'gpt-4.1-2025-04-14',
    label: 'GPT-4.1 (Latest)',
    provider: 'openai',
    category: 'latest',
    description: 'Improved performance and accuracy'
  },
  {
    value: 'o4-mini-2025-04-16',
    label: 'O4 Mini (Latest)',
    provider: 'openai',
    category: 'latest',
    description: 'Efficient processing for automation tasks'
  },
  {
    value: 'gpt-4o-mini-2024-07-18',
    label: 'GPT-4o Mini',
    provider: 'openai',
    category: 'standard',
    description: 'Reliable standard model'
  },
  // Standard OpenAI Models (maintaining backward compatibility)
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    category: 'standard',
    description: 'Standard high-performance model'
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini (Legacy)',
    provider: 'openai',
    category: 'legacy',
    description: 'Previous default model'
  },
  {
    value: 'gpt-4',
    label: 'GPT-4',
    provider: 'openai',
    category: 'legacy',
    description: 'Previous generation model'
  },
  // Anthropic Models
  {
    value: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet (Latest)',
    provider: 'anthropic',
    category: 'latest',
    description: 'Anthropic\'s latest model'
  },
  {
    value: 'claude-3-5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    category: 'standard',
    description: 'High-performance Anthropic model'
  },
  {
    value: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    provider: 'anthropic',
    category: 'standard',
    description: 'Balanced performance model'
  },
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    provider: 'anthropic',
    category: 'standard',
    description: 'Fast and efficient model'
  },
  // Google Models
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Latest)',
    provider: 'google',
    category: 'latest',
    description: 'Google\'s latest model'
  },
  {
    value: 'gemini-pro',
    label: 'Gemini Pro',
    provider: 'google',
    category: 'standard',
    description: 'Google\'s advanced model'
  },
  {
    value: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'google',
    category: 'standard',
    description: 'Enhanced Gemini model'
  }
];

// Helper functions
export const getModelsByProvider = (provider: string): ModelOption[] => {
  return AVAILABLE_MODELS.filter(model => model.provider === provider);
};

export const getModelsByCategory = (category: string): ModelOption[] => {
  return AVAILABLE_MODELS.filter(model => model.category === category);
};

export const getDefaultModel = (provider: string): string => {
  const providerModels = getModelsByProvider(provider);
  const recommendedModel = providerModels.find(model => model.isRecommended);
  const latestModel = providerModels.find(model => model.category === 'latest');
  return recommendedModel?.value || latestModel?.value || providerModels[0]?.value || 'gpt-5-nano-2025-08-07';
};

export const getModelLabel = (modelValue: string): string => {
  const model = AVAILABLE_MODELS.find(m => m.value === modelValue);
  return model?.label || modelValue;
};

export const getModelDescription = (modelValue: string): string => {
  const model = AVAILABLE_MODELS.find(m => m.value === modelValue);
  return model?.description || '';
};

// Legacy compatibility - maintain existing model options for backward compatibility
export const LEGACY_MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4', label: 'GPT-4' }
  ],
  anthropic: [
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ]
};

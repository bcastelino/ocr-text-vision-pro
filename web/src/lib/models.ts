export interface VisionModel {
  id: string;
  label: string;
  context: string;
  strengths: string;
  tier: 'free' | 'paid' | 'universal';
  inputCostPerMillion: string;
  outputCostPerMillion: string;
}

export const AVAILABLE_MODELS: VisionModel[] = [
  {
    id: 'openrouter/free',
    label: 'OpenRouter: Free Auto Router',
    context: 'Varies',
    strengths: 'Automatically selects the best free model for each request based on required features',
    tier: 'free',
    inputCostPerMillion: '$0.00',
    outputCostPerMillion: '$0.00',
  },
  {
    id: 'nvidia/nemotron-nano-12b-v2-vl:free',
    label: 'NVIDIA: Nemotron Nano 12B 2 VL',
    context: '128K',
    strengths: '#1 on OCRBench v2 — best for OCR, DocVQA, ChartQA',
    tier: 'free',
    inputCostPerMillion: '$0.00',
    outputCostPerMillion: '$0.00',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    label: 'Google: Gemma 3 27B',
    context: '131K',
    strengths: 'General vision-language, multilingual (140+ langs)',
    tier: 'free',
    inputCostPerMillion: '$0.00',
    outputCostPerMillion: '$0.00',
  },
  {
    id: 'mistralai/mistral-small-3.1-24b-instruct:free',
    label: 'Mistral: Mistral Small 3.1 24B',
    context: '128K',
    strengths: 'Image analysis, reasoning, code, math, multilingual',
    tier: 'free',
    inputCostPerMillion: '$0.00',
    outputCostPerMillion: '$0.00',
  },
  {
    id: 'meta-llama/llama-3.2-11b-vision-instruct',
    label: 'Meta: Llama 3.2 11B Vision Instruct',
    context: '131K',
    strengths: 'Multimodal image reasoning, captioning, and visual question answering',
    tier: 'paid',
    inputCostPerMillion: '$0.245',
    outputCostPerMillion: '$0.245',
  },
  {
    id: 'qwen/qwen3-vl-32b-instruct',
    label: 'Qwen: Qwen3 VL 32B Instruct',
    context: '131K',
    strengths: 'High-precision multimodal understanding across text, images, and video',
    tier: 'paid',
    inputCostPerMillion: '$0.104',
    outputCostPerMillion: '$0.416',
  },
  {
    id: 'openrouter/auto',
    label: 'OpenRouter: Auto Router',
    context: '2M',
    strengths: 'Automatically selects a suitable model optimizing for the best possible output.',
    tier: 'universal',
    inputCostPerMillion: 'Varies',
    outputCostPerMillion: 'Varies',
  },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;

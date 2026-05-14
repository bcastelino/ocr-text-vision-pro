export type ExtractMode =
  | 'General Text Extraction'
  | 'LaTeX Equation Conversion'
  | 'Code Snippet Extraction'
  | 'Chart/Diagram Description';

export const EXTRACT_MODES: ExtractMode[] = [
  'General Text Extraction',
  'LaTeX Equation Conversion',
  'Code Snippet Extraction',
  'Chart/Diagram Description',
];

export const EXTRACT_MODE_DESCRIPTIONS: Record<ExtractMode, string> = {
  'General Text Extraction': 'Extract all readable text and structure it as Markdown.',
  'LaTeX Equation Conversion': 'Convert equations to raw LaTeX with live rendering.',
  'Code Snippet Extraction': 'Pull code from screenshots into formatted code blocks.',
  'Chart/Diagram Description': 'Summarise charts, diagrams and visual data.',
};

export function imagePromptForMode(mode: ExtractMode): string {
  switch (mode) {
    case 'General Text Extraction':
      return 'Analyze the text in the provided image. Extract all readable content and present it in a structured Markdown format that is clear, concise, and well-organized. Ensure proper formatting (e.g., headings, lists, or code blocks) as necessary to represent the content effectively.';
    case 'LaTeX Equation Conversion':
      return "Understand the mathematical equation in the provided image and output the corresponding LaTeX code. NEVER include any additional text or explanations. DON'T add dollar signs ($) around the LaTeX code. DO NOT extract simplified versions of the equations. NEVER add documentclass, packages or begindocument. DO NOT explain the symbols used in the equation. Output only the LaTeX code corresponding to the mathematical equations in the image.";
    case 'Code Snippet Extraction':
      return 'Extract all code from the provided image. Present the code in a formatted code block suitable for direct use. Do not include any additional text or explanations.';
    case 'Chart/Diagram Description':
      return 'Describe the chart or diagram in the provided image. Explain its key elements, data, and any trends or insights it presents in a clear, concise manner.';
  }
}

export function pdfPromptForMode(mode: ExtractMode): string {
  switch (mode) {
    case 'General Text Extraction':
      return 'Analyze ALL the provided PDF page images. Extract all readable text from every page and present it in a structured Markdown format that is clear, concise, and well-organized. Ensure proper formatting (e.g., headings, lists, or code blocks) as necessary. Clearly indicate page boundaries.';
    case 'LaTeX Equation Conversion':
      return "Examine ALL the provided PDF page images. Extract every mathematical equation and output the corresponding LaTeX code. NEVER include any additional text or explanations. DON'T add dollar signs ($) around the LaTeX code. DO NOT extract simplified versions of the equations. NEVER add documentclass, packages or begindocument. Output only the LaTeX code.";
    case 'Code Snippet Extraction':
      return 'Examine ALL the provided PDF page images. Extract all code from every page. Present the code in formatted code blocks suitable for direct use. Do not include any additional text or explanations.';
    case 'Chart/Diagram Description':
      return 'Examine ALL the provided PDF page images. Describe every chart or diagram found across the pages. Explain key elements, data, and any trends or insights in a clear, concise manner. Indicate which page each chart appears on.';
  }
}

export type AnalysisScope = 'Document Intelligence' | 'Visual Question Answering';

export function askPrompt(scope: AnalysisScope, question: string): string {
  if (scope === 'Document Intelligence') {
    return `Analyze the provided document image and respond to the following request: ${question}. Present the answer in a clear, structured Markdown format.`;
  }
  return `Based on the provided image, answer the following question: ${question}`;
}

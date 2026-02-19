
import { ComplexityData } from './types';
import topicData from './src/data/current_topic.json';

// Default config if JSON is missing or invalid
const DEFAULT_CONFIG = {
  title: "BIG O NOTATION",
  tagline: "Visualizing Algorithm Complexity",
  xAxisLabel: "Input Size (N)",
  yAxisLabel: "Operations / Time",
  curves: [
    {
      id: 'constant',
      name: 'Constant Time',
      label: 'O(1)',
      color: '#10b981',
      formula: "5",
      code: `function getElement(arr, index) {\n  // Access is O(1)\n  return arr[index];\n}`
    },
    {
      id: 'logarithmic',
      name: 'Logarithmic Time',
      label: 'O(log n)',
      color: '#84cc16',
      formula: "Math.log2(n + 1) * 6 + 10",
      code: `function binarySearch(arr, target) {\n  let l = 0, r = arr.length - 1;\n  while (l <= r) {\n    let m = (l + r) >> 1;\n    if (arr[m] === target) return m;\n    arr[m] < target ? l = m + 1 : r = m - 1;\n  }\n}`
    },
    // ... add more defaults if needed, or just rely on the JSON being present
  ]
};

// Use topic data or default
const activeData = topicData || DEFAULT_CONFIG;

export const VISUALIZATION_CONFIG = {
  title: activeData.title || DEFAULT_CONFIG.title,
  tagline: activeData.tagline || DEFAULT_CONFIG.tagline,
  xAxisLabel: activeData.xAxisLabel || DEFAULT_CONFIG.xAxisLabel,
  yAxisLabel: activeData.yAxisLabel || DEFAULT_CONFIG.yAxisLabel,
};

// Helper to convert string formula to function safely
const createFormula = (formulaStr: string) => {
  try {
    // If it's an arrow function "n => ...", extract the body
    let body = formulaStr.trim();
    if (body.startsWith('n =>')) {
      body = body.substring(4).trim();
    } else if (body.startsWith('(n) =>')) {
      body = body.substring(6).trim();
    }

    // Wrap with common Math functions for convenience
    return (n: number) => {
      // Safe context with Math functions exposed
      const { log2, log10, log, sqrt, pow, min, max, floor, ceil, abs, sin, cos, tan, PI, E } = Math;
      // We use a Function constructor to evaluate. 
      // This is safe-ish for this local app context.
      // We pass 'n' and params
      try {
        // Simple eval-like behavior restricted to math
        // Using new Function is cleaner than eval
        const func = new Function('n', 'Math', `with(Math) { return (${body}); }`);
        let val = func(n, Math);
        // Clamp for safety if needed, or let visualizer handle it
        return Number(val) || 0;
      } catch (e) {
        console.warn(`Formula error for "${formulaStr}":`, e);
        return 0;
      }
    };
  } catch (e) {
    return () => 0;
  }
};

export const COMPLEXITIES: ComplexityData[] = (activeData.curves || DEFAULT_CONFIG.curves).map((c: any) => ({
  id: c.id,
  name: c.name || c.label, // Fallback name
  label: c.label,
  color: c.color,
  formula: createFormula(c.formula),
  code: c.code
}));

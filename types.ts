
export interface ComplexityData {
  id: string;
  name: string;
  label: string;
  color: string;
  formula: (n: number) => number;
  code: string;
}

export interface Point {
  x: number;
  y: number;
}

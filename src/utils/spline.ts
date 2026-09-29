// Fritsch-Carlson Monotone Cubic Hermite Spline
// Guarantees zero overshoot/wobble and perfectly smooth C1 continuous motion

export interface SplinePoint {
  x: number;
  y: number;
  val: number;
}

export class MonotoneCubicSpline {
  private xs: number[];
  private ys: number[];
  private ms: number[]; // slopes at knots

  constructor(points: { x: number; y: number }[]) {
    const n = points.length;
    this.xs = new Array(n);
    this.ys = new Array(n);
    this.ms = new Array(n);

    for (let i = 0; i < n; i++) {
      this.xs[i] = points[i].x;
      this.ys[i] = points[i].y;
    }

    if (n <= 1) {
      this.ms[0] = 0;
      return;
    }

    // Step 1: Compute secant slopes
    const deltas: number[] = new Array(n - 1);
    const slopes: number[] = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const dx = this.xs[i + 1] - this.xs[i];
      const dy = this.ys[i + 1] - this.ys[i];
      deltas[i] = dx;
      slopes[i] = dx !== 0 ? dy / dx : 0;
    }

    // Step 2: Initialize tangents as averages of secants
    this.ms[0] = slopes[0];
    for (let i = 1; i < n - 1; i++) {
      if (slopes[i - 1] * slopes[i] <= 0) {
        this.ms[i] = 0;
      } else {
        this.ms[i] = (slopes[i - 1] + slopes[i]) / 2;
      }
    }
    this.ms[n - 1] = slopes[n - 2];

    // Step 3: Fritsch-Carlson slope clamping for monotonicity
    for (let i = 0; i < n - 1; i++) {
      if (slopes[i] === 0) {
        this.ms[i] = 0;
        this.ms[i + 1] = 0;
      } else {
        const alpha = this.ms[i] / slopes[i];
        const beta = this.ms[i + 1] / slopes[i];
        const s = alpha * alpha + beta * beta;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          this.ms[i] = tau * alpha * slopes[i];
          this.ms[i + 1] = tau * beta * slopes[i];
        }
      }
    }
  }

  // Evaluate Y coordinate at continuous X position
  public evalY(x: number): number {
    const n = this.xs.length;
    if (n === 0) return 0;
    if (n === 1 || x <= this.xs[0]) return this.ys[0];
    if (x >= this.xs[n - 1]) return this.ys[n - 1];

    // Binary search for interval
    let low = 0;
    let high = n - 2;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.xs[mid + 1] < x) {
        low = mid + 1;
      } else if (this.xs[mid] > x) {
        high = mid - 1;
      } else {
        low = mid;
        break;
      }
    }

    const i = Math.min(Math.max(low, 0), n - 2);
    const h = this.xs[i + 1] - this.xs[i];
    if (h === 0) return this.ys[i];

    const t = (x - this.xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return (
      h00 * this.ys[i] +
      h10 * h * this.ms[i] +
      h01 * this.ys[i + 1] +
      h11 * h * this.ms[i + 1]
    );
  }

  // Evaluate instantaneous slope (dy/dx) at X
  public evalSlope(x: number): number {
    const n = this.xs.length;
    if (n <= 1) return 0;
    if (x <= this.xs[0]) return this.ms[0];
    if (x >= this.xs[n - 1]) return this.ms[n - 1];

    let low = 0;
    let high = n - 2;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.xs[mid + 1] < x) low = mid + 1;
      else if (this.xs[mid] > x) high = mid - 1;
      else { low = mid; break; }
    }

    const i = Math.min(Math.max(low, 0), n - 2);
    const h = this.xs[i + 1] - this.xs[i];
    if (h === 0) return 0;

    const t = (x - this.xs[i]) / h;
    const t2 = t * t;

    // Derivatives of Hermite basis
    const dh00 = 6 * t2 - 6 * t;
    const dh10 = 3 * t2 - 4 * t + 1;
    const dh01 = -6 * t2 + 6 * t;
    const dh11 = 3 * t2 - 2 * t;

    return (
      (dh00 * this.ys[i] +
        dh10 * h * this.ms[i] +
        dh01 * this.ys[i + 1] +
        dh11 * h * this.ms[i + 1]) /
      h
    );
  }
}

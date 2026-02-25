export type VelocityMark = "ghost" | "normal" | "accent";

export function velocityToMark(v: number): VelocityMark {
  if (v < 0.35) return "ghost";
  if (v > 0.85) return "accent";
  return "normal";
}
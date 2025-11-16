export interface AnimationKeyframe {
  [key: string]: string | number | undefined;
}

export function buildKeyframes(
  from: AnimationKeyframe,
  steps: AnimationKeyframe[]
): Record<string, (string | number)[]> {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap(s => Object.keys(s))
  ]);

  const keyframes: Record<string, (string | number)[]> = {};
  keys.forEach(k => {
    const fromValue = from[k] ?? 0;
    const stepValues = steps.map(s => s[k] ?? 0);
    keyframes[k] = [fromValue, ...stepValues];
  });
  return keyframes;
}


import { ensureArray } from './array';

export function parseSlotParams(
  args: unknown[],
  params: string[]
): Record<string, unknown> {
  const slotParams: Record<string, unknown> = {};
  ensureArray(params).forEach((item, idx) => {
    slotParams[item] = args[idx];
  });
  return slotParams;
}

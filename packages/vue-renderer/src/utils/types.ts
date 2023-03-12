import type { ExtractDefaultPropTypes, ExtractPropTypes } from 'vue';

export type ExtractPublicPropTypes<T> = Omit<
  ExtractPropTypes<T>,
  keyof ExtractDefaultPropTypes<T>
> &
  Partial<ExtractDefaultPropTypes<T>>;

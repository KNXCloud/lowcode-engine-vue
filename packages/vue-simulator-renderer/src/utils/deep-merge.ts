import { isObject } from '@knxcloud/lowcode-utils';

export function deepMerge<TL, TR>(o1: TL, o2: TR): TL & TR {
  if (isObject(o1) && isObject(o2)) {
    const result = Object.assign({}, o1);
    Object.keys(o2).forEach((key) => {
      Reflect.set(result, key, deepMerge(o1[key], o2[key]));
    });
    return result as TL & TR;
  }
  return (o2 ?? o1) as TL & TR;
}

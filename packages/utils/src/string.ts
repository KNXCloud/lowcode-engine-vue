/**
 * 将驼峰命名法的字符串转化为中划线连接的字符串
 *
 * @example
 *
 * const res = kebabCase('userName'); // user-name
 *
 * @param str - 被转换的字符串
 */
export function kebabCase(str: string): string {
  if (!str) return str;
  return str.replace(/[A-Z]/g, (c, i) => {
    const suf = i > 0 ? '-' : '';
    return suf + c.toLocaleLowerCase();
  });
}

/**
 * 将中划线连接的字符串转化为小驼峰命名法
 *
 * @example
 *
 * const res = camelCase('user-name'); // userName
 *
 * @param str - 被转换的字符串
 */
export function camelCase(str: string): string {
  if (!str) return str;
  return str.replace(/-[a-zA-Z]/g, (c) => {
    return c.charAt(1).toLocaleUpperCase();
  });
}

/**
 * 将中划线连接的字符串转化为大驼峰命名法
 *
 * @example
 *
 * const res = pascalCase('user-name'); // UserName
 *
 * @param str - 被转换的字符串
 */
export function pascalCase(str: string): string {
  const res = camelCase(str);
  return res && res.charAt(0).toLocaleUpperCase() + res.slice(1);
}

import IntlMessageFormat from 'intl-messageformat';

export type I18nMessages = {
  [locale: string]: Record<string, string>;
};

/**
 * 用于处理国际化字符串
 * @param key - 语料标识
 * @param values -  字符串模版变量
 * @param locale - 国际化标识，例如 zh-CN、en-US
 * @param messages - 国际化语言包
 */
export function getI18n(
  key: string,
  values = {},
  locale = 'zh-CN',
  messages: I18nMessages = {}
) {
  if (!messages || !messages[locale] || !messages[locale][key]) {
    return '';
  }
  const formater = new IntlMessageFormat(messages[locale][key], locale);
  return formater.format(values);
}

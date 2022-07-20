export type ResponseType = 'blob' | 'arrayBuffer' | 'formData' | 'text' | 'json';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';

export interface RequestOptions {
  uri: string;
  params: Record<string, unknown>;
  method: RequestMethod;
  isCors: boolean;
  timeout: number;
  headers: Record<string, string>;
  responseType?: ResponseType;
}

export enum DataSourceStatus {
  /** 初始状态，尚未加载 */
  Initial = 'init',
  /** 正在加载 */
  Loading = 'loading',
  /** 已加载(无错误) */
  Loaded = 'loaded',
  /** 加载出错了 */
  Error = 'error',
}

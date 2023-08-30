import {
  DataHandler,
  ErrorHandler,
  WillFetch,
  RuntimeOptions,
  CustomRequestHandler,
} from '@alilc/lowcode-types';

export type ReturnValueFunc<T> = (...args: unknown[]) => T;
// eslint-disable-next-line @typescript-eslint/ban-types
export type MaybyFunc<T = unknown> = ReturnValueFunc<T> | T;

export interface DataSourceOptions {
  list: DataSourceConfig[];
  dataHandler?: DataHandler;
}

export interface DataSourceConfig {
  id: string;
  type?: string;
  isInit?: MaybyFunc<boolean>;
  isSync?: MaybyFunc<boolean>;
  requestHandler?: CustomRequestHandler;
  dataHandler?: DataHandler;
  errorHandler?: ErrorHandler;
  willFetch?: WillFetch;
  shouldFetch?: ReturnValueFunc<boolean>;
  options: RuntimeOptions;
  [otherKey: string]: unknown;
}

export type DataSourceStatus = 'init' | 'loading' | 'loaded' | 'error';

export type DataSourceLoader<T = unknown> = (
  params?: Record<string, unknown>,
  options?: Record<string, unknown>,
) => Promise<T>;

export interface DataSource<T = unknown> {
  data: T;
  error: unknown;
  loading: boolean;
  status: DataSourceStatus;
  isInit: boolean;
  isSync: boolean;
  load: DataSourceLoader<T>;
}

export interface DataSourceContext<TState = Record<string, unknown>> {
  state: TState;
  setState(state: TState): void;
  forceUpdate(): void;
}

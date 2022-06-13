import { InterpretDataSource, InterpretDataSourceConfig } from '@alilc/lowcode-types';
import { computed, reactive, ref, shallowRef } from 'vue';
import { parseSchema } from '../utils';
import { DataSourceStatus } from './interface';
import { request } from './request';

const same = (v: any) => v;
const noop = () => void 0;
const alwaysTrue = () => true;

export interface DataSource<T = any> {
  data: T;
  error: unknown;
  loading: boolean;
  status: DataSourceStatus;
  isInit: boolean;
  load(params?: any): Promise<T>;
}

export function createDataSource(
  config: InterpretDataSourceConfig,
  request: CallableFunction,
  scope: any
): DataSource {
  const data = shallowRef<unknown>();
  const error = shallowRef<unknown>();
  const loading = ref<boolean>(false);
  const status = ref<DataSourceStatus>(DataSourceStatus.Initial);
  const isInit = computed<boolean>(() => parseSchema(config.isInit, scope));

  const { willFetch, shouldFetch, dataHandler, errorHandler } = config;

  const hooks = {
    willFetch: willFetch ? parseSchema(willFetch, scope) : same,
    shouldFetch: shouldFetch ? parseSchema(shouldFetch, scope) : alwaysTrue,
    dataHandler: dataHandler ? parseSchema(dataHandler, scope) : (res: any) => res.data,
    errorHandler: errorHandler ? parseSchema(errorHandler, scope) : noop,
  };

  const load = async (inputParams?: any) => {
    const { type, options, id } = config;
    if (type !== 'fetch') {
      throw new Error('unsupport fetch type: ' + type);
    }

    const shouldFetch =
      typeof hooks.shouldFetch === 'function'
        ? hooks.shouldFetch()
        : typeof hooks.shouldFetch === 'boolean'
        ? hooks.shouldFetch
        : true;

    if (!shouldFetch) {
      status.value = DataSourceStatus.Error;
      error.value = new Error(
        `the ${id} request should not fetch, please check the condition`
      );
      throw error.value;
    }

    let fetchOptions = { ...options };
    fetchOptions.params = parseSchema(fetchOptions.params, scope) ?? {};
    fetchOptions.headers = parseSchema(fetchOptions.headers, scope) ?? {};
    inputParams && Object.assign(fetchOptions.params!, inputParams);

    fetchOptions = hooks.willFetch(fetchOptions);

    status.value = DataSourceStatus.Loading;
    try {
      const res = await request(fetchOptions);
      status.value = DataSourceStatus.Loaded;
      const _data = (data.value = hooks.dataHandler(res));
      if (_data) {
        if (id in scope) {
          Object.assign(scope[id], _data);
        } else {
          scope[id] = _data;
        }
      }
      return _data;
    } catch (err) {
      status.value = DataSourceStatus.Error;
      hooks.errorHandler(err);
      throw err;
    }
  };

  return reactive({
    data,
    error,
    loading,
    status,
    isInit,
    load,
  });
}

export function createDataSourceManager(
  { list, dataHandler }: InterpretDataSource,
  scope: any
) {
  const dataSourceMap = list.reduce((prev, next) => {
    prev[next.id] = createDataSource({ dataHandler, ...next }, request, scope);
    return prev;
  }, {} as Record<string, DataSource>);

  const reloadDataSource = () => {
    const promises = Object.keys(dataSourceMap)
      .map((id) => dataSourceMap[id])
      .filter((ds) => ds.isInit)
      .map((ds) => ds.load());
    return Promise.all(promises);
  };

  return { dataSourceMap, reloadDataSource };
}

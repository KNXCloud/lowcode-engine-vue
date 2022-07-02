import { InterpretDataSource, InterpretDataSourceConfig } from '@alilc/lowcode-types';
import { computed, reactive, ref, shallowRef } from 'vue';
import { request } from './request';
import { parseSchema } from '../utils';
import { DataSourceStatus } from './interface';

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
  request: CallableFunction | null,
  scope: any
): DataSource {
  const data = shallowRef<unknown>();
  const error = shallowRef<unknown>();
  const status = ref<DataSourceStatus>(DataSourceStatus.Initial);
  const loading = computed(() => status.value === DataSourceStatus.Loading);
  const isInit = computed<boolean>(() => parseSchema(config.isInit, scope));

  const { willFetch, shouldFetch, dataHandler, errorHandler } = config;

  const hooks = {
    willFetch: willFetch ? parseSchema(willFetch, scope) : same,
    shouldFetch: shouldFetch ? parseSchema(shouldFetch, scope) : alwaysTrue,
    dataHandler: dataHandler ? parseSchema(dataHandler, scope) : (res: any) => res.data,
    errorHandler: errorHandler ? parseSchema(errorHandler, scope) : noop,
  };

  const load = async (inputParams?: any) => {
    try {
      const { type, options, id } = config;
      if (!request) {
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
        throw new Error(`the ${id} request should not fetch, please check the condition`);
      }

      const fetchOptions = parseSchema(options, scope) ?? {};
      if (inputParams) {
        Object.assign(fetchOptions.params, inputParams);
      }
      status.value = DataSourceStatus.Loading;
      const res = await request(hooks.willFetch(fetchOptions));
      status.value = DataSourceStatus.Loaded;
      const _data = (data.value = hooks.dataHandler(res));
      return _data && (scope[id] = _data);
    } catch (err) {
      status.value = DataSourceStatus.Error;
      error.value = err;
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

  /**
   * 重新加载数据源，仅加载 isInit 为 true 的数据源
   */
  const reloadDataSource = () => {
    const promises = Object.keys(dataSourceMap)
      .map((id) => dataSourceMap[id])
      .filter((ds) => ds.isInit)
      .map((ds) => ds.load());
    return Promise.all(promises);
  };

  return { dataSourceMap, reloadDataSource };
}

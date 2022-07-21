import { InterpretDataSource, InterpretDataSourceConfig } from '@alilc/lowcode-types';
import { computed, reactive, ref, shallowRef } from 'vue';
import { isBoolean, isFunction, isUndefined } from 'lodash-es';
import { request, Response } from './request';
import { DataSourceStatus, RequestParams } from './interface';
import { isPlainObject, parseSchema, RuntimeScope } from '../utils';

const same = <T>(v: T) => v;
const noop = () => void 0;
const alwaysTrue = () => true;

export type ExecutionFunc<T = unknown> = (
  params?: RequestParams,
  otherOptions?: Record<string, unknown>
) => Promise<T>;

export interface DataSourceItem<T = unknown> {
  data: T;
  error: unknown;
  loading: boolean;
  status: DataSourceStatus;
  isInit: boolean;
  load: ExecutionFunc<T>;
}

export function createDataSourceItem(
  config: InterpretDataSourceConfig,
  request: CallableFunction | null,
  scope: RuntimeScope
): DataSourceItem {
  const data = shallowRef<unknown>();
  const error = shallowRef<unknown>();
  const status = ref<DataSourceStatus>(DataSourceStatus.Initial);
  const loading = computed(() => status.value === DataSourceStatus.Loading);
  const isInit = computed<boolean>(() => !!parseSchema(config.isInit, scope));

  const { willFetch, shouldFetch, dataHandler, errorHandler } = config;

  const hooks = {
    willFetch: willFetch ? parseSchema(willFetch, scope) : same,
    shouldFetch: shouldFetch ? parseSchema(shouldFetch, scope) : alwaysTrue,
    dataHandler: dataHandler
      ? parseSchema(dataHandler, scope)
      : (res: Response) => res.data,
    errorHandler: errorHandler ? parseSchema(errorHandler, scope) : noop,
  };

  const load: ExecutionFunc = async (inputParams, otherOptions) => {
    try {
      const { type, options, id } = config;
      const {
        headers: inputHeaders,
        assignToScope,
        ...inputOptions
      } = otherOptions ?? {};
      if (!request) {
        throw new Error('unsupport fetch type: ' + type);
      }

      const shouldFetch = isFunction(hooks.shouldFetch)
        ? hooks.shouldFetch()
        : isBoolean(hooks.shouldFetch)
        ? hooks.shouldFetch
        : true;

      if (!shouldFetch) {
        status.value = DataSourceStatus.Error;
        throw new Error(`the ${id} request should not fetch, please check the condition`);
      }

      const {
        params: parsedParams,
        headers: parsedHeaders,
        ...parsedOptions
      } = parseSchema(options ?? {}, scope);

      status.value = DataSourceStatus.Loading;
      const res = await request(
        hooks.willFetch({
          ...parsedOptions,
          ...inputOptions,
          headers: {
            ...(parsedHeaders as object),
            ...(inputHeaders as object),
          },
          params:
            isPlainObject(parsedParams) && isPlainObject(inputParams)
              ? {
                  ...parsedParams,
                  ...inputParams,
                }
              : inputParams ?? parsedParams,
        })
      );
      status.value = DataSourceStatus.Loaded;
      const _data = (data.value = hooks.dataHandler(res));
      if (!isUndefined(data) && assignToScope) {
        scope[id] = _data;
      }
      return _data;
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
  scope: RuntimeScope
) {
  const dataSource: Record<string, ExecutionFunc> = {};
  const dataSourceMap: Record<string, DataSourceItem> = {};

  list.forEach((next) => {
    const config = { dataHandler, ...next };
    const dataSourceItem = createDataSourceItem(config, request, scope);

    const func: ExecutionFunc = (params, otherOptions) => {
      const mergedOptions = {
        assignToScope: false,
        ...otherOptions,
      };
      return dataSourceItem.load(params, mergedOptions);
    };

    dataSource[next.id] = func;
    dataSourceMap[next.id] = dataSourceItem;
  });

  /**
   * 重新加载数据源
   *
   * - 若传入 id 则加载对应 id 的数据源
   * - 若不传入 id，则加载 isInit 为 true 的数据源
   */
  const reloadDataSource = (
    id?: string,
    params?: RequestParams,
    otherOptions?: Record<string, unknown>
  ) => {
    if (id) {
      const dataSource = dataSourceMap[id];
      if (!dataSource) {
        throw new Error('dataSource not found, id: ' + id);
      }
      return dataSource.load(params, otherOptions);
    }
    const promises = Object.keys(dataSourceMap)
      .map((id) => dataSourceMap[id])
      .filter((ds) => ds.isInit)
      .map((ds) => ds.load());
    return Promise.all(promises);
  };

  return { dataSource, dataSourceMap, reloadDataSource };
}

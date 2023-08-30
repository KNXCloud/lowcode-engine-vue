import { RequestHandler, RequestHandlersMap } from '@alilc/lowcode-types';
import {
  DataSource,
  DataSourceConfig,
  DataSourceContext,
  DataSourceLoader,
  DataSourceStatus,
  MaybyFunc,
} from './interface';
import { computed, reactive, ref, shallowRef } from 'vue';
import { isFunction, isPlainObject, isUndefined } from '@knxcloud/lowcode-utils';
import { fetchRequest } from '../handlers';

export function createDataSource(
  config: DataSourceConfig,
  { state, setState }: DataSourceContext,
  requestHandlersMap: RequestHandlersMap,
): DataSource {
  const data = shallowRef<unknown>();
  const error = shallowRef<unknown>();
  const status = ref<DataSourceStatus>('init');
  const loading = computed(() => status.value === 'loading');
  const isInit = computed<boolean>(() =>
    config.isInit ? exec(config.isInit, state) : false,
  );
  const isSync = computed<boolean>(() =>
    config.isSync ? exec(config.isSync, state) : false,
  );

  const {
    willFetch = same,
    shouldFetch = alwaysTrue,
    dataHandler = (res: unknown) => res && Reflect.get(res, 'data'),
    errorHandler = alwaysThrow,
  } = config;

  const load: DataSourceLoader = async (inputParams, otherOptions = {}) => {
    try {
      const { type, options, id } = config;
      const request = getRequestHandler(config, requestHandlersMap);
      if (!request) {
        throw new Error('unsupport fetch type: ' + type);
      }

      if (!shouldFetch()) {
        throw new Error(`the ${id} request should not fetch, please check the condition`);
      }

      const { inputHeaders = {}, assignToScope = true, ...inputOptions } = otherOptions;

      status.value = 'loading';
      const { params, headers, ...restOptions } = exec(options, state);
      const parsedOptions = await willFetch({
        ...restOptions,
        ...inputOptions,
        params:
          isPlainObject(params) && isPlainObject(inputParams)
            ? {
                ...params,
                ...inputParams,
              }
            : inputParams ?? params,
        headers: {
          ...(isPlainObject(headers) ? headers : {}),
          ...(isPlainObject(inputHeaders) ? inputHeaders : {}),
        },
      });
      const res = await request(parsedOptions, { state, setState });
      const _data = (data.value = dataHandler(res as any));
      if (!isUndefined(_data) && assignToScope) {
        setState({ [id]: _data });
      }
      status.value = 'loading';
      return _data;
    } catch (err) {
      status.value = 'error';
      error.value = err;
      errorHandler(err);
    }
  };

  return reactive({
    data,
    error,
    loading,
    status,
    isInit,
    isSync,
    load,
  });
}

const same = <T>(v: T) => v;
const alwaysTrue = () => true;
const alwaysThrow = (e: unknown) => {
  throw e;
};

function exec<T = unknown>(val: () => T, state?: unknown): T;
function exec<T = unknown>(val: MaybyFunc<T>, state?: unknown): T;
function exec<T = unknown>(val: MaybyFunc<T>, state?: unknown): T {
  if (isFunction(val)) {
    return val.call(state, state);
  } else if (isPlainObject(val)) {
    return Object.keys(val).reduce((res, next) => {
      Reflect.set(res!, next, exec(val[next], state));
      return res;
    }, {} as T);
  }
  return val as T;
}

function getRequestHandler(
  config: DataSourceConfig,
  requestHandlersMap: RequestHandlersMap,
): RequestHandler | null {
  const { type, requestHandler } = config;
  if (type) {
    if (type === 'custom' && requestHandler) {
      return requestHandler;
    } else {
      return type === 'fetch'
        ? requestHandlersMap[type] ?? fetchRequest
        : requestHandlersMap[type] ?? null;
    }
  }
  return fetchRequest;
}

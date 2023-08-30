import { RequestHandlersMap } from '@alilc/lowcode-types';
import {
  DataSourceOptions,
  DataSourceContext,
  DataSourceLoader,
  DataSource,
} from './interface';
import { createDataSource } from './data-source';

export function createDataSourceEngine(
  config: DataSourceOptions,
  context: DataSourceContext,
  requestHandlersMap: RequestHandlersMap = {},
) {
  const dataSource: Record<string, DataSourceLoader> = {};
  const dataSourceMap: Record<string, DataSource> = {};

  const { list, dataHandler } = config;

  for (const config of list) {
    const mergedConfig = { dataHandler, ...config };
    const _dataSource = createDataSource(mergedConfig, context, requestHandlersMap);

    const func: DataSourceLoader = (params, otherOptions) => {
      const mergedOptions = {
        assignToScope: false,
        ...otherOptions,
      };
      return _dataSource.load(params, mergedOptions);
    };

    dataSource[config.id] = func;
    dataSourceMap[config.id] = _dataSource;
  }

  /**
   * 重新加载数据源
   *
   * - 若传入 id 则加载对应 id 的数据源
   * - 若不传入 id，则加载 isInit 为 true 的数据源
   */
  const reloadDataSource = (
    id?: string,
    params?: Record<string, unknown>,
    otherOptions?: Record<string, unknown>,
  ) => {
    if (id) {
      const dataSource = dataSourceMap[id];
      if (!dataSource) {
        throw new Error('dataSource not found, id: ' + id);
      }
      return dataSource.load(params, otherOptions);
    }
    const syncItems: DataSource[] = [];
    const asyncItems: DataSource[] = [];

    Object.keys(dataSourceMap)
      .map((id) => dataSourceMap[id])
      .filter((ds) => ds.isInit)
      .forEach((ds) => {
        ds.isSync ? syncItems.push(ds) : asyncItems.push(ds);
      });

    const promises: Promise<unknown>[] = [
      ...asyncItems.map((ds) => ds.load()),
      syncItems.reduce(
        (res, next) => res.then(() => next.load()),
        Promise.resolve<unknown>(null),
      ),
    ];
    return Promise.all(promises);
  };

  const needInit = () =>
    Object.keys(dataSourceMap).some((id) => dataSourceMap[id].isInit);

  return { dataSource, dataSourceMap, reloadDataSource, shouldInit: needInit };
}

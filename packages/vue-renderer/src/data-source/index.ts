import {
  DataHandler,
  ErrorHandler,
  IPublicTypeJSExpression,
  IPublicTypeJSFunction,
  InterpretDataSource,
  RequestHandler,
  WillFetch,
} from '@alilc/lowcode-types';
import { DataSourceConfig, createDataSourceEngine } from '@knxcloud/lowcode-data-source';
import { AccessTypes, RuntimeScope, SchemaParser, addToScope } from '../utils';
import { isJSExpression, isJSFunction } from '@knxcloud/lowcode-utils';

export function create(
  config: InterpretDataSource,
  scope: RuntimeScope,
  requestHandlerMaps?: Record<string, RequestHandler>,
) {
  const parser = scope.__parser;

  const dataHandler = parser.parseSchema<DataHandler>(config.dataHandler, scope);
  const list = config.list.map(
    ({
      isInit = false,
      isSync = false,
      requestHandler,
      dataHandler,
      errorHandler,
      willFetch,
      shouldFetch,
      options,
      ...otherConfig
    }): DataSourceConfig => ({
      ...parser.parseSchema(otherConfig, scope),
      isInit: transformToJSFunction<boolean>(isInit, parser, scope),
      isSync: transformToJSFunction<boolean>(isSync, parser, scope),
      requestHandler: parser.parseSchema<RequestHandler>(requestHandler, scope),
      dataHandler: parser.parseSchema<DataHandler>(dataHandler, scope),
      errorHandler: parser.parseSchema<ErrorHandler>(errorHandler, scope),
      willFetch: parser.parseSchema<WillFetch>(willFetch, scope),
      shouldFetch: parser.parseSchema<() => boolean>(shouldFetch, scope),
      options: () => parser.parseSchema(options, scope),
    }),
  );
  return createDataSourceEngine(
    { list, dataHandler },
    {
      state: scope,
      setState(state) {
        const needAddScope: Record<string, unknown> = {};
        for (const key in state) {
          if (key in scope) {
            scope[key] = state[key];
          } else {
            needAddScope[key] = state[key];
          }
        }
        if (Object.keys(needAddScope).length > 0) {
          addToScope(scope, AccessTypes.CONTEXT, needAddScope);
          scope.$forceUpdate();
        }
      },
      forceUpdate: () => scope.$forceUpdate(),
    },
    requestHandlerMaps,
  );
}

function transformToJSFunction<T>(
  val: IPublicTypeJSFunction | T,
  parser: SchemaParser,
  scope: RuntimeScope,
): (() => T) | T;
function transformToJSFunction<T>(
  val: IPublicTypeJSExpression | T,
  parser: SchemaParser,
  scope: RuntimeScope,
): (() => T) | T;
function transformToJSFunction<T>(
  val: IPublicTypeJSExpression | IPublicTypeJSFunction | T,
  parser: SchemaParser,
  scope: RuntimeScope,
): (() => T) | T;
function transformToJSFunction<T>(
  val: IPublicTypeJSExpression | IPublicTypeJSFunction | T,
  parser: SchemaParser,
  scope: RuntimeScope,
): (() => T) | T {
  const res = isJSExpression(val)
    ? parser.parseSchema(
        {
          type: 'JSFunction',
          value: `function () { return ${val.value} }`,
        },
        scope,
      )
    : isJSFunction(val)
    ? parser.parseSchema(val, scope)
    : val;
  return res as (() => T) | T;
}

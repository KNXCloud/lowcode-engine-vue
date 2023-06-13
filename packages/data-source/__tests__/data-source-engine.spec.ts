import { noop } from '@knxcloud/lowcode-utils';
import { createDataSourceEngine } from '../src';

describe('data source engine', async () => {
  const mockedFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockedFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('nomal request', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    const state: Record<string, unknown> = {};
    const engine = createDataSourceEngine(
      {
        list: [
          {
            id: 'info',
            options: () => ({
              uri: 'http://127.0.0.1/info.json',
              method: 'POST',
            }),
          },
        ],
      },
      {
        state: state,
        setState(newState) {
          Object.assign(state, newState);
        },
        forceUpdate: noop,
      }
    );
    const res = await engine.dataSourceMap.info.load();
    expect(res).eq(engine.dataSourceMap.info.data).eq(state.info).eq(1);

    expect(mockedFetch).toHaveBeenCalledWith('http://127.0.0.1/info.json', {
      body: '{}',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
      method: 'POST',
    });
  });

  test('error request', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 500,
      statusText: 'Server Internal Error',
    });
    const state: Record<string, unknown> = {};
    const engine = createDataSourceEngine(
      {
        list: [
          {
            id: 'info',
            options: () => ({
              uri: 'http://127.0.0.1/info.json',
              method: 'GET',
            }),
          },
        ],
      },
      {
        state: state,
        setState(newState) {
          Object.assign(state, newState);
        },
        forceUpdate: noop,
      }
    );
    expect(() => engine.dataSourceMap.info.load()).rejects.toThrowError(
      'Server Internal Error'
    );
    expect(engine.dataSourceMap.info.error).toBeUndefined();
  });

  test('should fetch', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    const state: Record<string, unknown> = {};
    const engine = createDataSourceEngine(
      {
        list: [
          {
            id: 'info',
            options: () => ({
              uri: 'http://127.0.0.1/info.json',
              method: 'GET',
            }),
            shouldFetch: () => false,
          },
        ],
      },
      {
        state: state,
        setState(newState) {
          Object.assign(state, newState);
        },
        forceUpdate: noop,
      }
    );

    expect(() => engine.dataSourceMap.info.load()).rejects.toThrowError();
  });

  test('will fetch', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    const state: Record<string, unknown> = {};
    const engine = createDataSourceEngine(
      {
        list: [
          {
            id: 'info',
            options: () => ({
              uri: 'http://127.0.0.1/info.json',
              method: 'GET',
            }),
            willFetch(options) {
              return {
                ...options,
                headers: {
                  ...options.headers,
                  testHeader: 'testHeaderValue',
                },
              };
            },
          },
        ],
      },
      {
        state: state,
        setState(newState) {
          Object.assign(state, newState);
        },
        forceUpdate: noop,
      }
    );
    const res = await engine.dataSourceMap.info.load();
    expect(res).eq(1);

    expect(mockedFetch).toHaveBeenCalledWith('http://127.0.0.1/info.json', {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        testHeader: 'testHeaderValue',
      },
      method: 'GET',
    });
  });
});

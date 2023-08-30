import { fetchRequest } from '../src';

describe('fetch request', () => {
  const mockedFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockedFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('fetch success', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    const res = await fetchRequest({
      uri: 'https://127.0.0.1/info.json',
      method: 'GET',
    });
    expect(res.data).eq(1);
    expect(res.code).eq(200);
  });

  test('fetch failure', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 500,
      statusText: 'Server internal error',
    });

    await expect(() =>
      fetchRequest({
        uri: 'https://127.0.0.1/info.json',
        method: 'GET',
      })
    ).rejects.toThrowError('Server internal error');
  });

  test('with params', async () => {
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    const res = await fetchRequest({
      uri: 'https://127.0.0.1/info.json',
      method: 'GET',
      params: { a: 5, b: null, c: { d: 5 } },
    });
    expect(res.data).eq(1);
    expect(res.code).eq(200);
    expect(mockedFetch).toMatchSnapshot();
  });

  test('responseType', async () => {
    mockedFetch.mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob()),
      status: 200,
      statusText: 'OK',
    });
    const res = await fetchRequest({
      uri: 'https://127.0.0.1/info.json',
      method: 'POST',
      headers: {
        'content-type': 'json',
      },
      params: {
        a: 5,
      },
      responseType: 'blob',
    });
    expect(res.code).eq(200);
    expect(res.data).toBeInstanceOf(Blob);
    expect(mockedFetch).toMatchSnapshot();
  });
});

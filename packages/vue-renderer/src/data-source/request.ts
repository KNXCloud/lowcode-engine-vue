import { isPlainObject } from '@knxcloud/lowcode-utils';
import type { RequestOptions, ResponseType } from './interface';

function serializeParams(obj: Record<string, unknown>) {
  const result: string[] = [];
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val === null || val === undefined || val === '') {
      return;
    }
    if (typeof val === 'object') {
      result.push(`${key}=${encodeURIComponent(JSON.stringify(val))}`);
    } else {
      result.push(`${key}=${encodeURIComponent(String(val))}`);
    }
  });
  return result.join('&');
}

function buildUrl(dataAPI: string, params?: Record<string, unknown>) {
  if (!params) return dataAPI;
  const paramStr = serializeParams(params);
  if (paramStr) {
    return dataAPI.indexOf('?') > 0 ? `${dataAPI}&${paramStr}` : `${dataAPI}?${paramStr}`;
  }
  return dataAPI;
}

function find(o: Record<string, string>, k: string): [string, string] | [] {
  for (const key in o) {
    if (key.toLowerCase() === k) {
      return [o[key], key];
    }
  }
  return [];
}

function isValidResponseType(type: string): type is ResponseType {
  return ['arrayBuffer', 'blob', 'formData', 'json', 'text'].includes(type);
}

function createFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const key in data) {
    const value = data[key];
    if (value instanceof Blob) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }
  return formData;
}

const bodyParseStrategies: Record<string, (data: Record<string, unknown>) => BodyInit> = {
  'application/json': (data) => JSON.stringify(data),
  'multipart/form-data': (data) => (isPlainObject(data) ? createFormData(data) : data),
  'application/x-www-form-urlencoded': (data) => serializeParams(data),
};

function parseRequestBody(contentType: string, data: Record<string, unknown>): BodyInit {
  const parser = Object.keys(bodyParseStrategies).find((key) =>
    contentType.includes(key)
  );
  return parser ? bodyParseStrategies[parser](data) : (data as unknown as BodyInit);
}

export class RequestError<T = unknown> extends Error {
  constructor(message: string, public code: number, public data?: T) {
    super(message);
  }
}

export class Response<T = unknown> {
  constructor(public code: number, public data: T) {}
}

export async function request(options: RequestOptions): Promise<Response> {
  const {
    uri,
    method,
    timeout,
    params = {},
    headers = {},
    responseType = 'json',
  } = options;

  let url: string;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS') {
    url = buildUrl(uri, params);
  } else {
    url = uri;
    const [contentType, key] = find(requestHeaders, 'content-type');
    fetchOptions.body = parseRequestBody(contentType ?? 'application/json', params);

    if (contentType === 'multipart/form-data') {
      key && delete requestHeaders[key];
    }
  }

  if (timeout) {
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;
    setTimeout(() => controller.abort(), timeout);
  }

  const res = await fetch(url, fetchOptions);
  const code = res.status;

  if (code >= 200 && code < 300) {
    if (code === 204) {
      if (method === 'DELETE') {
        return new Response(code, null);
      } else {
        throw new RequestError(res.statusText, code);
      }
    } else {
      if (!isValidResponseType(responseType)) {
        throw new RequestError(`invalid response type: ${responseType}`, -1);
      }
      return new Response(code, await res[responseType]());
    }
  } else if (code >= 400) {
    try {
      const data = await res.json();
      throw new RequestError(res.statusText, code, data);
    } catch {
      throw new RequestError(res.statusText, code);
    }
  }
  throw new RequestError(res.statusText, code);
}

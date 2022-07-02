import { isString } from 'lodash-es';
import { RequestOptions } from './interface';

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

function buildUrl(dataAPI: string, params: Record<string, unknown>) {
  const paramStr = serializeParams(params);
  if (paramStr) {
    return dataAPI.indexOf('?') > 0 ? `${dataAPI}&${paramStr}` : `${dataAPI}?${paramStr}`;
  }
  return dataAPI;
}

function getContentType(headers: Record<string, unknown>): string {
  let contentType = 'application/json';
  if (headers) {
    Object.keys(headers).forEach((key) => {
      if (key.toLowerCase() === 'content-type') {
        const value = headers[key];
        if (isString(value)) {
          contentType = value;
        }
      }
    });
  }

  return contentType;
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
  const { method, uri, timeout, headers, params } = options;

  let url: string;
  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS') {
    url = buildUrl(uri, params);
  } else {
    url = uri;
    fetchOptions.body = getContentType(headers).includes('application/json')
      ? JSON.stringify(params)
      : serializeParams(params);
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
      return new Response(code, await res.json());
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

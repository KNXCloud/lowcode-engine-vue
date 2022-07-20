import { isString } from 'lodash-es';
import { RequestOptions, ResponseType } from './interface';

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

  return contentType.trim();
}

function isValidResponseType(type: string): type is ResponseType {
  return ['arrayBuffer', 'blob', 'formData', 'json', 'text'].includes(type);
}

function parseRequestBody(contentType: string, data: Record<string, unknown>): BodyInit {
  switch (contentType) {
    case 'application/json':
      return JSON.stringify(data);
    case 'multipart/form-data': {
      const formData = new FormData();
      for (const key in data) {
        formData.append(key, data[key] as any);
      }
      return formData;
    }
    case 'application/x-www-form-urlencoded':
      return serializeParams(data);
    default:
      return data as unknown as BodyInit;
  }
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
  const { method, uri, timeout, headers, params, responseType = 'json' } = options;

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
    const contentType = getContentType(headers);
    fetchOptions.body = parseRequestBody(contentType, params);
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

import { createDefer } from './create-defer';

export function evaluate(script: string) {
  const scriptEl = document.createElement('script');
  scriptEl.text = script;
  document.head.appendChild(scriptEl);
  document.head.removeChild(scriptEl);
}

export function load(url: string) {
  const node: any = document.createElement('script');

  node.onload = onload;
  node.onerror = onload;

  const i = createDefer();

  function onload(e: any) {
    node.onload = null;
    node.onerror = null;
    if (e.type === 'load') {
      i.resolve();
    } else {
      i.reject();
    }
  }

  node.src = url;
  node.async = false;

  document.head.appendChild(node);

  return i.promise();
}

export function evaluateExpression(expr: string) {
  return new Function(expr)();
}

export function newFunction(args: string, code: string) {
  try {
    return new Function(args, code);
  } catch (e) {
    console.warn('Caught error, Cant init func');
    return null;
  }
}

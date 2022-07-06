export function isCommentNode(el: Element | Text | Comment | Node): el is Comment {
  return el.nodeType === 8;
}

export function isTextNode(el: Element | Text | Comment | Node): el is Text {
  return el.nodeType === 3;
}

export function isEmptyNode(el: Element | Text | Comment | Node): boolean {
  return isCommentNode(el) || (isTextNode(el) && el.nodeValue === '');
}

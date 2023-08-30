import type { RendererComponent } from '../core';
import { PageRenderer } from './page';
import { BlockRenderer } from './block';
import { ComponentRenderer } from './component';

export const RENDERER_COMPS: Record<string, RendererComponent> = {
  PageRenderer,
  BlockRenderer,
  ComponentRenderer,
};

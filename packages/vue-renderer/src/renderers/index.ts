import type { RendererComponent } from '../core';
import { PageRenderer } from './page';
import { TempRenderer } from './temp';
import { BlockRenderer } from './block';
import { ComponentRenderer } from './component';

export const RENDERER_COMPS: Record<string, RendererComponent> = {
  TempRenderer,
  PageRenderer,
  BlockRenderer,
  ComponentRenderer,
};

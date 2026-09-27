/**
 * Hybrid Undo/Redo History Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * DELTA      → move, scale, rotate, text edits, property changes (font, color,
 *              size, border, shadow, 3D, stitched patch, comic box, sticker...)
 *              Operates on the SAME live object — NO serialization or recreation.
 * LIVE REF   → add object, delete object
 *              Keeps live object instance in memory so custom renderers, vector
 *              paths, and hooks are NEVER lost or corrupted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fabric from 'fabric';
import { ensureFontLoaded } from './fonts';
import { attachCustomBoxRenderer } from './headingStyles';
import { attachComicBoxRenderer, attachStickerRenderer } from '../components/assets/index';

const HISTORY_LIMIT = 80;

const CMD = {
  ADD: 'add',
  DELETE: 'delete',
  TRANSFORM: 'transform',
  PROP: 'prop',
  TEXT: 'text',
};

const TRACKED_PROPS = [
  // Text
  'text',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'underline',
  'fill',
  'textAlign',
  'lineHeight',
  'charSpacing',
  'styles',
  // Stroke & outline
  'stroke',
  'strokeWidth',
  'strokeDashArray',
  'strokeLineCap',
  'strokeLineJoin',
  // Background & layout
  'backgroundColor',
  'padding',
  // Heading & Box styles
  'headingStyleId',
  'boxBorderStyle',
  'boxBorderColor',
  'boxBorderWidth',
  'boxBorderDash',
  'boxCornerRadius',
  'boxPadding',
  // 3D extrusion
  'enable3D',
  'depth3D',
  'shadowColor3D',
  'dirX3D',
  'dirY3D',
  // Stitched patch
  'enableStitchedPatch',
  'patchColor',
  'patchSize',
  'patchRadius',
  'stitchColor',
  'stitchWidth',
  'stitchDash',
  // Comic boxes & bubbles
  'boxFill',
  'boxStroke',
  'boxStrokeWidth',
  'boxRadius',
  'boxStyle',
  'boxDash',
  'comicStyleId',
  'hasHalftone',
  'halftoneColor',
  'halftoneDotSize',
  'bubbleTail',
  'tailDirection',
  'panelBorderColor',
  'panelBorderWidth',
  'panelBorderStyle',
  'panelCornerRadius',
  'panelBackgroundColor',
  // Stickers
  'stickerEffect',
  'stickerBorderColor',
  'stickerBorderWidth',
  'stickerShadowColor',
  'stickerShadowBlur',
  'stickerShadowOffsetX',
  'stickerShadowOffsetY',
  // Word guess
  'guessWord',
  'guessStyle',
  'clueText',
  'tileColor',
  'textColor',
  'borderColor',
  'revealedIndices',
  'hintCount',
  // Imported assets
  'assetFilter',
  'blendMode',
  'brightness',
  'contrast',
  'saturation',
  'vintageFilter',
  'frameStyle',
  'frameColor',
  'frameWidth',
  'frameCornerRadius',
  // Common visual
  'opacity',
  'visible',
];

// Discrete properties commit immediately on single click instead of debouncing
const DISCRETE_PROPS = new Set([
  'fontFamily',
  'headingStyleId',
  'textAlign',
  'fontWeight',
  'fontStyle',
  'underline',
  'boxBorderStyle',
  'enable3D',
  'enableStitchedPatch',
  'comicStyleId',
  'bubbleTail',
  'tailDirection',
  'stickerEffect',
  'guessStyle',
  'blendMode',
  'assetFilter',
  'frameStyle',
  'visible',
]);

const snapTransform = (obj) => ({
  left: obj.left,
  top: obj.top,
  scaleX: obj.scaleX,
  scaleY: obj.scaleY,
  angle: obj.angle,
  flipX: obj.flipX,
  flipY: obj.flipY,
  width: obj.width,
  skewX: obj.skewX,
  skewY: obj.skewY,
});

const snapShadow = (shadow) => {
  if (!shadow) return null;
  return {
    color: shadow.color ?? '#000000',
    blur: Number(shadow.blur) || 0,
    offsetX: Number(shadow.offsetX) || 0,
    offsetY: Number(shadow.offsetY) || 0,
  };
};

const areShadowsEqual = (s1, s2) => {
  if (!s1 && !s2) return true;
  if (!s1 || !s2) return false;
  return (
    s1.color === s2.color &&
    s1.blur === s2.blur &&
    s1.offsetX === s2.offsetX &&
    s1.offsetY === s2.offsetY
  );
};

const cloneVal = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;
  if (val instanceof fabric.Shadow) {
    return snapShadow(val);
  }
  if (Array.isArray(val)) return val.map(cloneVal);
  const copy = {};
  for (const k in val) {
    if (Object.prototype.hasOwnProperty.call(val, k)) {
      copy[k] = cloneVal(val[k]);
    }
  }
  return copy;
};

const areValuesEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => areValuesEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => areValuesEqual(a[k], b[k]));
  }
  return false;
};

const snapProperties = (obj) => {
  if (!obj || obj.type === 'activeselection') return {};
  const res = {};
  for (const prop of TRACKED_PROPS) {
    if (prop in obj && typeof obj[prop] !== 'function') {
      res[prop] = cloneVal(obj[prop]);
    }
  }
  for (const k in obj) {
    if (
      (k.startsWith('box') ||
        k.startsWith('comic') ||
        k.startsWith('stitch') ||
        k.startsWith('patch') ||
        k.startsWith('sticker') ||
        k.startsWith('guess')) &&
      typeof obj[k] !== 'function' &&
      !(k in res)
    ) {
      res[k] = cloneVal(obj[k]);
    }
  }
  res.shadow = snapShadow(obj.shadow);
  return res;
};

const applyProps = async (canvas, obj, props) => {
  if (!obj || !canvas || !props) return;

  // 1. If fontFamily is changing, preload font first so text metrics render properly
  if (props.fontFamily) {
    try {
      await ensureFontLoaded(props.fontFamily);
    } catch (e) {
      console.warn('Font load error during undo/redo:', e);
    }
  }

  // 2. Handle shadow
  if ('shadow' in props) {
    const s = props.shadow;
    if (s && typeof s === 'object') {
      obj.shadow = new fabric.Shadow({
        color: s.color || '#000000',
        blur: Number(s.blur) || 0,
        offsetX: Number(s.offsetX) || 0,
        offsetY: Number(s.offsetY) || 0,
      });
    } else {
      obj.shadow = null;
    }
  }

  // 3. Set properties
  Object.entries(props).forEach(([key, val]) => {
    if (key === 'shadow') return;
    const cloned = cloneVal(val);
    obj[key] = cloned;
    try {
      if (typeof obj.set === 'function') {
        obj.set(key, cloned);
      }
    } catch {
      // Ignored if fabric doesn't have setter for custom key
    }
  });

  // 4. Update dimensions if text
  const isTextObj =
    obj instanceof fabric.Textbox ||
    obj.type === 'textbox' ||
    Boolean(obj.isBodyText);

  if (isTextObj && typeof obj.initDimensions === 'function') {
    const wasEditing = obj.isEditing;
    if (wasEditing) obj.isEditing = false;
    obj.initDimensions();
    if (wasEditing) obj.isEditing = true;
    if (obj.cursorOffsetCache) obj.cursorOffsetCache = {};
  }

  // 5. Update custom renderers
  if (obj.headingStyleId || obj.enableStitchedPatch || obj.enable3D || obj.boxBorderStyle) {
    attachCustomBoxRenderer(obj);
    if (obj.enableStitchedPatch && typeof obj.updateStitchedPatch === 'function') {
      try {
        await obj.updateStitchedPatch(canvas);
      } catch (err) {
        console.warn('Failed to update stitched patch on undo/redo:', err);
      }
    }
  }

  if (obj.isComicBox && typeof attachComicBoxRenderer === 'function') {
    attachComicBoxRenderer(obj);
  }

  if (obj.isStickerAsset && typeof attachStickerRenderer === 'function') {
    attachStickerRenderer(obj);
  }

  if (obj.isGuessAsset && typeof obj.updateGuess === 'function') {
    try {
      obj.updateGuess(canvas);
    } catch {
      // Ignored
    }
  }

  if (obj.isImportedAsset && typeof obj.applyFilters === 'function') {
    try {
      obj.applyFilters();
    } catch {
      // Ignored
    }
  }

  obj.dirty = true;
  obj.setCoords?.();
  canvas.requestRenderAll();

  // Notify UI
  canvas.fire('object:modified', { target: obj });
  canvas.fire('selection:updated', { target: obj, selected: [obj] });
};

export const createCanvasHistory = (onChange = () => {}) => {
  let canvas = null;
  let paused = false;
  let insideUndo = false;
  let pages = new Map();
  let pageId = null;
  const beforeTransform = new WeakMap();
  const lastCommittedProps = new WeakMap();

  let propTimer = null;
  let pendingObj = null;
  let pendingBefore = null;

  const current = () => pages.get(pageId);

  const emit = () => {
    const entry = current();
    onChange({
      canUndo: Boolean(entry?.past?.length),
      canRedo: Boolean(entry?.future?.length),
    });
  };

  const push = (cmd) => {
    if (paused || insideUndo || !pageId) return;
    const entry = current();
    if (!entry) return;
    entry.past.push(cmd);
    if (entry.past.length > HISTORY_LIMIT) entry.past.shift();
    entry.future = [];
    emit();
  };

  const flushPending = () => {
    if (propTimer) {
      clearTimeout(propTimer);
      propTimer = null;
    }
    if (!pendingObj || !pendingBefore) {
      pendingObj = null;
      pendingBefore = null;
      return;
    }

    const obj = pendingObj;
    const beforeSnap = pendingBefore;
    pendingObj = null;
    pendingBefore = null;

    const afterSnap = snapProperties(obj);
    const changedBefore = {};
    const changedAfter = {};
    let hasDiff = false;

    const allKeys = new Set([...Object.keys(beforeSnap), ...Object.keys(afterSnap)]);
    for (const key of allKeys) {
      const bVal = beforeSnap[key];
      const aVal = afterSnap[key];
      if (key === 'shadow') {
        if (!areShadowsEqual(bVal, aVal)) {
          changedBefore.shadow = bVal;
          changedAfter.shadow = aVal;
          hasDiff = true;
        }
      } else if (!areValuesEqual(bVal, aVal)) {
        changedBefore[key] = bVal;
        changedAfter[key] = aVal;
        hasDiff = true;
      }
    }

    if (hasDiff) {
      lastCommittedProps.set(obj, afterSnap);
      push({
        type: CMD.PROP,
        obj,
        before: changedBefore,
        after: changedAfter,
      });
    }
  };

  const checkPropertyChanges = (forceImmediate = false) => {
    if (paused || insideUndo || !pageId || !canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type === 'activeselection') return;

    let baseline = lastCommittedProps.get(obj);
    if (!baseline) {
      lastCommittedProps.set(obj, snapProperties(obj));
      return;
    }

    const currentSnap = snapProperties(obj);
    let hasChange = false;
    let isDiscrete = forceImmediate;

    for (const key in currentSnap) {
      if (key === 'text' && obj.isEditing) continue; // text edits handled by CMD.TEXT
      if (key === 'shadow') {
        if (!areShadowsEqual(baseline.shadow, currentSnap.shadow)) {
          hasChange = true;
          break;
        }
      } else if (!areValuesEqual(baseline[key], currentSnap[key])) {
        hasChange = true;
        if (DISCRETE_PROPS.has(key)) {
          isDiscrete = true;
        }
      }
    }

    if (!hasChange) {
      for (const key in baseline) {
        if (key === 'text' && obj.isEditing) continue;
        if (!(key in currentSnap) && baseline[key] !== undefined) {
          hasChange = true;
          if (DISCRETE_PROPS.has(key)) isDiscrete = true;
          break;
        }
      }
    }

    if (!hasChange) return;

    if (pendingObj && pendingObj !== obj) {
      flushPending();
      baseline = lastCommittedProps.get(obj) || snapProperties(obj);
    }

    if (!pendingObj) {
      pendingObj = obj;
      pendingBefore = cloneVal(baseline);
    }

    if (isDiscrete) {
      flushPending();
    } else {
      if (propTimer) clearTimeout(propTimer);
      propTimer = setTimeout(() => {
        flushPending();
      }, 300);
    }
  };

  const execUndo = async (cmd) => {
    if (!canvas) return;
    switch (cmd.type) {
      case CMD.ADD:
        canvas.remove(cmd.obj);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        canvas.fire('selection:cleared');
        break;
      case CMD.DELETE: {
        const objs = canvas.getObjects();
        if (cmd.index >= objs.length) canvas.add(cmd.obj);
        else canvas.insertAt(cmd.index, cmd.obj);
        cmd.obj.dirty = true;
        cmd.obj.setCoords?.();
        canvas.setActiveObject(cmd.obj);
        canvas.requestRenderAll();
        canvas.fire('selection:created', { target: cmd.obj });
        break;
      }
      case CMD.TRANSFORM:
        await applyProps(canvas, cmd.obj, cmd.before);
        break;
      case CMD.PROP:
        await applyProps(canvas, cmd.obj, cmd.before);
        break;
      case CMD.TEXT:
        await applyProps(canvas, cmd.obj, { text: cmd.before });
        break;
      default:
        break;
    }
  };

  const execRedo = async (cmd) => {
    if (!canvas) return;
    switch (cmd.type) {
      case CMD.ADD: {
        const objs = canvas.getObjects();
        if (cmd.index >= objs.length) canvas.add(cmd.obj);
        else canvas.insertAt(cmd.index, cmd.obj);
        cmd.obj.dirty = true;
        cmd.obj.setCoords?.();
        canvas.setActiveObject(cmd.obj);
        canvas.requestRenderAll();
        canvas.fire('selection:created', { target: cmd.obj });
        break;
      }
      case CMD.DELETE:
        canvas.remove(cmd.obj);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        canvas.fire('selection:cleared');
        break;
      case CMD.TRANSFORM:
        await applyProps(canvas, cmd.obj, cmd.after);
        break;
      case CMD.PROP:
        await applyProps(canvas, cmd.obj, cmd.after);
        break;
      case CMD.TEXT:
        await applyProps(canvas, cmd.obj, { text: cmd.after });
        break;
      default:
        break;
    }
  };

  const undo = async () => {
    const entry = current();
    if (insideUndo) return;
    flushPending();
    if (!entry?.past?.length) return;
    insideUndo = true;
    const cmd = entry.past.pop();
    entry.future.unshift(cmd);
    try {
      await execUndo(cmd);
    } finally {
      insideUndo = false;
      const active = canvas?.getActiveObject();
      if (active) {
        lastCommittedProps.set(active, snapProperties(active));
      }
      emit();
    }
  };

  const redo = async () => {
    const entry = current();
    if (insideUndo) return;
    flushPending();
    if (!entry?.future?.length) return;
    insideUndo = true;
    const cmd = entry.future.shift();
    entry.past.push(cmd);
    try {
      await execRedo(cmd);
    } finally {
      insideUndo = false;
      const active = canvas?.getActiveObject();
      if (active) {
        lastCommittedProps.set(active, snapProperties(active));
      }
      emit();
    }
  };

  /**
   * Record a property change manually if needed:
   * Single prop:  recordProp(obj, 'fill', oldVal, newVal)
   * Multi prop:   recordProp(obj, { fill: old }, { fill: new })
   */
  const recordProp = (obj, keyOrBefore, oldValOrAfter, newVal) => {
    if (!obj || insideUndo) return;
    flushPending();
    let before, after;
    if (typeof keyOrBefore === 'object') {
      before = {};
      after = {};
      Object.keys(keyOrBefore).forEach((k) => {
        before[k] = cloneVal(keyOrBefore[k]);
        after[k] = cloneVal(oldValOrAfter[k]);
      });
    } else {
      before = { [keyOrBefore]: cloneVal(oldValOrAfter) };
      after = { [keyOrBefore]: cloneVal(newVal) };
    }
    lastCommittedProps.set(obj, snapProperties(obj));
    push({ type: CMD.PROP, obj, before, after });
  };

  const recordText = (obj, beforeText, afterText) => {
    if (!obj || insideUndo || beforeText === afterText) return;
    push({ type: CMD.TEXT, obj, before: beforeText, after: afterText });
  };

  let origRequestRenderAll = null;
  let origRenderAll = null;
  let handlers = [];
  const on = (event, fn) => { canvas.on(event, fn); handlers.push([event, fn]); };
  const detachHandlers = () => {
    flushPending();
    if (canvas) {
      if (origRequestRenderAll) canvas.requestRenderAll = origRequestRenderAll;
      if (origRenderAll) canvas.renderAll = origRenderAll;
    }
    origRequestRenderAll = null;
    origRenderAll = null;
    handlers.forEach(([e, fn]) => canvas?.off(e, fn));
    handlers = [];
  };

  const attach = (nextCanvas) => {
    detachHandlers();
    canvas = nextCanvas;
    if (!canvas) return;

    // Wrap requestRenderAll and renderAll to monitor property modifications across all inspector panels
    origRequestRenderAll = canvas.requestRenderAll.bind(canvas);
    canvas.requestRenderAll = function () {
      checkPropertyChanges();
      return origRequestRenderAll();
    };

    origRenderAll = canvas.renderAll.bind(canvas);
    canvas.renderAll = function () {
      checkPropertyChanges();
      return origRenderAll();
    };

    const initialActive = canvas.getActiveObject();
    if (initialActive) {
      lastCommittedProps.set(initialActive, snapProperties(initialActive));
    }

    // Capture transform before drag/scale/rotate starts
    on('mouse:down', (e) => {
      if (insideUndo) return;
      flushPending();
      if (e.target) {
        beforeTransform.set(e.target, snapTransform(e.target));
      }
    });

    // Record delta after move / scale / rotate / resize
    on('object:modified', (e) => {
      if (insideUndo) return;
      flushPending();
      if (!e.target) return;
      const obj = e.target;
      const before = beforeTransform.get(obj) || snapTransform(obj);
      const after = snapTransform(obj);
      const changed = Object.keys(after).some((k) => after[k] !== before[k]);
      if (changed) {
        push({ type: CMD.TRANSFORM, obj, before, after });
        beforeTransform.delete(obj);
      }
    });

    // Add / Delete — store live object reference
    on('object:added', (e) => {
      if (insideUndo || !e.target) return;
      flushPending();
      const obj = e.target;
      const index = canvas.getObjects().indexOf(obj);
      push({ type: CMD.ADD, obj, index });
    });

    on('object:removed', (e) => {
      if (insideUndo || !e.target) return;
      flushPending();
      const obj = e.target;
      const allObjs = canvas.getObjects();
      const index = allObjs.indexOf(obj) !== -1 ? allObjs.indexOf(obj) : allObjs.length;
      push({ type: CMD.DELETE, obj, index });
    });

    // Selection changes: flush any pending edit on previous object, set baseline on new
    on('selection:created', (e) => {
      flushPending();
      const obj = e.selected?.[0] || canvas.getActiveObject();
      if (obj) {
        lastCommittedProps.set(obj, snapProperties(obj));
      }
    });

    on('selection:updated', (e) => {
      flushPending();
      const obj = e.selected?.[0] || canvas.getActiveObject();
      if (obj) {
        lastCommittedProps.set(obj, snapProperties(obj));
      }
    });

    on('selection:cleared', () => {
      flushPending();
    });

    // Text edits — debounced so rapid typing collapses into one command
    let textTimer = null;
    let textBefore = null;
    on('text:editing:entered', (e) => {
      if (insideUndo) return;
      flushPending();
      textBefore = e.target?.text ?? null;
    });

    on('text:changed', () => {
      if (insideUndo) return;
      clearTimeout(textTimer);
      textTimer = setTimeout(() => {
        const obj = canvas?.getActiveObject();
        if (!obj || textBefore === null) return;
        const after = obj.text;
        if (after !== textBefore) {
          push({ type: CMD.TEXT, obj, before: textBefore, after });
          textBefore = after;
        }
      }, 400);
    });

    on('text:editing:exited', () => {
      clearTimeout(textTimer);
      const obj = canvas?.getActiveObject();
      if (obj && textBefore !== null && obj.text !== textBefore) {
        push({ type: CMD.TEXT, obj, before: textBefore, after: obj.text });
      }
      textBefore = null;
    });
  };

  const setPage = (nextPageId, nextCanvas = canvas) => {
    flushPending();
    detachHandlers();
    canvas = nextCanvas;
    pageId = nextPageId;
    if (!pages.has(pageId)) pages.set(pageId, { past: [], future: [] });
    attach(canvas);
    emit();
  };

  const pause = () => {
    flushPending();
    paused = true;
  };

  const resume = () => {
    paused = false;
  };

  const clearPage = (pid) => {
    flushPending();
    const id = pid ?? pageId;
    pages.set(id, { past: [], future: [] });
    emit();
  };

  const dispose = () => {
    flushPending();
    detachHandlers();
    canvas = null;
    pages.clear();
  };

  return {
    setPage,
    pause,
    resume,
    undo,
    redo,
    flush: flushPending,
    recordProp,
    recordText,
    clearPage,
    dispose,
    getState: () => {
      const entry = current();
      return {
        canUndo: Boolean(entry?.past?.length),
        canRedo: Boolean(entry?.future?.length),
      };
    },
  };
};

import opentype from 'opentype.js';
import paper from 'paper';
import { PaperOffset } from 'paperjs-offset';

import pearlJeanFontUrl from '../assets/fonts/PearlJean.ttf';
import frogieFontUrl from '../assets/fonts/Frogie-Regular.ttf';
import gelatoFontUrl from '../assets/fonts/Gelato.ttf';
import painlessFontUrl from '../assets/fonts/Painless.otf';
import rogientFontUrl from '../assets/fonts/rogient-block.otf';
import manropeFontUrl from '../assets/fonts/Manrope-VariableFont_wght.ttf';
import brysonFontUrl from '../assets/fonts/Bryson-Personal Use Only.otf';

const FONT_URL_MAP = {
  'Pearl Jean': pearlJeanFontUrl,
  'Frogie': frogieFontUrl,
  'Gelato': gelatoFontUrl,
  'Painless': painlessFontUrl,
  'Rogient Block': rogientFontUrl,
  'Manrope': manropeFontUrl,
  'Bryson': brysonFontUrl,
};

const opentypeFontCache = new Map();
const patchCache = new Map();
let paperInitialized = false;

/**
 * Preload and parse opentype Font from TTF / OTF arrayBuffer
 */
export const loadFontForOpentype = async (fontFamily = 'Pearl Jean') => {
  if (opentypeFontCache.has(fontFamily)) {
    return opentypeFontCache.get(fontFamily);
  }

  const url = FONT_URL_MAP[fontFamily] || pearlJeanFontUrl;
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const font = opentype.parse(arrayBuffer);
    opentypeFontCache.set(fontFamily, font);
    return font;
  } catch (err) {
    console.error(`[StitchedPatchEngine] Failed to parse font "${fontFamily}":`, err);
    return null;
  }
};

/**
 * Initialize Paper.js headless canvas project (optimized canvas dimensions)
 */
export const ensurePaperProject = () => {
  if (!paperInitialized) {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 800;
      paper.setup(canvas);
    } else {
      paper.setup(new paper.Size(1600, 800));
    }
    paperInitialized = true;
  } else if (paper.project) {
    paper.project.activate();
  }
};

/**
 * Generate vector contours with equal arc-length stitches
 * NOTE: stitchWidth is deliberately EXCLUDED from the cache key because
 * it is purely a stroke render property and does not affect geometry.
 */
export const getVectorStitchedPatch = async (text, options = {}) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const cleanText = text.trim();
  const fontFamily = options.fontFamily || 'Pearl Jean';
  const fontSize = Number(options.fontSize) || 85;
  const patchRadius = Number(options.patchRadius) || (options.patchSize ? Number(options.patchSize) / 2 : 14);
  const stitchRadius = Math.max(patchRadius - 3, 3);
  const stitchDash = options.stitchDash || [6, 5];

  // Excluded stitchWidth from cache key for instantaneous styling
  const cacheKey = `${cleanText}_${fontFamily}_${fontSize}_${patchRadius}_${stitchRadius}_${stitchDash.join('_')}`;
  if (patchCache.has(cacheKey)) {
    return patchCache.get(cacheKey);
  }

  const font = await loadFontForOpentype(fontFamily);
  if (!font) return null;

  ensurePaperProject();
  paper.project.clear();

  try {
    // 1. Font Parsing & Outline Extraction
    const textPath = font.getPath(cleanText, 0, 0, fontSize);
    const svgD = textPath.toPathData(3);
    if (!svgD) return null;

    const glyphItem = new paper.CompoundPath(svgD);
    if (!glyphItem || glyphItem.bounds.width === 0) return null;

    glyphItem.position = new paper.Point(0, 0);

    // 2. Boolean Union & Outer Offset Contours
    const offsetBase = PaperOffset.offset(glyphItem, patchRadius, { join: 'round' });
    const offsetStitch = PaperOffset.offset(glyphItem, stitchRadius, { join: 'round' });

    if (!offsetBase || !offsetStitch) {
      paper.project.clear();
      return null;
    }

    // 3. Equal Arc-Length Stitch Distribution
    const stitchLoops = (offsetStitch.children || [offsetStitch]).filter(
      (c) => c && c.area > 15 && c.length > 15
    );

    const stitches = [];
    const dash = Number(stitchDash[0]) || 6;
    const gap = Number(stitchDash[1]) || 5;
    const cycle = dash + gap;

    stitchLoops.forEach((loop) => {
      const L = loop.length;
      const N = Math.max(1, Math.round(L / cycle));
      const actualCycle = L / N;
      const actualDash = actualCycle * (dash / cycle);

      for (let i = 0; i < N; i++) {
        const s0 = i * actualCycle;
        const s1 = s0 + actualDash;
        const p0 = loop.getPointAt(s0);
        const p1 = loop.getPointAt(Math.min(s1, L));
        if (p0 && p1) {
          stitches.push([{ x: p0.x, y: p0.y }, { x: p1.x, y: p1.y }]);
        }
      }
    });

    const baseSvgD = offsetBase.pathData;
    const textSvgD = glyphItem.pathData;
    const bounds = {
      x: offsetBase.bounds.x,
      y: offsetBase.bounds.y,
      width: offsetBase.bounds.width,
      height: offsetBase.bounds.height,
    };

    let basePath2D = null;
    let textPath2D = null;
    let stitchPath2D = null;

    if (typeof Path2D !== 'undefined') {
      basePath2D = new Path2D(baseSvgD);
      textPath2D = new Path2D(textSvgD);
      stitchPath2D = new Path2D();
      stitches.forEach(([p0, p1]) => {
        stitchPath2D.moveTo(p0.x, p0.y);
        stitchPath2D.lineTo(p1.x, p1.y);
      });
    }

    paper.project.clear();

    const result = {
      baseSvgD,
      textSvgD,
      stitches,
      bounds,
      width: bounds.width,
      height: bounds.height,
      basePath2D,
      textPath2D,
      stitchPath2D,
      stitchCount: stitches.length,
    };

    patchCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[StitchedPatchEngine] Error generating vector contours:', err);
    paper.project.clear();
    return null;
  }
};

/**
 * Render the cached stitched patch layers directly to a 2D canvas context
 */
export const renderStitchedPatchToContext = (ctx, patch, options = {}) => {
  if (!ctx || !patch) return;

  const patchColor = options.patchColor || '#E6EA58';
  const stitchColor = options.stitchColor || '#111111';
  const stitchWidth = Number(options.stitchWidth) || 2.5;
  const textColor = options.textColor || '#111111';

  ctx.save();

  // Layer 1: Yellow Base Contour
  if (patch.basePath2D) {
    ctx.fillStyle = patchColor;
    ctx.fill(patch.basePath2D);
  }

  // Layer 2: Peripheral Stitches
  ctx.strokeStyle = stitchColor;
  ctx.lineWidth = stitchWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (patch.stitchPath2D) {
    ctx.stroke(patch.stitchPath2D);
  } else if (patch.stitches && patch.stitches.length > 0) {
    ctx.beginPath();
    for (const [p0, p1] of patch.stitches) {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();
  }

  // Layer 3: Foreground Text
  if (patch.textPath2D && textColor && textColor !== 'transparent') {
    ctx.fillStyle = textColor;
    ctx.fill(patch.textPath2D);
  }

  ctx.restore();
};
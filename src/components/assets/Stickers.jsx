import React, { useRef, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import PrintSafetyWarning from '../PrintSafetyWarning';

/**
 * ============================================================================
 * VECTOR STICKER SHAPE DEFINITIONS
 * ============================================================================
 */

// Draw Chubby Y2K Heart
export const drawHeartPath = (ctx, size = 100) => {
  const s = size / 100;
  ctx.beginPath();
  ctx.moveTo(0 * s, -14 * s);
  ctx.bezierCurveTo(-18 * s, -44 * s, -56 * s, -40 * s, -56 * s, -6 * s);
  ctx.bezierCurveTo(-56 * s, 22 * s, -28 * s, 36 * s, 0 * s, 50 * s);
  ctx.bezierCurveTo(28 * s, 36 * s, 56 * s, 22 * s, 56 * s, -6 * s);
  ctx.bezierCurveTo(56 * s, -40 * s, 18 * s, -44 * s, 0 * s, -14 * s);
  ctx.closePath();
};

// Draw 5-Petal Daisy / Retro Flower
export const drawFlowerPath = (ctx, size = 100) => {
  const s = size / 100;
  const numPetals = 5;
  const step = (Math.PI * 2) / numPetals;
  const rOuter = 50 * s;
  const rInner = 20 * s;
  const startAngle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < numPetals; i++) {
    const a1 = startAngle + i * step;
    const aMid = a1 + step / 2;
    const a2 = a1 + step;

    const tipX = Math.cos(a1) * rOuter;
    const tipY = Math.sin(a1) * rOuter;
    const cpDist = 28 * s;
    const tx = -Math.sin(a1) * cpDist;
    const ty = Math.cos(a1) * cpDist;

    const notchX = Math.cos(aMid) * rInner;
    const notchY = Math.sin(aMid) * rInner;

    if (i === 0) {
      ctx.moveTo(Math.cos(startAngle) * rOuter, Math.sin(startAngle) * rOuter);
    }

    ctx.bezierCurveTo(tipX + tx, tipY + ty, notchX + Math.cos(a1) * 6 * s, notchY + Math.sin(a1) * 6 * s, notchX, notchY);
    const nextTipX = Math.cos(a2) * rOuter;
    const nextTipY = Math.sin(a2) * rOuter;
    const ntx = -Math.sin(a2) * cpDist;
    const nty = Math.cos(a2) * cpDist;

    ctx.bezierCurveTo(notchX + Math.cos(a2) * 6 * s, notchY + Math.sin(a2) * 6 * s, nextTipX - ntx, nextTipY - nty, nextTipX, nextTipY);
  }
  ctx.closePath();
};

// Draw 4-Point Twinkle Sparkle
export const drawSparklePath = (ctx, size = 100) => {
  const s = size / 100;
  const rOuter = 50 * s;
  const cp = 11 * s;
  ctx.beginPath();
  ctx.moveTo(0, -rOuter);
  ctx.quadraticCurveTo(cp, -cp, rOuter, 0);
  ctx.quadraticCurveTo(cp, cp, 0, rOuter);
  ctx.quadraticCurveTo(-cp, cp, -rOuter, 0);
  ctx.quadraticCurveTo(-cp, -cp, 0, -rOuter);
  ctx.closePath();
};

// Draw Chubby 5-Point Star
export const drawStarPath = (ctx, size = 100) => {
  const s = size / 100;
  const points = 5;
  const rOuter = 50 * s;
  const rInner = 24 * s;
  const step = Math.PI / points;
  let angle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    angle += step;
  }
  ctx.closePath();
};

// Draw 8-Petal Rosette / Scalloped Badge
export const drawRosettePath = (ctx, size = 100) => {
  const s = size / 100;
  const numPetals = 8;
  const step = (Math.PI * 2) / numPetals;
  const rOuter = 48 * s;
  const rInner = 36 * s;
  const startAngle = -Math.PI / 2;

  ctx.beginPath();
  for (let i = 0; i < numPetals; i++) {
    const a1 = startAngle + i * step;
    const aMid = a1 + step / 2;
    const a2 = a1 + step;

    const tipX = Math.cos(a1) * rOuter;
    const tipY = Math.sin(a1) * rOuter;
    const cpDist = 14 * s;
    const tx = -Math.sin(a1) * cpDist;
    const ty = Math.cos(a1) * cpDist;

    const notchX = Math.cos(aMid) * rInner;
    const notchY = Math.sin(aMid) * rInner;

    if (i === 0) {
      ctx.moveTo(Math.cos(startAngle) * rOuter, Math.sin(startAngle) * rOuter);
    }

    ctx.bezierCurveTo(tipX + tx, tipY + ty, notchX, notchY, notchX, notchY);
    const nextTipX = Math.cos(a2) * rOuter;
    const nextTipY = Math.sin(a2) * rOuter;
    const ntx = -Math.sin(a2) * cpDist;
    const nty = Math.cos(a2) * cpDist;

    ctx.bezierCurveTo(notchX, notchY, nextTipX - ntx, nextTipY - nty, nextTipX, nextTipY);
  }
  ctx.closePath();
};

/**
 * ============================================================================
 * ORGANIC CONTOUR TRACER FOR PNG CUTOUTS
 * ============================================================================
 */
const extractImageContour = (img, width, height) => {
  const pad = 2;
  const W = Math.round(width) + pad * 2;
  const H = Math.round(height) + pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, pad, pad, Math.round(width), Math.round(height));

  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  const isSolid = (x, y) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    return data[(y * W + x) * 4 + 3] > 60;
  };

  let startX = -1;
  let startY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isSolid(x, y)) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) {
    const hw = width / 2;
    const hh = height / 2;
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
  }

  const DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
  ];

  const rawPoints = [];
  let currX = startX;
  let currY = startY;
  let bDir = 0;

  const maxSteps = W * H * 2;
  let steps = 0;

  while (steps < maxSteps) {
    rawPoints.push({
      x: currX - pad - width / 2,
      y: currY - pad - height / 2,
    });

    let found = false;
    let nextX = currX;
    let nextY = currY;
    let nextBDir = 0;

    for (let i = 0; i < 8; i++) {
      const checkDir = (bDir + 1 + i) % 8;
      const tx = currX + DIRS[checkDir].x;
      const ty = currY + DIRS[checkDir].y;

      if (isSolid(tx, ty)) {
        nextX = tx;
        nextY = ty;
        const lastWhiteX = currX + DIRS[(checkDir + 7) % 8].x;
        const lastWhiteY = currY + DIRS[(checkDir + 7) % 8].y;
        const dx = lastWhiteX - nextX;
        const dy = lastWhiteY - nextY;

        for (let d = 0; d < 8; d++) {
          if (DIRS[d].x === dx && DIRS[d].y === dy) {
            nextBDir = d;
            break;
          }
        }
        found = true;
        break;
      }
    }

    if (!found) break;

    currX = nextX;
    currY = nextY;
    bDir = nextBDir;

    if (currX === startX && currY === startY && steps > 2) {
      break;
    }
    steps++;
  }

  if (rawPoints.length < 6) return rawPoints;

  const stepSize = Math.max(2, Math.round(rawPoints.length / 100));
  const sampled = [];
  for (let i = 0; i < rawPoints.length; i += stepSize) {
    sampled.push(rawPoints[i]);
  }

  const smoothed = [];
  const n = sampled.length;
  for (let i = 0; i < n; i++) {
    const prev = sampled[(i - 1 + n) % n];
    const curr = sampled[i];
    const next = sampled[(i + 1) % n];
    smoothed.push({
      x: 0.25 * prev.x + 0.5 * curr.x + 0.25 * next.x,
      y: 0.25 * prev.y + 0.5 * curr.y + 0.25 * next.y,
    });
  }

  return smoothed;
};

export const drawContourPath = (ctx, points) => {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  const p0 = points[0];
  const p1 = points[1];
  ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  ctx.closePath();
};

/**
 * ============================================================================
 * STICKER ASSETS PRESETS
 * ============================================================================
 */
export const STICKER_ASSETS = [
  {
    id: 'heart',
    name: 'Retro Heart',
    tag: 'ROMANTIC',
    draw: drawHeartPath,
    defaultFill: '#FF5BA7',
    defaultStroke: '#000000',
    defaultStrokeWidth: 3.5,
    defaultDepth3D: 7,
    defaultShadowColor: '#000000',
    width: 120,
    height: 110,
  },
  {
    id: 'flower',
    name: 'Daisy Flower',
    tag: 'GROOVY',
    draw: drawFlowerPath,
    defaultFill: '#FF5BA7',
    defaultStroke: '#000000',
    defaultStrokeWidth: 3.5,
    defaultDepth3D: 7,
    defaultShadowColor: '#000000',
    width: 120,
    height: 120,
  },
  {
    id: 'sparkle',
    name: 'Y2K Sparkle',
    tag: 'MAGIC',
    draw: drawSparklePath,
    defaultFill: '#FB923C',
    defaultStroke: '#000000',
    defaultStrokeWidth: 3.5,
    defaultDepth3D: 7,
    defaultShadowColor: '#000000',
    width: 120,
    height: 120,
  },
  {
    id: 'star',
    name: 'Retro Star',
    tag: 'POP',
    draw: drawStarPath,
    defaultFill: '#FCE762',
    defaultStroke: '#000000',
    defaultStrokeWidth: 3.5,
    defaultDepth3D: 7,
    defaultShadowColor: '#000000',
    width: 120,
    height: 120,
  },
  {
    id: 'rosette',
    name: 'Scallop Badge',
    tag: 'VINTAGE',
    draw: drawRosettePath,
    defaultFill: '#C084FC',
    defaultStroke: '#000000',
    defaultStrokeWidth: 3.5,
    defaultDepth3D: 7,
    defaultShadowColor: '#000000',
    width: 120,
    height: 120,
  },
];

export const STICKER_PALETTE = [
  { name: 'Pop Pink', hex: '#FF5BA7' },
  { name: 'Hot Rose', hex: '#E11D48' },
  { name: 'Butter Yellow', hex: '#FDE9C9' },
  { name: 'Electric Lilac', hex: '#C084FC' },
  { name: 'Powder Blue', hex: '#93C5FD' },
  { name: 'Sage Green', hex: '#86EFAC' },
  { name: 'Sunny Orange', hex: '#FB923C' },
  { name: 'Pure White', hex: '#FFFFFF' },
];

/**
 * ============================================================================
 * IMAGE BUFFER & CONTOUR CACHE
 * ============================================================================
 */
const getImageStickerBuffers = (obj) => {
  const img = obj._element || (typeof obj.getElement === 'function' ? obj.getElement() : null);
  if (!img) return null;

  // Use the image's natural (full) resolution for the buffer so it stays crisp at any scale
  const natW = img.naturalWidth || img.width || Math.max(1, Math.round(obj.width));
  const natH = img.naturalHeight || img.height || Math.max(1, Math.round(obj.height));
  const w = Math.max(1, natW);
  const h = Math.max(1, natH);
  const imageTint = obj.imageTint || 'none';

  const cacheKey = `${w}_${h}_${imageTint}_${img.src || ''}`;
  if (obj._stickerBufferCache && obj._stickerBufferCache.key === cacheKey) {
    return obj._stickerBufferCache;
  }

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = w;
  baseCanvas.height = h;
  const bCtx = baseCanvas.getContext('2d');
  bCtx.drawImage(img, 0, 0, w, h);

  if (imageTint && imageTint !== 'none') {
    bCtx.save();
    bCtx.globalCompositeOperation = 'source-atop';
    bCtx.fillStyle = imageTint;
    bCtx.globalAlpha = 0.35;
    bCtx.fillRect(0, 0, w, h);
    bCtx.restore();
  }

  const contour = extractImageContour(img, w, h);

  const cache = {
    key: cacheKey,
    baseCanvas,
    contour,
  };
  obj._stickerBufferCache = cache;
  return cache;
};

/**
 * ============================================================================
 * ATTACH CUSTOM STICKER RENDERER
 * ============================================================================
 */
export const attachStickerRenderer = (obj) => {
  if (!obj) return;

  obj.isStickerAsset = true;
  obj.objectCaching = false;

  if (obj.cacheProperties) {
    obj.cacheProperties = [
      ...obj.cacheProperties,
      'isStickerAsset', 'isImageSticker', 'assetShape', 'assetName',
      'cutoutEffect', 'cutoutHalo', 'cutoutPaperColor', 'cutoutShadow',
      'thickShadow', 'depth3D', 'shadowColor3D', 'dirX3D', 'dirY3D',
      'dottedStroke', 'dottedGap', 'dottedSize', 'dottedColor', 'dottedInset',
      'imageTint',
    ];
  }

  obj._render = function (ctx) {
    const isImage = Boolean(this.isImageSticker);
    const hasCutout = Boolean(this.cutoutEffect);
    const hasThickShadow = this.thickShadow !== false;
    const hasDotted = Boolean(this.dottedStroke);
    const hasTint = this.imageTint && this.imageTint !== 'none';

    // ── FAST PATH ──────────────────────────────────────────────────────────
    // No effects active: draw the original image element directly at full
    // resolution. This avoids the off-screen buffer entirely and gives
    // crisp results at any scale.
    if (isImage && !hasCutout && !hasThickShadow && !hasDotted && !hasTint) {
      const img = this._element || (typeof this.getElement === 'function' ? this.getElement() : null);
      if (img) {
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
        return;
      }
    }

    // ── FULL EFFECTS PATH ──────────────────────────────────────────────────
    let imageBuffers = null;
    let contourPoints = null;

    if (isImage) {
      imageBuffers = getImageStickerBuffers(this);
      if (imageBuffers) {
        contourPoints = imageBuffers.contour;
      }
    }

    const size = Math.min(this.width, this.height);
    const shape = this.assetShape || 'heart';
    const strokeWidth = Number(this.strokeWidth) || 3.5;

    const drawFn = isImage
      ? (c) => drawContourPath(c, contourPoints)
      : shape === 'flower'
        ? (c) => drawFlowerPath(c, size)
        : shape === 'sparkle'
          ? (c) => drawSparklePath(c, size)
          : shape === 'star'
            ? (c) => drawStarPath(c, size)
            : shape === 'rosette'
              ? (c) => drawRosettePath(c, size)
              : (c) => drawHeartPath(c, size);

    const halo = hasCutout ? (Number(this.cutoutHalo) || 12) : 0;
    const paperColor = this.cutoutPaperColor || '#FFFFFF';

    if (this.thickShadow !== false) {
      const depth = Number(this.depth3D) || 7;
      const shadowColor = this.shadowColor3D || '#000000';
      const dirX = this.dirX3D !== undefined ? this.dirX3D : 1;
      const dirY = this.dirY3D !== undefined ? this.dirY3D : 1;

      if (depth > 0) {
        ctx.save();
        ctx.fillStyle = shadowColor;
        ctx.strokeStyle = shadowColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const shadowLineWidth = hasCutout ? (halo * 2 + (isImage ? 0 : strokeWidth)) : (isImage ? 2 : strokeWidth);
        ctx.lineWidth = shadowLineWidth;

        const step = 0.5;
        for (let d = depth; d >= step; d -= step) {
          ctx.save();
          ctx.translate(d * dirX, d * dirY);
          drawFn(ctx);
          ctx.fill();
          if (shadowLineWidth > 0) ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }
    }

    if (hasCutout) {
      ctx.save();

      if (this.cutoutShadow !== false && !this.thickShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
      }

      drawFn(ctx);
      ctx.fillStyle = paperColor;
      ctx.fill();

      ctx.strokeStyle = paperColor;
      ctx.lineWidth = halo * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
    }

    if (this.dottedStroke && hasCutout) {
      const dotGap = Number(this.dottedGap) || 6;
      const dotSize = Number(this.dottedSize) || 2.5;
      const dotColor = this.dottedColor || '#000000';
      const inset = this.dottedInset !== undefined ? Number(this.dottedInset) : 1.5;

      const outerWidth = Math.max(2, (halo - inset) * 2);
      const innerWidth = Math.max(0, (halo - inset - dotSize) * 2);

      ctx.save();
      drawFn(ctx);
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = outerWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.setLineDash([dotSize * 1.5, dotGap]);
      ctx.lineDashOffset = 0;
      ctx.stroke();

      if (innerWidth > 0) {
        drawFn(ctx);
        ctx.fillStyle = paperColor;
        ctx.fill();
        ctx.strokeStyle = paperColor;
        ctx.lineWidth = innerWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (isImage && imageBuffers) {
      ctx.save();
      // Explicitly clear any shadow state left by previous render steps
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(imageBuffers.baseCanvas, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    } else {
      ctx.save();
      drawFn(ctx);
      ctx.fillStyle = this.fill || '#FF5BA7';
      ctx.fill();

      if (strokeWidth > 0) {
        ctx.strokeStyle = this.stroke || '#000000';
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.dottedStroke && !hasCutout) {
      const dotGap = Number(this.dottedGap) || 6;
      const dotSize = Number(this.dottedSize) || 2.5;
      const dotColor = this.dottedColor || '#000000';

      ctx.save();
      drawFn(ctx);
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = (isImage ? 2 : strokeWidth) + dotSize * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([dotSize * 1.5, dotGap]);
      ctx.stroke();
      ctx.restore();
    }
  };

  const originalToObject = obj.toObject.bind(obj);
  obj.toObject = function (propertiesToInclude = []) {
    return originalToObject([
      ...propertiesToInclude,
      'isStickerAsset', 'isImageSticker', 'assetShape', 'assetName',
      'cutoutEffect', 'cutoutHalo', 'cutoutPaperColor', 'cutoutShadow',
      'thickShadow', 'depth3D', 'shadowColor3D', 'dirX3D', 'dirY3D',
      'dottedStroke', 'dottedGap', 'dottedSize', 'dottedColor', 'dottedInset',
      'imageTint',
    ]);
  };
};

/**
 * ============================================================================
 * CREATE AND ADD VECTOR STICKER ASSET
 * ============================================================================
 */
export const createStickerAsset = (fabricCanvas, shapeId = 'heart', options = {}) => {
  if (!fabricCanvas) return null;

  const preset = STICKER_ASSETS.find((a) => a.id === shapeId) || STICKER_ASSETS[0];
  const w = preset.width || 120;
  const h = preset.height || 120;

  const centerLeft = options.left || 595 / 2 - w / 2;
  const centerTop = options.top || 842 / 2 - h / 2;

  const stickerObj = new fabric.FabricObject({
    left: centerLeft,
    top: centerTop,
    width: w,
    height: h,
    fill: options.fill || preset.defaultFill,
    stroke: options.stroke || preset.defaultStroke,
    strokeWidth: options.strokeWidth ?? preset.defaultStrokeWidth,
    strokeUniform: true,
    cornerColor: '#f43f5e',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    padding: 22,
    objectCaching: false,
    ...options,
  });

  stickerObj.isStickerAsset = true;
  stickerObj.isImageSticker = false;
  stickerObj.assetShape = shapeId;

  stickerObj.thickShadow = options.thickShadow ?? true;
  stickerObj.depth3D = options.depth3D ?? preset.defaultDepth3D;
  stickerObj.shadowColor3D = options.shadowColor3D || preset.defaultShadowColor;
  stickerObj.dirX3D = options.dirX3D ?? 1;
  stickerObj.dirY3D = options.dirY3D ?? 1;

  stickerObj.cutoutEffect = options.cutoutEffect ?? false;
  stickerObj.cutoutHalo = options.cutoutHalo ?? 12;
  stickerObj.cutoutPaperColor = options.cutoutPaperColor ?? '#FFFFFF';
  stickerObj.cutoutShadow = options.cutoutShadow ?? true;

  stickerObj.dottedStroke = options.dottedStroke ?? false;
  stickerObj.dottedGap = options.dottedGap ?? 6;
  stickerObj.dottedSize = options.dottedSize ?? 2.5;
  stickerObj.dottedColor = options.dottedColor ?? '#000000';
  stickerObj.dottedInset = options.dottedInset ?? 1.5;

  attachStickerRenderer(stickerObj);

  fabricCanvas.add(stickerObj);
  fabricCanvas.setActiveObject(stickerObj);
  fabricCanvas.requestRenderAll();

  return stickerObj;
};

/**
 * ============================================================================
 * CREATE AND ADD IMAGE CUTOUT STICKER ASSET
 * ============================================================================
 */
export const createImageStickerAsset = (fabricCanvas, imgElement, options = {}) => {
  if (!fabricCanvas || !imgElement) return null;

  const maxDim = 600;
  let w = imgElement.naturalWidth || imgElement.width || maxDim;
  let h = imgElement.naturalHeight || imgElement.height || maxDim;

  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h / w) * maxDim);
      w = maxDim;
    } else {
      w = Math.round((w / h) * maxDim);
      h = maxDim;
    }
  }

  const centerLeft = options.left !== undefined ? options.left : 595 / 2 - w / 2;
  const centerTop = options.top !== undefined ? options.top : 842 / 2 - h / 2;

  const stickerObj = new fabric.FabricImage(imgElement, {
    left: centerLeft,
    top: centerTop,
    width: w,
    height: h,
    cornerColor: '#f43f5e',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    padding: 24,
    objectCaching: false,
    ...options,
  });

  stickerObj.isStickerAsset = true;
  stickerObj.isImageSticker = true;
  stickerObj.assetShape = 'image';
  stickerObj.assetName = options.name || 'Custom Cutout';

  stickerObj.thickShadow = options.thickShadow ?? false;
  stickerObj.depth3D = options.depth3D ?? 7;
  stickerObj.shadowColor3D = options.shadowColor3D || '#000000';
  stickerObj.dirX3D = options.dirX3D ?? 1;
  stickerObj.dirY3D = options.dirY3D ?? 1;

  stickerObj.cutoutEffect = options.cutoutEffect ?? false;
  stickerObj.cutoutHalo = options.cutoutHalo ?? 10;
  stickerObj.cutoutPaperColor = options.cutoutPaperColor ?? '#FFFFFF';
  stickerObj.cutoutShadow = options.cutoutShadow ?? true;

  stickerObj.dottedStroke = options.dottedStroke ?? false;
  stickerObj.dottedGap = options.dottedGap ?? 6;
  stickerObj.dottedSize = options.dottedSize ?? 2.5;
  stickerObj.dottedColor = options.dottedColor ?? '#000000';
  stickerObj.dottedInset = options.dottedInset ?? 1.5;
  stickerObj.imageTint = options.imageTint || 'none';

  attachStickerRenderer(stickerObj);

  fabricCanvas.add(stickerObj);
  fabricCanvas.setActiveObject(stickerObj);
  fabricCanvas.requestRenderAll();

  return stickerObj;
};

/**
 * ============================================================================
 * HELPER SUB-COMPONENTS
 * ============================================================================
 */
const SliderRow = ({ label, unit, min, max, step, value, onChange }) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-[10px] text-slate-400">
      <span>{label}</span>
      <span className="font-mono text-slate-300">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(step % 1 !== 0 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
      className="w-full h-1 accent-rose-500 bg-slate-700 rounded-full cursor-pointer"
    />
  </div>
);

const StickerEffectRow = ({ label, icon, description, active, onToggle, last, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b ${last ? 'border-transparent' : 'border-slate-700/40'}`}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-slate-700/30 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          className={`w-3 h-3 text-slate-500 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-[11px] font-mono text-slate-400 shrink-0">{icon}</span>
        <span className="text-[11px] font-semibold text-slate-200 flex-1">{label}</span>
        <span className="text-[9px] text-slate-500 hidden group-hover:block">{description}</span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = !active;
            onToggle(next);
            if (next) setOpen(true);
          }}
          className={`relative w-7 h-4 rounded-full shrink-0 transition-colors duration-200 ${active ? 'bg-rose-500' : 'bg-slate-600'}`}
          title={active ? 'Disable' : 'Enable'}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200 ${active ? 'left-3.5' : 'left-0.5'}`}
          />
        </button>
      </div>

      {open && active && (
        <div className="px-3 pb-3 space-y-2 bg-slate-900/40">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * ============================================================================
 * STICKER EFFECTS PANEL
 * ============================================================================
 */
export const StickerEffectsPanel = ({ fabricCanvas, activeObject }) => {
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  if (!activeObject || !activeObject.isStickerAsset) return null;

  const update = (prop, val) => {
    if (!fabricCanvas || !activeObject) return;
    activeObject.set(prop, val);
    activeObject[prop] = val;
    activeObject._stickerBufferCache = null;
    activeObject.objectCaching = false;
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  const isImage = Boolean(activeObject.isImageSticker);
  const shapeLabel = isImage
    ? (activeObject.assetName || 'Cutout Graphic')
    : activeObject.assetShape === 'flower'
      ? 'Daisy Flower'
      : activeObject.assetShape === 'sparkle'
        ? 'Y2K Sparkle'
        : activeObject.assetShape === 'star'
          ? 'Retro Star'
          : activeObject.assetShape === 'rosette'
            ? 'Scallop Badge'
            : 'Retro Heart';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Sticker Effects
        </span>
        <span className="text-[9px] font-mono uppercase text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30 truncate max-w-[140px]">
          {shapeLabel}
        </span>
      </div>

      {!isImage ? (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Sticker Color</span>
            <span className="font-mono text-slate-400 uppercase text-[10px]">
              {activeObject.fill || '#FF5BA7'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow-inner">
              <input
                type="color"
                value={activeObject.fill || '#FF5BA7'}
                onChange={(e) => update('fill', e.target.value)}
                className="absolute -top-2 -left-2 w-11 h-11 cursor-pointer opacity-0"
              />
              <div className="w-full h-full" style={{ backgroundColor: activeObject.fill || '#FF5BA7' }} />
            </div>
            <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
              {STICKER_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => update('fill', c.hex)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full shrink-0 transition-transform hover:scale-110 ${activeObject.fill?.toLowerCase() === c.hex.toLowerCase()
                    ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-slate-800'
                    : 'opacity-80'}`}
                  style={{ backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.25)' }}
                />
              ))}
            </div>
          </div>
          <PrintSafetyWarning
            color={activeObject.fill || '#FF5BA7'}
            onChange={(safeHex) => update('fill', safeHex)}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Color Tint Overlay</span>
            <span className="font-mono text-slate-400 uppercase text-[10px]">
              {activeObject.imageTint === 'none' || !activeObject.imageTint ? 'ORIGINAL' : activeObject.imageTint}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => update('imageTint', 'none')}
              className={`px-2 py-1 rounded text-[10px] font-semibold border shrink-0 transition ${!activeObject.imageTint || activeObject.imageTint === 'none'
                ? 'border-rose-500 bg-rose-500/20 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              Original
            </button>
            {STICKER_PALETTE.map((c) => (
              <button
                key={c.hex}
                onClick={() => update('imageTint', c.hex)}
                title={c.name}
                className={`w-5 h-5 rounded-full shrink-0 transition-transform hover:scale-110 ${activeObject.imageTint?.toLowerCase() === c.hex.toLowerCase()
                  ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-slate-800'
                  : 'opacity-80'}`}
                style={{ backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.25)' }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 overflow-hidden divide-y divide-slate-700/40">
        <StickerEffectRow
          label="Die-Cut Border"
          icon="🏷️"
          active={Boolean(activeObject.cutoutEffect)}
          onToggle={(v) => update('cutoutEffect', v)}
        >
          <SliderRow
            label="Border Width" unit="px"
            min={4} max={26} step={1}
            value={activeObject.cutoutHalo ?? 10}
            onChange={(v) => update('cutoutHalo', v)}
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Border Color</span>
            <div className="flex items-center gap-1.5">
              {['#FFFFFF', '#FFFBEB', '#FDF2F8', '#1E293B', '#E11D48'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => update('cutoutPaperColor', hex)}
                  className={`w-4 h-4 rounded-full border border-slate-600 transition ${(activeObject.cutoutPaperColor || '#FFFFFF').toUpperCase() === hex.toUpperCase()
                    ? 'ring-2 ring-rose-500 scale-110'
                    : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
              <div className="relative w-4 h-4 rounded-full overflow-hidden border border-slate-600 cursor-pointer">
                <input
                  type="color"
                  value={activeObject.cutoutPaperColor || '#FFFFFF'}
                  onChange={(e) => update('cutoutPaperColor', e.target.value)}
                  className="absolute -top-2 -left-2 w-8 h-8 cursor-pointer opacity-0"
                />
                <div className="w-full h-full" style={{ backgroundColor: activeObject.cutoutPaperColor || '#FFFFFF' }} />
              </div>
            </div>
          </div>
        </StickerEffectRow>

        <StickerEffectRow
          label="Thick Shadow"
          icon="▪"
          active={activeObject.thickShadow !== false}
          onToggle={(v) => update('thickShadow', v)}
        >
          <SliderRow
            label="Depth" unit="px"
            min={0} max={22} step={1}
            value={activeObject.depth3D ?? 7}
            onChange={(v) => update('depth3D', v)}
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>Shadow color</span>
            <div className="relative w-5 h-5 rounded overflow-hidden border border-slate-600 cursor-pointer">
              <input
                type="color"
                value={activeObject.shadowColor3D || '#000000'}
                onChange={(e) => update('shadowColor3D', e.target.value)}
                className="absolute -top-2 -left-2 w-9 h-9 cursor-pointer opacity-0"
              />
              <div className="w-full h-full" style={{ backgroundColor: activeObject.shadowColor3D || '#000000' }} />
            </div>
          </div>
        </StickerEffectRow>

        <StickerEffectRow
          label="Dotted Stroke"
          icon="···"
          active={Boolean(activeObject.dottedStroke)}
          onToggle={(v) => update('dottedStroke', v)}
          last
        >
          <SliderRow
            label="Dot size" unit="px"
            min={1} max={6} step={0.5}
            value={activeObject.dottedSize ?? 2.5}
            onChange={(v) => update('dottedSize', v)}
          />
          <SliderRow
            label="Gap" unit="px"
            min={2} max={14} step={1}
            value={activeObject.dottedGap ?? 6}
            onChange={(v) => update('dottedGap', v)}
          />
          {Boolean(activeObject.cutoutEffect) && (
            <SliderRow
              label="Periphery Inset" unit="px"
              min={0} max={8} step={0.5}
              value={activeObject.dottedInset ?? 1.5}
              onChange={(v) => update('dottedInset', v)}
            />
          )}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>Dot color</span>
            <div className="relative w-5 h-5 rounded overflow-hidden border border-slate-600 cursor-pointer">
              <input
                type="color"
                value={activeObject.dottedColor || '#000000'}
                onChange={(e) => update('dottedColor', e.target.value)}
                className="absolute -top-2 -left-2 w-9 h-9 cursor-pointer opacity-0"
              />
              <div className="w-full h-full" style={{ backgroundColor: activeObject.dottedColor || '#000000' }} />
            </div>
          </div>
        </StickerEffectRow>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * STICKERS COMPONENT (Rendered by assets/index.jsx)
 * ============================================================================
 */
const Stickers = ({ fabricCanvas, activeObject, setActiveObject }) => {
  const isStickerSelected = Boolean(activeObject && activeObject.isStickerAsset);

  const handleAddSticker = (shapeId) => {
    if (!fabricCanvas) return;
    const sticker = createStickerAsset(fabricCanvas, shapeId);
    if (sticker && setActiveObject) {
      setActiveObject(sticker);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Assets & Stickers
          </span>
          <span className="text-[10px] text-amber-400 font-mono bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">
            Y2K 3D POP
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Retro pop stickers and custom image cutouts with customizable 3D shadow depth and die-cut borders.
        </p>
      </div>

      {/* Retro Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">Retro Stickers</span>
          <span className="text-[10px] font-mono text-slate-500">{STICKER_ASSETS.length} PRESETS</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STICKER_ASSETS.map((asset) => {
            const isSelected = isStickerSelected && !activeObject.isImageSticker && activeObject.assetShape === asset.id;

            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleAddSticker(asset.id)}
                className={`p-2 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 group relative overflow-hidden active:scale-95 ${isSelected
                  ? 'border-rose-500 bg-slate-800 ring-2 ring-rose-500/50 shadow-md'
                  : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600'}`}
              >
                <div className="w-14 h-14 rounded-lg flex items-center justify-center relative">
                  {asset.id === 'heart' && (
                    <svg viewBox="-60 -60 120 120" className="w-12 h-12 drop-shadow transition-transform group-hover:scale-105">
                      <path
                        d="M0,-14 C-18,-44 -56,-40 -56,-6 C-56,22 -28,36 0,50 C28,36 56,22 56,-6 C56,-40 18,-44 0,-14 Z"
                        fill="#000000"
                        transform="translate(5, 5)"
                      />
                      <path
                        d="M0,-14 C-18,-44 -56,-40 -56,-6 C-56,22 -28,36 0,50 C28,36 56,22 56,-6 C56,-40 18,-44 0,-14 Z"
                        fill="#FF5BA7"
                        stroke="#000000"
                        strokeWidth="4"
                      />
                    </svg>
                  )}

                  {asset.id === 'flower' && (
                    <svg viewBox="-60 -60 120 120" className="w-12 h-12 drop-shadow transition-transform group-hover:scale-105">
                      <g transform="translate(5, 5)" fill="#000000">
                        <circle cx="0" cy="-28" r="19" />
                        <circle cx="27" cy="-9" r="19" />
                        <circle cx="17" cy="23" r="19" />
                        <circle cx="-17" cy="23" r="19" />
                        <circle cx="-27" cy="-9" r="19" />
                        <circle cx="0" cy="0" r="22" />
                      </g>
                      <g fill="#FF5BA7" stroke="#000000" strokeWidth="4">
                        <circle cx="0" cy="-28" r="19" />
                        <circle cx="27" cy="-9" r="19" />
                        <circle cx="17" cy="23" r="19" />
                        <circle cx="-17" cy="23" r="19" />
                        <circle cx="-27" cy="-9" r="19" />
                        <circle cx="0" cy="0" r="22" />
                      </g>
                    </svg>
                  )}

                  {asset.id === 'sparkle' && (
                    <svg viewBox="-60 -60 120 120" className="w-12 h-12 drop-shadow transition-transform group-hover:scale-105">
                      <path d="M0,-48 Q10,-10 48,0 Q10,10 0,48 Q-10,10 -48,0 Q-10,-10 0,-48 Z"
                        fill="#000000" transform="translate(5, 5)" />
                      <path d="M0,-48 Q10,-10 48,0 Q10,10 0,48 Q-10,-10 0,-48 Z"
                        fill="#FB923C" stroke="#000000" strokeWidth="4" />
                    </svg>
                  )}

                  {asset.id === 'star' && (
                    <svg viewBox="-60 -60 120 120" className="w-12 h-12 drop-shadow transition-transform group-hover:scale-105">
                      <polygon points="0,-46 14,-15 46,-12 22,10 29,42 0,26 -29,42 -22,10 -46,-12 -14,-15"
                        fill="#000000" transform="translate(5, 5)" />
                      <polygon points="0,-46 14,-15 46,-12 22,10 29,42 0,26 -29,42 -22,10 -46,-12 -14,-15"
                        fill="#FCE762" stroke="#000000" strokeWidth="4" />
                    </svg>
                  )}

                  {asset.id === 'rosette' && (
                    <svg viewBox="-60 -60 120 120" className="w-12 h-12 drop-shadow transition-transform group-hover:scale-105">
                      <circle cx="0" cy="0" r="38" fill="#000000" transform="translate(5, 5)" />
                      <circle cx="0" cy="0" r="38" fill="#C084FC" stroke="#000000" strokeWidth="4" />
                    </svg>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-200 truncate w-full text-center">
                  {asset.name}
                </span>
                <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                  + Add
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Stickers;
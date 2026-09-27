import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import PrintSafetyWarning from '../PrintSafetyWarning';

/**
 * ============================================================================
 * COMIC, STITCHED, SCALLOP & SCISSOR-CUT PAPER STICKER ENGINE
 * Universal Shapes on Left • Universal Theme Styles & Patterns on Right
 * ============================================================================
 */

// Universal Palette
export const BOX_PALETTE = [
  { name: 'Pastel Pink', hex: '#F4A6B8' },
  { name: 'Biscuit Peach', hex: '#EFC3A4' },
  { name: 'Pastel Yellow', hex: '#FDF082' },
  { name: 'Baby Sky Blue', hex: '#BDE0FE' },
  { name: 'Mint Green', hex: '#C7F9CC' },
  { name: 'Lavender', hex: '#E2C6FF' },
  { name: 'Pop Red', hex: '#E63946' },
  { name: 'Paper White', hex: '#FFFFFF' },
  { name: 'Ink Black', hex: '#111111' },
];

// Base Shapes for Assets Sidebar
export const SHAPE_PRESETS = [
  {
    id: 'shape-pill',
    name: 'Pill / Capsule',
    shape: 'pill',
    width: 280,
    height: 95,
    fill: '#F4A6B8',
    boxStyle: 'sticker',
    bgPattern: 'none',
  },
  {
    id: 'shape-rect',
    name: 'Rectangle',
    shape: 'rectangle',
    width: 270,
    height: 150,
    fill: '#E63946',
    boxStyle: 'comic',
    bgPattern: 'none',
  },
  {
    id: 'shape-square',
    name: 'Square',
    shape: 'square',
    width: 190,
    height: 190,
    fill: '#EFC3A4',
    boxStyle: 'scallop',
    bgPattern: 'none',
  },
  {
    id: 'shape-circle',
    name: 'Circle',
    shape: 'circle',
    width: 190,
    height: 190,
    fill: '#BDE0FE',
    boxStyle: 'stitched',
    bgPattern: 'stars',
  },
  {
    id: 'shape-flower',
    name: 'Flower Badge',
    shape: 'flower',
    width: 210,
    height: 210,
    fill: '#C7F9CC',
    boxStyle: 'flat',
    bgPattern: 'dots',
  },
];

/**
 * Deterministic Pseudo-Random Generator
 * Guarantees smooth, glitch-free re-renders with fixed seed
 */
const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Clean, artifact-free rounded rectangle contour
 */
export const drawCleanRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

/**
 * Helper to get polygonal vertices for rectangles, pills, and custom shapes
 */
export const getShapeVertices = (shapeType, w, h, polygonPoints = null) => {
  if (shapeType === 'polygon' && Array.isArray(polygonPoints) && polygonPoints.length >= 3) {
    return polygonPoints;
  }
  if (shapeType === 'pill') {
    const r = Math.min(w, h) / 2;
    const halfW = Math.max(0, w / 2 - r);
    const pts = [];
    pts.push({ x: -halfW, y: -r });
    pts.push({ x: halfW, y: -r });
    for (let a = -Math.PI / 2; a <= Math.PI / 2; a += Math.PI / 6) {
      pts.push({ x: halfW + Math.cos(a) * r, y: Math.sin(a) * r });
    }
    pts.push({ x: halfW, y: r });
    pts.push({ x: -halfW, y: r });
    for (let a = Math.PI / 2; a <= (3 * Math.PI) / 2; a += Math.PI / 6) {
      pts.push({ x: -halfW + Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return pts;
  }
  if (shapeType === 'circle') {
    const pts = [];
    const rX = w / 2;
    const rY = h / 2;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      pts.push({ x: Math.cos(angle) * rX, y: Math.sin(angle) * rY });
    }
    return pts;
  }
  // Default Rectangle / Square corners
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];
};

/**
 * ============================================================================
 * SCISSOR-CUT PAPER CONTOUR GENERATOR (IMAGE 2)
 * Generates straight-cut polygonal snips that zig-zag around the silhouette
 * ============================================================================
 */
export const getScissorCutPolygon = (
  shapeType,
  w,
  h,
  polygonPoints = null,
  margin = 14,
  snipSize = 34,
  roughness = 0.45,
  seed = 42
) => {
  const baseVertices = getShapeVertices(shapeType, w, h, polygonPoints);
  if (!baseVertices || baseVertices.length < 3) return [];

  // Determine clockwise orientation
  let signedArea = 0;
  for (let i = 0; i < baseVertices.length; i++) {
    const p1 = baseVertices[i];
    const p2 = baseVertices[(i + 1) % baseVertices.length];
    signedArea += p1.x * p2.y - p2.x * p1.y;
  }
  const isClockwise = signedArea >= 0;
  const normalSign = isClockwise ? 1 : -1;

  const scissorPts = [];
  let ptIndex = 0;

  for (let i = 0; i < baseVertices.length; i++) {
    const p1 = baseVertices[i];
    const p2 = baseVertices[(i + 1) % baseVertices.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);

    if (len < 1) continue;

    const ux = dx / len;
    const uy = dy / len;
    const nx = (dy / len) * normalSign;
    const ny = (-dx / len) * normalSign;

    const snipCount = Math.max(1, Math.round(len / snipSize));
    const step = len / snipCount;

    for (let j = 0; j < snipCount; j++) {
      const t = (j + 0.5) / snipCount;
      const baseX = p1.x + ux * (t * len);
      const baseY = p1.y + uy * (t * len);

      // Scissor angle & distance fluctuations
      const r1 = pseudoRandom(seed + ptIndex * 19.31);
      const r2 = pseudoRandom(seed + ptIndex * 37.19);
      ptIndex++;

      const radialDist = margin * (0.85 + (r1 - 0.5) * roughness * 1.5);
      const tangentDist = (r2 - 0.5) * snipSize * 0.35 * roughness;

      scissorPts.push({
        x: baseX + nx * radialDist + ux * tangentDist,
        y: baseY + ny * radialDist + uy * tangentDist,
      });
    }

    // Corner snip (scissors make a distinct diagonal corner cut)
    const cornerR = pseudoRandom(seed + ptIndex * 23.47);
    const cornerDist = margin * (1.05 + (cornerR - 0.5) * roughness);
    scissorPts.push({
      x: p2.x + nx * cornerDist,
      y: p2.y + ny * cornerDist,
    });
    ptIndex++;
  }

  return scissorPts;
};

/**
 * Draw Scissor Cut Paper Path (Crisp straight cuts with miter corners)
 */
export const drawScissorCutPath = (ctx, scissorPts) => {
  if (!scissorPts || scissorPts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(scissorPts[0].x, scissorPts[0].y);
  for (let i = 1; i < scissorPts.length; i++) {
    ctx.lineTo(scissorPts[i].x, scissorPts[i].y);
  }
  ctx.closePath();
};

/**
 * Universal Scalloped Biscuit Algorithm
 */
export const drawScallopedPolygon = (ctx, pts, scallopSize = 22) => {
  if (!pts || pts.length < 3) return;

  let signedArea = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    signedArea += p1.x * p2.y - p2.x * p1.y;
  }
  const isClockwise = signedArea >= 0;
  const normalSign = isClockwise ? 1 : -1;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);

    if (len < 1) continue;

    const ux = dx / len;
    const uy = dy / len;
    const nx = (dy / len) * normalSign;
    const ny = (-dx / len) * normalSign;

    const count = Math.max(1, Math.round(len / scallopSize));
    const step = len / count;
    const bulge = Math.min(step * 0.45, 12);

    for (let j = 0; j < count; j++) {
      const startX = p1.x + ux * (j * step);
      const startY = p1.y + uy * (j * step);
      const endX = p1.x + ux * ((j + 1) * step);
      const endY = p1.y + uy * ((j + 1) * step);
      const midX = (startX + endX) / 2 + nx * bulge;
      const midY = (startY + endY) / 2 + ny * bulge;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
    }
  }
  ctx.closePath();
};

/**
 * Helper to draw Scalloped Rosette / Flower Path
 */
export const drawFlowerBoxPath = (ctx, w, h, petals = 12) => {
  const rx = w / 2;
  const ry = h / 2;
  const step = (Math.PI * 2) / petals;
  ctx.beginPath();
  for (let i = 0; i < petals; i++) {
    const a1 = i * step;
    const aMid = a1 + step / 2;
    const a2 = (i + 1) * step;
    const rInX = rx * 0.82;
    const rInY = ry * 0.82;

    const x1 = Math.cos(a1) * rInX;
    const y1 = Math.sin(a1) * rInY;
    const xMid = Math.cos(aMid) * rx;
    const yMid = Math.sin(aMid) * ry;
    const x2 = Math.cos(a2) * rInX;
    const y2 = Math.sin(a2) * rInY;

    if (i === 0) ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(xMid, yMid, x2, y2);
  }
  ctx.closePath();
};

/**
 * Generic Shape Contour
 */
export const drawBoxShapePath = (
  ctx,
  shapeType,
  w,
  h,
  cornerRadius = 14,
  polygonPoints = null,
  petals = 12,
  boxStyle = 'flat',
  scallopSize = 22
) => {
  if (boxStyle === 'scallop') {
    if (shapeType === 'circle') {
      drawFlowerBoxPath(ctx, w, h, Math.max(8, Math.round((Math.PI * (w + h)) / (2 * scallopSize))));
      return;
    }
    const vertices = getShapeVertices(shapeType, w, h, polygonPoints);
    drawScallopedPolygon(ctx, vertices, scallopSize);
    return;
  }

  if (shapeType === 'circle') {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
    ctx.closePath();
  } else if (shapeType === 'flower') {
    drawFlowerBoxPath(ctx, w, h, petals);
  } else if (shapeType === 'pill') {
    const r = Math.min(w, h) / 2;
    drawCleanRoundedRect(ctx, -w / 2, -h / 2, w, h, r);
  } else if (shapeType === 'polygon' && Array.isArray(polygonPoints) && polygonPoints.length >= 3) {
    ctx.beginPath();
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.closePath();
  } else {
    // Default Rectangle / Square
    drawCleanRoundedRect(ctx, -w / 2, -h / 2, w, h, cornerRadius);
  }
};

/**
 * 5-Point Mini Star for Pattern
 */
const drawMiniStar = (ctx, cx, cy, outerR = 6, innerR = 3) => {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
};

/**
 * Background Pattern Renderer
 */
export const renderBoxPattern = (ctx, w, h, patternType, patternColor = 'rgba(255,255,255,0.6)') => {
  if (!patternType || patternType === 'none') return;

  ctx.save();
  if (patternType === 'stripes') {
    const stripeGap = 16;
    const totalDist = w + h + 100;
    ctx.strokeStyle = patternColor;
    ctx.lineWidth = stripeGap / 2;
    for (let x = -totalDist; x < totalDist; x += stripeGap) {
      ctx.beginPath();
      ctx.moveTo(x, -h / 2 - 50);
      ctx.lineTo(x + totalDist, totalDist - h / 2);
      ctx.stroke();
    }
  } else if (patternType === 'dots') {
    const spacing = 20;
    const dotR = 3.5;
    ctx.fillStyle = patternColor;
    for (let y = -h / 2 - spacing; y <= h / 2 + spacing; y += spacing) {
      const rowShift = (Math.round((y + h / 2) / spacing) % 2) * (spacing / 2);
      for (let x = -w / 2 - spacing; x <= w / 2 + spacing; x += spacing) {
        ctx.beginPath();
        ctx.arc(x + rowShift, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (patternType === 'stars') {
    const spacingX = 26;
    const spacingY = 22;
    ctx.fillStyle = patternColor;
    for (let y = -h / 2 - spacingY; y <= h / 2 + spacingY; y += spacingY) {
      const rowShift = (Math.round((y + h / 2) / spacingY) % 2) * (spacingX / 2);
      for (let x = -w / 2 - spacingX; x <= w / 2 + spacingX; x += spacingX) {
        drawMiniStar(ctx, x + rowShift, y, 5, 2.5);
      }
    }
  }
  ctx.restore();
};

/**
 * ============================================================================
 * ATTACH UNIVERSAL BOX RENDERER
 * ============================================================================
 */
export const attachComicBoxRenderer = (boxObj) => {
  boxObj.isComicBox = true;

  if (boxObj.cacheProperties) {
    boxObj.cacheProperties = [
      ...boxObj.cacheProperties,
      'isComicBox',
      'boxShape',
      'boxStyle',
      'bgPattern',
      'patternColor',
      'boxBorderColor',
      'boxBorderWidth',
      'boxCornerRadius',
      'shadowOffsetX',
      'shadowOffsetY',
      'shadowColor',
      'stitchColor',
      'stitchWidth',
      'stitchOffset',
      'scallopSize',
      'stickerBorderWidth',
      'stickerBorderColor',
      'stickerShadowDepth',
      'scissorSnipSize',
      'scissorRoughness',
      'scissorSeed',
      'polygonPoints',
      'petals',
    ];
  }

  boxObj._render = function (ctx) {
    const w = this.width;
    const h = this.height;
    const shapeType = this.boxShape || 'rectangle';
    const styleType = this.boxStyle || 'comic';
    const shadowX = Number(this.shadowOffsetX ?? 5);
    const shadowY = Number(this.shadowOffsetY ?? 5);
    const shadowColor = this.shadowColor || '#111111';
    const hasComicShadow = styleType === 'comic' && (shadowX !== 0 || shadowY !== 0);
    const borderWidth = Number(this.boxBorderWidth ?? 0);
    const borderColor = this.boxBorderColor || '#111111';
    const fillColor = this.fill || '#F4A6B8';
    const cornerRadius = Number(this.boxCornerRadius ?? 14);
    const petals = Number(this.petals ?? 12);
    const scallopSize = Number(this.scallopSize ?? 22);
    const bgPattern = this.bgPattern || 'none';
    const patternColor = this.patternColor || 'rgba(255, 255, 255, 0.65)';

    // Paper Cutout Sticker Settings
    const stickerMargin = Number(this.stickerBorderWidth ?? 15);
    const stickerColor = this.stickerBorderColor || '#FFFFFF';
    const stickerDepth = Number(this.stickerShadowDepth ?? 7);
    const snipSize = Number(this.scissorSnipSize ?? 34);
    const roughness = Number(this.scissorRoughness ?? 0.45);
    const seed = Number(this.scissorSeed ?? 42);

    // 1. Comic Hard Drop Shadow
    if (hasComicShadow) {
      ctx.save();
      ctx.translate(shadowX, shadowY);
      drawBoxShapePath(ctx, shapeType, w, h, cornerRadius, this.polygonPoints, petals, styleType, scallopSize);
      ctx.fillStyle = shadowColor;
      ctx.fill();
      if (borderWidth > 0) {
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = borderWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. SCISSOR-CUT PAPER STICKER EFFECT (IMAGE 2)
    if (styleType === 'sticker') {
      const scissorPts = getScissorCutPolygon(
        shapeType,
        w,
        h,
        this.polygonPoints,
        stickerMargin,
        snipSize,
        roughness,
        seed
      );

      // Layer 1: Directional soft paper shadow
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
      ctx.shadowBlur = Math.max(4, stickerDepth * 1.4);
      ctx.shadowOffsetX = stickerDepth * 0.35;
      ctx.shadowOffsetY = stickerDepth;
      drawScissorCutPath(ctx, scissorPts);
      ctx.fillStyle = stickerColor;
      ctx.fill();
      ctx.restore();

      // Layer 2: Close contact shadow for realistic depth
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5;
      drawScissorCutPath(ctx, scissorPts);
      ctx.fillStyle = stickerColor;
      ctx.fill();
      ctx.restore();

      // Layer 3: Solid paper backing fill
      ctx.save();
      drawScissorCutPath(ctx, scissorPts);
      ctx.fillStyle = stickerColor;
      ctx.fill();

      // Layer 4: Subtle crisp cut paper edge stroke
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 0.8;
      ctx.lineJoin = 'miter';
      ctx.miterLimit = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Base Body Shape Fill
    ctx.save();
    drawBoxShapePath(ctx, shapeType, w, h, cornerRadius, this.polygonPoints, petals, styleType, scallopSize);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // 4. Background Pattern Fill
    if (bgPattern !== 'none') {
      ctx.save();
      ctx.clip();
      renderBoxPattern(ctx, w, h, bgPattern, patternColor);
      ctx.restore();
    }

    // 5. Inset Stitched Seam (Stitched Style)
    if (styleType === 'stitched') {
      const offset = Number(this.stitchOffset ?? 8);
      const inW = Math.max(10, w - offset * 2);
      const inH = Math.max(10, h - offset * 2);

      ctx.save();
      ctx.strokeStyle = this.stitchColor || '#FFFFFF';
      ctx.lineWidth = Number(this.stitchWidth ?? 2);
      ctx.setLineDash([6, 5]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let innerPoints = null;
      if (shapeType === 'polygon' && Array.isArray(this.polygonPoints)) {
        const scaleX = inW / w;
        const scaleY = inH / h;
        innerPoints = this.polygonPoints.map((pt) => ({
          x: pt.x * scaleX,
          y: pt.y * scaleY,
        }));
      }

      drawBoxShapePath(ctx, shapeType, inW, inH, Math.max(2, cornerRadius - offset / 2), innerPoints, petals, 'flat');
      ctx.stroke();
      ctx.restore();
    }

    // 6. Solid Outer Border (For Comic, Scallop, or Flat)
    if (borderWidth > 0 && styleType !== 'stitched' && styleType !== 'sticker') {
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([]);
      drawBoxShapePath(ctx, shapeType, w, h, cornerRadius, this.polygonPoints, petals, styleType, scallopSize);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  const originalToObject = boxObj.toObject.bind(boxObj);
  boxObj.toObject = function (propertiesToInclude = []) {
    return originalToObject([
      ...propertiesToInclude,
      'isComicBox',
      'boxShape',
      'boxStyle',
      'bgPattern',
      'patternColor',
      'boxBorderColor',
      'boxBorderWidth',
      'boxCornerRadius',
      'shadowOffsetX',
      'shadowOffsetY',
      'shadowColor',
      'stitchColor',
      'stitchWidth',
      'stitchOffset',
      'scallopSize',
      'stickerBorderWidth',
      'stickerBorderColor',
      'stickerShadowDepth',
      'scissorSnipSize',
      'scissorRoughness',
      'scissorSeed',
      'polygonPoints',
      'petals',
    ]);
  };
};

/**
 * ============================================================================
 * FACTORY: CREATE BOX OBJECT
 * ============================================================================
 */
export const createComicBox = (fabricCanvas, shape = 'rectangle', options = {}) => {
  if (!fabricCanvas) return null;

  const w = options.width || (shape === 'pill' ? 280 : shape === 'square' ? 190 : 260);
  const h = options.height || (shape === 'pill' ? 95 : shape === 'square' ? 190 : 150);

  const left = options.left !== undefined ? options.left : 595 / 2;
  const top = options.top !== undefined ? options.top : 842 / 2;

  const defaultStyle = options.boxStyle || (shape === 'pill' ? 'sticker' : 'comic');
  const defaultBorderWidth = options.boxBorderWidth ?? (defaultStyle === 'comic' ? 2.75 : 0);

  const boxObj = new fabric.FabricObject({
    left,
    top,
    width: w,
    height: h,
    originX: 'center',
    originY: 'center',
    fill: options.fill || '#F4A6B8',
    cornerColor: '#f43f5e',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    padding: 16,
    objectCaching: false,
    ...options,
  });

  boxObj.isComicBox = true;
  boxObj.boxShape = shape;
  boxObj.boxStyle = defaultStyle;
  boxObj.bgPattern = options.bgPattern || 'none';
  boxObj.patternColor = options.patternColor || 'rgba(255, 255, 255, 0.65)';
  boxObj.boxBorderColor = options.boxBorderColor || '#111111';
  boxObj.boxBorderWidth = defaultBorderWidth;
  boxObj.boxCornerRadius = options.boxCornerRadius ?? 14;
  boxObj.shadowOffsetX = options.shadowOffsetX ?? 5;
  boxObj.shadowOffsetY = options.shadowOffsetY ?? 5;
  boxObj.shadowColor = options.shadowColor || '#111111';
  boxObj.stitchColor = options.stitchColor || '#FFFFFF';
  boxObj.stitchWidth = options.stitchWidth ?? 2;
  boxObj.stitchOffset = options.stitchOffset ?? 8;
  boxObj.scallopSize = options.scallopSize ?? 22;
  boxObj.stickerBorderWidth = options.stickerBorderWidth ?? 15;
  boxObj.stickerBorderColor = options.stickerBorderColor || '#FFFFFF';
  boxObj.stickerShadowDepth = options.stickerShadowDepth ?? 7;
  boxObj.scissorSnipSize = options.scissorSnipSize ?? 34;
  boxObj.scissorRoughness = options.scissorRoughness ?? 0.45;
  boxObj.scissorSeed = options.scissorSeed || Math.floor(Math.random() * 100000);
  boxObj.polygonPoints = options.polygonPoints || null;
  boxObj.petals = options.petals || 12;

  attachComicBoxRenderer(boxObj);

  fabricCanvas.add(boxObj);
  boxObj.setCoords();
  fabricCanvas.setActiveObject(boxObj);
  fabricCanvas.requestRenderAll();

  return boxObj;
};

/**
 * Helper to get unzoomed scene pointer
 */
const getPointerFromEvent = (canvas, e) => {
  if (canvas.getScenePoint && e.e) return canvas.getScenePoint(e.e);
  if (canvas.getPointer && e.e) return canvas.getPointer(e.e);
  if (e.scenePoint) return e.scenePoint;

  const zoom = canvas.getZoom() || 1;
  const vpt = canvas.viewportTransform || [zoom, 0, 0, zoom, 0, 0];
  const rect = canvas.upperCanvasEl?.getBoundingClientRect();
  if (rect && e.e) {
    return {
      x: (e.e.clientX - rect.left - vpt[4]) / vpt[0],
      y: (e.e.clientY - rect.top - vpt[5]) / vpt[3],
    };
  }
  return { x: 0, y: 0 };
};

/**
 * ============================================================================
 * MAIN ASSETS TAB (LEFT SIDEBAR): BOX SHAPES & PEN TOOL
 * ============================================================================
 */
const Boxes = ({ fabricCanvas, activeObject, setActiveObject }) => {
  const [isPenActive, setIsPenActive] = useState(false);
  const [perfectOrtho, setPerfectOrtho] = useState(true);
  const [placedDots, setPlacedDots] = useState([]);
  const [currentPointer, setCurrentPointer] = useState(null);
  const [isClosingHover, setIsClosingHover] = useState(false);
  const [activeGuides, setActiveGuides] = useState([]);

  const isPenActiveRef = useRef(isPenActive);
  isPenActiveRef.current = isPenActive;
  const perfectOrthoRef = useRef(perfectOrtho);
  perfectOrthoRef.current = perfectOrtho;
  const placedDotsRef = useRef(placedDots);
  placedDotsRef.current = placedDots;
  const currentPointerRef = useRef(currentPointer);
  currentPointerRef.current = currentPointer;
  const isClosingHoverRef = useRef(isClosingHover);
  isClosingHoverRef.current = isClosingHover;
  const activeGuidesRef = useRef(activeGuides);
  activeGuidesRef.current = activeGuides;

  const handleStartPen = () => {
    if (!fabricCanvas) return;
    fabricCanvas.discardActiveObject();
    if (setActiveObject) setActiveObject(null);
    fabricCanvas.requestRenderAll();
    setPlacedDots([]);
    setCurrentPointer(null);
    setIsClosingHover(false);
    setActiveGuides([]);
    setIsPenActive(true);
  };

  const handleCancelPen = () => {
    setIsPenActive(false);
    setPlacedDots([]);
    setCurrentPointer(null);
    setIsClosingHover(false);
    setActiveGuides([]);
    if (fabricCanvas) {
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.selection = true;
      if (fabricCanvas.contextTop && fabricCanvas.clearContext) {
        fabricCanvas.clearContext(fabricCanvas.contextTop);
      }
      fabricCanvas.requestRenderAll();
    }
  };

  useEffect(() => {
    if (!fabricCanvas || !isPenActive) return;

    fabricCanvas.defaultCursor = 'crosshair';
    fabricCanvas.selection = false;

    const renderPenOverlay = () => {
      const ctx = fabricCanvas.getTopContext?.() || fabricCanvas.contextTop;
      if (!ctx) return;

      const zoom = fabricCanvas.getZoom() || 1;
      const vpt = fabricCanvas.viewportTransform || [zoom, 0, 0, zoom, 0, 0];

      ctx.save();
      ctx.transform(...vpt);

      const dots = placedDotsRef.current;
      const ptr = currentPointerRef.current;
      const ortho = perfectOrthoRef.current;
      const closing = isClosingHoverRef.current;
      const guides = activeGuidesRef.current;

      // Smart alignment guidelines
      if (guides && guides.length > 0) {
        guides.forEach((guide) => {
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5 / zoom;
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.beginPath();
          ctx.moveTo(guide.from.x, guide.from.y);
          ctx.lineTo(guide.to.x, guide.to.y);
          ctx.stroke();

          const label = guide.dotIndex === 0 ? 'Align Dot 1' : `Align Dot ${guide.dotIndex + 1}`;
          ctx.font = `bold ${9 / zoom}px sans-serif`;
          const textW = ctx.measureText(label).width;
          const badgeW = textW + 10 / zoom;
          const badgeH = 15 / zoom;

          const midX = (guide.from.x + guide.to.x) / 2;
          const midY = (guide.from.y + guide.to.y) / 2;
          const badgeX = guide.type === 'x' ? guide.to.x + 6 / zoom : midX - badgeW / 2;
          const badgeY = guide.type === 'x' ? midY - badgeH / 2 : guide.to.y - 16 / zoom;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1 / zoom;
          ctx.setLineDash([]);
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / zoom);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, badgeX + badgeW / 2, badgeY + badgeH / 2);
          ctx.restore();
        });
      }

      // Lines between dots
      if (dots.length > 1) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(dots[0].x, dots[0].y);
        for (let i = 1; i < dots.length; i++) {
          ctx.lineTo(dots[i].x, dots[i].y);
        }
        ctx.stroke();
      }

      // Cursor rubberband line
      if (dots.length > 0 && ptr) {
        ctx.strokeStyle = closing ? '#10b981' : ortho ? '#38bdf8' : '#f43f5e';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 3 / zoom]);
        ctx.beginPath();
        const lastDot = dots[dots.length - 1];
        ctx.moveTo(lastDot.x, lastDot.y);
        ctx.lineTo(ptr.x, ptr.y);
        ctx.stroke();
      }

      // Placed Dots
      dots.forEach((dot, index) => {
        const isFirstDot = index === 0;
        const canClose = dots.length >= 3 && isFirstDot;

        if (canClose) {
          ctx.save();
          ctx.strokeStyle = closing ? '#10b981' : '#38bdf8';
          ctx.lineWidth = (closing ? 2.5 : 1.5) / zoom;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, (closing ? 11 : 8) / zoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = isFirstDot && canClose ? (closing ? '#10b981' : '#38bdf8') : '#f43f5e';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 2 / zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.font = `bold ${9 / zoom}px monospace`;
        ctx.fillStyle = isFirstDot && canClose ? (closing ? '#10b981' : '#38bdf8') : '#f43f5e';
        ctx.fillText(
          isFirstDot && canClose ? (closing ? 'CLOSE' : '1 (Close)') : `${index + 1}`,
          dot.x + 7 / zoom,
          dot.y - 7 / zoom
        );
        ctx.restore();
      });

      // Pointer dot
      if (ptr && !closing) {
        ctx.fillStyle = guides.length > 0 ? '#38bdf8' : ortho ? '#38bdf8' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(ptr.x, ptr.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Top HUD
      const hudText =
        dots.length >= 3
          ? `Click Dot 1 to close • Esc to cancel`
          : `Click to place point ${dots.length + 1} • Esc to cancel`;

      ctx.save();
      ctx.font = `bold ${10 / zoom}px sans-serif`;
      const metrics = ctx.measureText(hudText);
      const hudW = metrics.width + 20 / zoom;
      const hudH = 20 / zoom;
      const hudX = (595 - hudW) / 2;
      const hudY = 16 / zoom;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = closing ? '#10b981' : guides.length > 0 ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(hudX, hudY, hudW, hudH, 5 / zoom);
      } else {
        ctx.rect(hudX, hudY, hudW, hudH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudText, 595 / 2, hudY + hudH / 2);
      ctx.restore();

      ctx.restore();
    };

    const handleMouseMove = (e) => {
      const rawPtr = getPointerFromEvent(fabricCanvas, e);
      const dots = placedDotsRef.current;
      const ortho = perfectOrthoRef.current;
      const zoom = fabricCanvas.getZoom() || 1;

      let constrained = { ...rawPtr };
      let nearFirstDot = false;
      const foundGuides = [];

      if (dots.length >= 3) {
        const snapThreshold = 18 / zoom;
        const distToStart = Math.hypot(rawPtr.x - dots[0].x, rawPtr.y - dots[0].y);
        if (distToStart <= snapThreshold) {
          constrained = { x: dots[0].x, y: dots[0].y };
          nearFirstDot = true;
        }
      }

      if (!nearFirstDot && dots.length > 0) {
        const lastDot = dots[dots.length - 1];

        if (ortho) {
          const dx = Math.abs(rawPtr.x - lastDot.x);
          const dy = Math.abs(rawPtr.y - lastDot.y);
          const isHorizontal = dx >= dy;
          const snapTolerance = 18 / zoom;

          if (isHorizontal) {
            constrained.y = lastDot.y;
            constrained.x = rawPtr.x;

            const candidates = [dots[0], ...dots.slice(1, -1)];
            let bestMatch = null;
            let minDiff = snapTolerance;

            for (let i = 0; i < candidates.length; i++) {
              const d = candidates[i];
              const diff = Math.abs(constrained.x - d.x);
              if (diff < minDiff) {
                minDiff = diff;
                bestMatch = { dot: d, index: dots.indexOf(d) };
              }
            }

            if (bestMatch) {
              constrained.x = bestMatch.dot.x;
              foundGuides.push({
                type: 'x',
                dotIndex: bestMatch.index,
                from: { x: bestMatch.dot.x, y: bestMatch.dot.y },
                to: { x: constrained.x, y: constrained.y },
              });
            }
          } else {
            constrained.x = lastDot.x;
            constrained.y = rawPtr.y;

            const candidates = [dots[0], ...dots.slice(1, -1)];
            let bestMatch = null;
            let minDiff = snapTolerance;

            for (let i = 0; i < candidates.length; i++) {
              const d = candidates[i];
              const diff = Math.abs(constrained.y - d.y);
              if (diff < minDiff) {
                minDiff = diff;
                bestMatch = { dot: d, index: dots.indexOf(d) };
              }
            }

            if (bestMatch) {
              constrained.y = bestMatch.dot.y;
              foundGuides.push({
                type: 'y',
                dotIndex: bestMatch.index,
                from: { x: bestMatch.dot.x, y: bestMatch.dot.y },
                to: { x: constrained.x, y: constrained.y },
              });
            }
          }
        }
      }

      isClosingHoverRef.current = nearFirstDot;
      setIsClosingHover(nearFirstDot);

      activeGuidesRef.current = foundGuides;
      setActiveGuides(foundGuides);

      currentPointerRef.current = constrained;
      setCurrentPointer(constrained);
      fabricCanvas.requestRenderAll();
    };

    const handleMouseDown = (e) => {
      if (e.e.button !== 0) return;

      const dots = placedDotsRef.current;
      const zoom = fabricCanvas.getZoom() || 1;
      const rawPtr = getPointerFromEvent(fabricCanvas, e);
      const snapThreshold = 18 / zoom;

      const isClosingClick =
        dots.length >= 3 &&
        (isClosingHoverRef.current ||
          Math.hypot(rawPtr.x - dots[0].x, rawPtr.y - dots[0].y) <= snapThreshold);

      if (isClosingClick) {
        const xs = dots.map((p) => p.x);
        const ys = dots.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = Math.max(20, maxX - minX);
        const height = Math.max(20, maxY - minY);
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        const polyPoints = dots.map((p) => ({
          x: p.x - centerX,
          y: p.y - centerY,
        }));

        const newBox = createComicBox(fabricCanvas, 'polygon', {
          left: centerX,
          top: centerY,
          width,
          height,
          fill: '#F4A6B8',
          boxStyle: 'sticker',
          polygonPoints: polyPoints,
        });

        if (newBox && setActiveObject) setActiveObject(newBox);
        handleCancelPen();
        return;
      }

      const ptr = currentPointerRef.current || rawPtr;
      const nextDots = [...dots, ptr];
      setPlacedDots(nextDots);
      placedDotsRef.current = nextDots;
      fabricCanvas.requestRenderAll();
    };

    const handleBeforeRender = () => {
      if (fabricCanvas.contextTop && fabricCanvas.clearContext) {
        fabricCanvas.clearContext(fabricCanvas.contextTop);
      }
    };

    const handleAfterRender = () => {
      renderPenOverlay();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancelPen();
    };

    window.addEventListener('keydown', handleKeyDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('before:render', handleBeforeRender);
    fabricCanvas.on('after:render', handleAfterRender);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('before:render', handleBeforeRender);
      fabricCanvas.off('after:render', handleAfterRender);
      fabricCanvas.defaultCursor = 'default';
      fabricCanvas.selection = true;
      if (fabricCanvas.contextTop && fabricCanvas.clearContext) {
        fabricCanvas.clearContext(fabricCanvas.contextTop);
      }
    };
  }, [fabricCanvas, isPenActive]);

  return (
    <div className="space-y-4">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Box Shapes
        </h3>
        <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          ASSETS
        </span>
      </div>

      {/* ── PEN TOOL ────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">Custom Pen Shape</span>
          <span className="text-[10px] font-mono text-slate-400">
            {isPenActive ? `${placedDots.length} pts` : 'Idle'}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-300">
            90° Ortho Snap
          </span>
          <button
            onClick={() => setPerfectOrtho(!perfectOrtho)}
            className={`relative w-7 h-3.5 rounded-full shrink-0 transition-colors ${
              perfectOrtho ? 'bg-rose-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${
                perfectOrtho ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {!isPenActive ? (
          <button
            onClick={handleStartPen}
            className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Draw Custom Shape</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] text-center font-medium">
              Click Dot 1 to close
            </div>
            <button
              onClick={handleCancelPen}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-[11px] transition"
            >
              Cancel (Esc)
            </button>
          </div>
        )}
      </div>

      {/* ── SHAPES LIST ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-300">Base Shapes</span>
        <div className="grid grid-cols-2 gap-2">
          {SHAPE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                const box = createComicBox(fabricCanvas, preset.shape, preset);
                if (box && setActiveObject) setActiveObject(box);
              }}
              className="group p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-rose-500/50 transition flex flex-col items-center justify-center gap-1.5 text-center"
            >
              <div
                className="w-14 h-9 rounded-lg flex items-center justify-center relative border border-black/10 shadow-sm"
                style={{ backgroundColor: preset.fill }}
              >
                {preset.shape === 'pill' && (
                  <div className="w-11 h-5 rounded-full border border-white/70" />
                )}
                {preset.shape === 'rectangle' && (
                  <div className="w-10 h-6 rounded border border-white/70" />
                )}
                {preset.shape === 'square' && (
                  <div className="w-6 h-6 rounded border border-white/70" />
                )}
                {preset.shape === 'circle' && (
                  <div className="w-6 h-6 rounded-full border border-white/70" />
                )}
                {preset.shape === 'flower' && (
                  <span className="text-white text-xs">✿</span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-300 group-hover:text-rose-400 transition truncate max-w-full">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * RIGHT SIDEBAR: PROPERTIES INSPECTOR PANEL
 * Supports authentic Scissor Cut Paper Sticker controls
 * ============================================================================
 */
export const BoxPropertiesPanel = ({ fabricCanvas, activeObject }) => {
  const [values, setValues] = useState({
    fill: '#F4A6B8',
    boxStyle: 'sticker',
    bgPattern: 'none',
    patternColor: 'rgba(255, 255, 255, 0.65)',
    boxBorderWidth: 0,
    boxBorderColor: '#111111',
    boxCornerRadius: 14,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    shadowColor: '#111111',
    stitchColor: '#FFFFFF',
    stitchWidth: 2,
    stitchOffset: 8,
    scallopSize: 22,
    stickerBorderWidth: 15,
    stickerBorderColor: '#FFFFFF',
    stickerShadowDepth: 7,
    scissorSnipSize: 34,
    scissorRoughness: 0.45,
    scissorSeed: 42,
  });

  useEffect(() => {
    if (!activeObject || !activeObject.isComicBox) return;

    setValues({
      fill: activeObject.fill || '#F4A6B8',
      boxStyle: activeObject.boxStyle || 'sticker',
      bgPattern: activeObject.bgPattern || 'none',
      patternColor: activeObject.patternColor || 'rgba(255, 255, 255, 0.65)',
      boxBorderWidth: Number(activeObject.boxBorderWidth ?? 0),
      boxBorderColor: activeObject.boxBorderColor || '#111111',
      boxCornerRadius: Number(activeObject.boxCornerRadius ?? 14),
      shadowOffsetX: Number(activeObject.shadowOffsetX ?? 5),
      shadowOffsetY: Number(activeObject.shadowOffsetY ?? 5),
      shadowColor: activeObject.shadowColor || '#111111',
      stitchColor: activeObject.stitchColor || '#FFFFFF',
      stitchWidth: Number(activeObject.stitchWidth ?? 2),
      stitchOffset: Number(activeObject.stitchOffset ?? 8),
      scallopSize: Number(activeObject.scallopSize ?? 22),
      stickerBorderWidth: Number(activeObject.stickerBorderWidth ?? 15),
      stickerBorderColor: activeObject.stickerBorderColor || '#FFFFFF',
      stickerShadowDepth: Number(activeObject.stickerShadowDepth ?? 7),
      scissorSnipSize: Number(activeObject.scissorSnipSize ?? 34),
      scissorRoughness: Number(activeObject.scissorRoughness ?? 0.45),
      scissorSeed: Number(activeObject.scissorSeed ?? 42),
    });
  }, [activeObject]);

  if (!fabricCanvas || !activeObject || !activeObject.isComicBox) return null;

  const update = (prop, val) => {
    setValues((prev) => ({ ...prev, [prop]: val }));
    activeObject[prop] = val;
    activeObject.set(prop, val);
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
  };

  const handleStyleChange = (newStyle) => {
    let newBorderWidth = values.boxBorderWidth;
    if (newStyle === 'stitched' || newStyle === 'sticker') {
      newBorderWidth = 0;
    } else if (newStyle === 'comic' && newBorderWidth === 0) {
      newBorderWidth = 2.75;
    }

    setValues((prev) => ({
      ...prev,
      boxStyle: newStyle,
      boxBorderWidth: newBorderWidth,
    }));

    activeObject.boxStyle = newStyle;
    activeObject.set('boxStyle', newStyle);
    activeObject.boxBorderWidth = newBorderWidth;
    activeObject.set('boxBorderWidth', newBorderWidth);
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
  };

  const handleRandomizeCuts = () => {
    const newSeed = Math.floor(Math.random() * 100000);
    update('scissorSeed', newSeed);
  };

  const shape = activeObject.boxShape || 'rectangle';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Box Styling
        </span>
        <span className="text-[9px] font-mono uppercase text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
          {shape}
        </span>
      </div>

      {/* ── THEME STYLES (UNIVERSAL ON EVERY SHAPE) ──────────────────── */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-slate-300">Theme Style</span>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'sticker', name: 'Scissor Cut (Img 2)' },
            { id: 'scallop', name: 'Scallop Biscuit' },
            { id: 'stitched', name: 'Stitched Label' },
            { id: 'comic', name: 'Comic Pop' },
            { id: 'flat', name: 'Flat Clean' },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition border ${
                values.boxStyle === style.id
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── BACKGROUND PATTERNS (UNIVERSAL) ─────────────────────────── */}
      <div className="space-y-1.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
        <span className="text-xs font-semibold text-slate-300">Pattern Fill</span>
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: 'none', name: 'Solid' },
            { id: 'stripes', name: 'Stripes' },
            { id: 'dots', name: 'Dots' },
            { id: 'stars', name: 'Stars' },
          ].map((pat) => (
            <button
              key={pat.id}
              onClick={() => update('bgPattern', pat.id)}
              className={`py-1.5 rounded-lg text-[10px] font-semibold transition border ${
                values.bgPattern === pat.id
                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {pat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── BASE COLOR ───────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
          <span>Base Color</span>
          <span className="font-mono text-slate-400 text-[10px] uppercase">
            {values.fill}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer">
            <input
              type="color"
              value={values.fill}
              onChange={(e) => update('fill', e.target.value)}
              className="absolute -top-2 -left-2 w-11 h-11 cursor-pointer opacity-0"
            />
            <div className="w-full h-full" style={{ backgroundColor: values.fill }} />
          </div>
          <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
            {BOX_PALETTE.map((c) => (
              <button
                key={c.hex}
                onClick={() => update('fill', c.hex)}
                className={`w-5 h-5 rounded-full shrink-0 transition-transform ${
                  values.fill.toLowerCase() === c.hex.toLowerCase()
                    ? 'ring-2 ring-white/70 scale-110'
                    : 'opacity-80'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
        <PrintSafetyWarning
          color={values.fill}
          onChange={(safeHex) => update('fill', safeHex)}
        />
      </div>

      {/* ── SCISSOR-CUT PAPER STICKER CONTROLS (IMAGE 2) ─────────────── */}
      {values.boxStyle === 'sticker' && (
        <div className="space-y-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Paper Border Margin</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.stickerBorderWidth}px</span>
          </div>
          <input
            type="range"
            min={6}
            max={32}
            step={1}
            value={values.stickerBorderWidth}
            onChange={(e) => update('stickerBorderWidth', parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Scissor Snip Length</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.scissorSnipSize}px</span>
          </div>
          <input
            type="range"
            min={18}
            max={65}
            step={2}
            value={values.scissorSnipSize}
            onChange={(e) => update('scissorSnipSize', parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Zigzag Cut Roughness</span>
            <span className="font-mono text-rose-400 text-[10px]">{Math.round(values.scissorRoughness * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={values.scissorRoughness}
            onChange={(e) => update('scissorRoughness', parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />

          <button
            onClick={handleRandomizeCuts}
            className="w-full py-1.5 px-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-slate-600"
          >
            <span>🎲 Randomize Cut Angles</span>
          </button>

          <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
            <span className="text-[10px] text-slate-400">Paper Color</span>
            <div className="flex items-center gap-1.5">
              {['#FFFFFF', '#FDFBF7', '#FFF9E6', '#F0F4F8', '#111111'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => update('stickerBorderColor', hex)}
                  className={`w-4 h-4 rounded-full transition ${
                    values.stickerBorderColor.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-rose-500 scale-110'
                      : 'opacity-70'
                  }`}
                  style={{ backgroundColor: hex, border: '1px solid rgba(0,0,0,0.2)' }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SCALLOP BISCUIT CONTROLS ─────────────────────────────────── */}
      {values.boxStyle === 'scallop' && (
        <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Scallop Size</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.scallopSize}px</span>
          </div>
          <input
            type="range"
            min={14}
            max={36}
            step={1}
            value={values.scallopSize}
            onChange={(e) => update('scallopSize', parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* ── STITCHED CONTROLS ───────────────────────────────────────── */}
      {values.boxStyle === 'stitched' && (
        <div className="space-y-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Stitch Seam Inset</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.stitchOffset}px</span>
          </div>
          <input
            type="range"
            min={4}
            max={20}
            step={1}
            value={values.stitchOffset}
            onChange={(e) => update('stitchOffset', parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
            <span className="text-[10px] text-slate-400">Thread Color</span>
            <div className="flex items-center gap-1.5">
              {['#FFFFFF', '#111111', '#F43F5E', '#FDE047'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => update('stitchColor', hex)}
                  className={`w-4 h-4 rounded-full transition ${
                    values.stitchColor.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-rose-500 scale-110'
                      : 'opacity-70'
                  }`}
                  style={{ backgroundColor: hex, border: '1px solid rgba(0,0,0,0.2)' }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMIC HARD SHADOW CONTROLS ───────────────────────────────── */}
      {values.boxStyle === 'comic' && (
        <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Comic Hard Shadow</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.shadowOffsetX}px</span>
          </div>
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={values.shadowOffsetX}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              update('shadowOffsetX', val);
              update('shadowOffsetY', val);
            }}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* ── SOLID BORDER STROKE ──────────────────────────────────────── */}
      {values.boxStyle !== 'stitched' && values.boxStyle !== 'sticker' && (
        <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Border Stroke</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.boxBorderWidth}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={values.boxBorderWidth}
            onChange={(e) => update('boxBorderWidth', parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* ── CORNER RADIUS (Only for regular rectangles / squares) ─────── */}
      {values.boxStyle !== 'scallop' && (shape === 'rectangle' || shape === 'square') && (
        <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span>Corner Roundness</span>
            <span className="font-mono text-rose-400 text-[10px]">{values.boxCornerRadius}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={values.boxCornerRadius}
            onChange={(e) => update('boxCornerRadius', parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

export default Boxes;
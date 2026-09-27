import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import PrintSafetyWarning from '../PrintSafetyWarning';

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
 * SHAPE & CONTOUR PATH GENERATORS
 * ============================================================================
 */
export const drawShapePath = (ctx, shape, x, y, w, h) => {
  ctx.beginPath();
  switch (shape) {
    case 'circle': {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'triangle': {
      ctx.moveTo(x + w * 0.5, y + 2);
      ctx.lineTo(x + w - 2, y + h - 2);
      ctx.lineTo(x + 2, y + h - 2);
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      ctx.moveTo(x + w * 0.5, y + 2);
      ctx.lineTo(x + w - 2, y + h * 0.25);
      ctx.lineTo(x + w - 2, y + h * 0.75);
      ctx.lineTo(x + w * 0.5, y + h - 2);
      ctx.lineTo(x + 2, y + h * 0.75);
      ctx.lineTo(x + 2, y + h * 0.25);
      ctx.closePath();
      break;
    }
    case 'star': {
      const starPoints = [
        [0.5, 0.02],
        [0.61, 0.35],
        [0.98, 0.35],
        [0.68, 0.57],
        [0.79, 0.91],
        [0.5, 0.70],
        [0.21, 0.91],
        [0.32, 0.57],
        [0.02, 0.35],
        [0.39, 0.35],
      ];
      ctx.moveTo(x + w * starPoints[0][0], y + h * starPoints[0][1]);
      for (let i = 1; i < starPoints.length; i++) {
        ctx.lineTo(x + w * starPoints[i][0], y + h * starPoints[i][1]);
      }
      ctx.closePath();
      break;
    }
    case 'free':
    case '1:1':
    case '4:5':
    case '16:9':
    case 'rect':
    default: {
      ctx.rect(x, y, w, h);
      break;
    }
  }
};

export const extractImageContour = (img, width, height) => {
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
    { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
    { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
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

    if (currX === startX && currY === startY && steps > 2) break;
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

const getImageBuffers = (obj) => {
  const img = obj._element || (typeof obj.getElement === 'function' ? obj.getElement() : null);
  if (!img) return null;

  const natW = img.naturalWidth || img.width || Math.max(1, Math.round(obj.width));
  const natH = img.naturalHeight || img.height || Math.max(1, Math.round(obj.height));
  const imageTint = obj.imageTint || 'none';

  const cacheKey = `${natW}_${natH}_${imageTint}_${img.src || ''}`;
  if (obj._stickerBufferCache && obj._stickerBufferCache.key === cacheKey) {
    return obj._stickerBufferCache;
  }

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = natW;
  baseCanvas.height = natH;
  const bCtx = baseCanvas.getContext('2d');
  bCtx.drawImage(img, 0, 0, natW, natH);

  if (imageTint && imageTint !== 'none') {
    bCtx.save();
    bCtx.globalCompositeOperation = 'source-atop';
    bCtx.fillStyle = imageTint;
    bCtx.globalAlpha = 0.35;
    bCtx.fillRect(0, 0, natW, natH);
    bCtx.restore();
  }

  const contour = extractImageContour(img, natW, natH);

  const cache = {
    key: cacheKey,
    baseCanvas,
    contour,
  };
  obj._stickerBufferCache = cache;
  return cache;
};

/**
 * Unified Shape & Sticker Effects Renderer
 */
export const attachImportedAssetRenderer = (obj) => {
  if (!obj || obj._hasImportedAssetRenderer) return;
  obj._hasImportedAssetRenderer = true;

  obj.isImportedAsset = true;
  obj.objectCaching = false;

  obj._render = function (ctx) {
    const hasCutout = Boolean(this.cutoutEffect);
    const hasThickShadow = Boolean(this.thickShadow);
    const hasDotted = Boolean(this.dottedStroke);
    const hasTint = this.imageTint && this.imageTint !== 'none';
    const hasCustomBorder = Number(this.customBorderWidth) > 0 && Boolean(this.customBorderColor);

    const isGeometricShape = this.cropShape && ['circle', 'triangle', 'star', 'hexagon'].includes(this.cropShape);

    // Fast path: standard image with no sticker effects or custom borders
    if (!hasCutout && !hasThickShadow && !hasDotted && !hasTint && !hasCustomBorder) {
      const img = this._element || (typeof this.getElement === 'function' ? this.getElement() : null);
      if (img) {
        ctx.save();
        ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
        return;
      }
    }

    let imageBuffers = null;
    let contourPoints = null;

    if (!isGeometricShape) {
      imageBuffers = getImageBuffers(this);
      if (imageBuffers) contourPoints = imageBuffers.contour;
    }

    const drawFn = (c) => {
      if (isGeometricShape) {
        drawShapePath(c, this.cropShape, -this.width / 2, -this.height / 2, this.width, this.height);
      } else if (contourPoints && contourPoints.length > 2) {
        drawContourPath(c, contourPoints);
      } else {
        c.beginPath();
        c.rect(-this.width / 2, -this.height / 2, this.width, this.height);
        c.closePath();
      }
    };

    const halo = hasCutout ? (Number(this.cutoutHalo) || 12) : 0;
    const paperColor = this.cutoutPaperColor || '#FFFFFF';

    // 1. Thick 3D Shadow
    if (hasThickShadow) {
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
        const shadowLineWidth = hasCutout ? (halo * 2) : 2;
        ctx.lineWidth = shadowLineWidth;

        for (let d = depth; d >= 0.5; d -= 0.5) {
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

    // 2. Die-Cut Border (Paper Halo)
    if (hasCutout) {
      ctx.save();
      if (this.cutoutShadow !== false && !hasThickShadow) {
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

    // 3. Dotted Stitches on Cutout
    if (hasDotted && hasCutout) {
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

    // 4. Draw Core Image
    const sourceImg = (hasTint && imageBuffers?.baseCanvas)
      ? imageBuffers.baseCanvas
      : (this._element || (typeof this.getElement === 'function' ? this.getElement() : null));

    if (sourceImg) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.drawImage(sourceImg, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }

    // 5. Dotted Stitches without Cutout
    if (hasDotted && !hasCutout) {
      const dotGap = Number(this.dottedGap) || 6;
      const dotSize = Number(this.dottedSize) || 2.5;
      const dotColor = this.dottedColor || '#000000';

      ctx.save();
      drawFn(ctx);
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2 + dotSize * 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([dotSize * 1.5, dotGap]);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Shape-Matching Frame Outline (Solid / Dashed / Die-Cut)
    if (hasCustomBorder) {
      const borderWidth = Number(this.customBorderWidth);
      const borderColor = this.customBorderColor;
      const avgScale = ((Math.abs(this.scaleX || 1) + Math.abs(this.scaleY || 1)) / 2) || 1;
      const effWidth = borderWidth / avgScale;

      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = effWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (Array.isArray(this.customBorderDash) && this.customBorderDash.length > 0) {
        ctx.setLineDash(this.customBorderDash.map((d) => d / avgScale));
      } else {
        ctx.setLineDash([]);
      }

      drawFn(ctx);
      ctx.stroke();
      ctx.restore();
    }
  };
};

export const createImportedImageAsset = (fabricCanvas, imgElementOrUrl, options = {}) => {
  if (!fabricCanvas) return null;

  const ImageClass = fabric.FabricImage || fabric.Image;
  const isString = typeof imgElementOrUrl === 'string';

  const initFabricObj = (element) => {
    const naturalW = element.naturalWidth || element.width || 300;
    const maxWidth = 280;
    const scale = naturalW > maxWidth ? maxWidth / naturalW : 1;

    const fabricImg = new ImageClass(element, {
      left: options.left ?? (130 + Math.random() * 40),
      top: options.top ?? (140 + Math.random() * 40),
      scaleX: options.scaleX ?? scale,
      scaleY: options.scaleY ?? scale,
      opacity: options.opacity ?? 1,
      cornerColor: '#f43f5e',
      cornerStrokeColor: '#ffffff',
      borderColor: '#f43f5e',
      cornerSize: 9,
      transparentCorners: false,
      strokeUniform: true,
      globalCompositeOperation: options.blendMode || 'source-over',
      ...options,
    });

    fabricImg.isImportedAsset = true;
    fabricImg.assetName = options.name || 'Imported Graphic';
    fabricImg.assetDataUrl = options.dataUrl || element.src;
    fabricImg.cropShape = options.cropShape || 'rect';

    // Sticker effects defaults
    fabricImg.cutoutEffect = options.cutoutEffect ?? false;
    fabricImg.cutoutHalo = options.cutoutHalo ?? 10;
    fabricImg.cutoutPaperColor = options.cutoutPaperColor ?? '#FFFFFF';
    fabricImg.cutoutShadow = options.cutoutShadow ?? true;

    fabricImg.thickShadow = options.thickShadow ?? false;
    fabricImg.depth3D = options.depth3D ?? 7;
    fabricImg.shadowColor3D = options.shadowColor3D || '#000000';
    fabricImg.dirX3D = options.dirX3D ?? 1;
    fabricImg.dirY3D = options.dirY3D ?? 1;

    fabricImg.dottedStroke = options.dottedStroke ?? false;
    fabricImg.dottedGap = options.dottedGap ?? 6;
    fabricImg.dottedSize = options.dottedSize ?? 2.5;
    fabricImg.dottedColor = options.dottedColor ?? '#000000';
    fabricImg.dottedInset = options.dottedInset ?? 1.5;
    fabricImg.imageTint = options.imageTint || 'none';

    fabricImg.customBorderWidth = options.customBorderWidth || 0;
    fabricImg.customBorderColor = options.customBorderColor || '#111111';
    fabricImg.customBorderDash = options.customBorderDash || null;

    attachImportedAssetRenderer(fabricImg);

    fabricCanvas.add(fabricImg);
    fabricCanvas.setActiveObject(fabricImg);
    fabricCanvas.requestRenderAll();
    return fabricImg;
  };

  if (isString) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => initFabricObj(img);
    img.src = imgElementOrUrl;
    return null;
  } else {
    return initFabricObj(imgElementOrUrl);
  }
};

/**
 * ============================================================================
 * CROP POPUP MODAL (WITH SHIFT ENLARGEMENT CONSTRAINT)
 * ============================================================================
 */
const ImageCropModal = ({ isOpen, onClose, asset, onApplyCrop }) => {
  const [aspectRatio, setAspectRatio] = useState('free');
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCropBox({ x: 15, y: 15, width: 70, height: 70 });
      setRotation(0);
      setFlipH(false);
      setAspectRatio(asset?.cropShape || 'free');
    }
  }, [isOpen, asset]);

  const handlePointerDown = (type, e) => {
    e.preventDefault();
    e.stopPropagation();

    const imgEl = containerRef.current?.querySelector('img');
    const imgW = imgEl?.clientWidth || containerRef.current?.clientWidth || 300;
    const imgH = imgEl?.clientHeight || containerRef.current?.clientHeight || 300;

    isDraggingRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
      imgW,
      imgH,
    };

    const handlePointerMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const { initialBox, type: dragType, imgW: wPix, imgH: hPix, startX, startY } = isDraggingRef.current;

      const deltaXPix = moveEvt.clientX - startX;
      const deltaYPix = moveEvt.clientY - startY;

      // SHIFT KEY or 1:1 Shape Constraint: Keep equal X & Y scaling
      const isShiftOrSquare = moveEvt.shiftKey || ['1:1', 'circle', 'triangle', 'star', 'hexagon'].includes(aspectRatio);

      setCropBox(() => {
        let x = initialBox.x;
        let y = initialBox.y;
        let width = initialBox.width;
        let height = initialBox.height;

        if (dragType === 'move') {
          const deltaX = (deltaXPix / wPix) * 100;
          const deltaY = (deltaYPix / hPix) * 100;
          x = Math.max(0, Math.min(100 - width, initialBox.x + deltaX));
          y = Math.max(0, Math.min(100 - height, initialBox.y + deltaY));
          return { x, y, width, height };
        }

        const curWPix = (initialBox.width / 100) * wPix;
        const curHPix = (initialBox.height / 100) * hPix;
        const curXPix = (initialBox.x / 100) * wPix;
        const curYPix = (initialBox.y / 100) * hPix;

        if (isShiftOrSquare) {
          const baseSize = Math.min(curWPix, curHPix);

          if (dragType === 'se') {
            const d = Math.abs(deltaXPix) > Math.abs(deltaYPix) ? deltaXPix : deltaYPix;
            const newSize = Math.max(25, Math.min(wPix - curXPix, hPix - curYPix, baseSize + d));
            width = (newSize / wPix) * 100;
            height = (newSize / hPix) * 100;
          } else if (dragType === 'sw') {
            const d = Math.abs(deltaXPix) > Math.abs(deltaYPix) ? -deltaXPix : deltaYPix;
            const anchorRight = curXPix + curWPix;
            const newSize = Math.max(25, Math.min(anchorRight, hPix - curYPix, baseSize + d));
            x = ((anchorRight - newSize) / wPix) * 100;
            width = (newSize / wPix) * 100;
            height = (newSize / hPix) * 100;
          } else if (dragType === 'ne') {
            const d = Math.abs(deltaXPix) > Math.abs(deltaYPix) ? deltaXPix : -deltaYPix;
            const anchorBottom = curYPix + curHPix;
            const newSize = Math.max(25, Math.min(wPix - curXPix, anchorBottom, baseSize + d));
            y = ((anchorBottom - newSize) / hPix) * 100;
            width = (newSize / wPix) * 100;
            height = (newSize / hPix) * 100;
          } else if (dragType === 'nw') {
            const d = Math.abs(deltaXPix) > Math.abs(deltaYPix) ? -deltaXPix : -deltaYPix;
            const anchorRight = curXPix + curWPix;
            const anchorBottom = curYPix + curHPix;
            const newSize = Math.max(25, Math.min(anchorRight, anchorBottom, baseSize + d));
            x = ((anchorRight - newSize) / wPix) * 100;
            y = ((anchorBottom - newSize) / hPix) * 100;
            width = (newSize / wPix) * 100;
            height = (newSize / hPix) * 100;
          }
        } else {
          const deltaX = (deltaXPix / wPix) * 100;
          const deltaY = (deltaYPix / hPix) * 100;

          if (dragType === 'se') {
            width = Math.max(12, Math.min(100 - x, initialBox.width + deltaX));
            height = Math.max(12, Math.min(100 - y, initialBox.height + deltaY));
          } else if (dragType === 'sw') {
            const newW = Math.max(12, Math.min(initialBox.x + initialBox.width, initialBox.width - deltaX));
            x = initialBox.x + (initialBox.width - newW);
            width = newW;
            height = Math.max(12, Math.min(100 - initialBox.y, initialBox.height + deltaY));
          } else if (dragType === 'ne') {
            width = Math.max(12, Math.min(100 - initialBox.x, initialBox.width + deltaX));
            const newH = Math.max(12, Math.min(initialBox.y + initialBox.height, initialBox.height - deltaY));
            y = initialBox.y + (initialBox.height - newH);
            height = newH;
          } else if (dragType === 'nw') {
            const newW = Math.max(12, Math.min(initialBox.x + initialBox.width, initialBox.width - deltaX));
            const newH = Math.max(12, Math.min(initialBox.y + initialBox.height, initialBox.height - deltaY));
            x = initialBox.x + (initialBox.width - newW);
            y = initialBox.y + (initialBox.height - newH);
            width = newW;
            height = newH;
          }
        }

        return { x, y, width, height };
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const applyCropAndExport = () => {
    if (!asset?.dataUrl) return;

    const sourceImg = new Image();
    sourceImg.crossOrigin = 'anonymous';
    sourceImg.onload = () => {
      const origW = sourceImg.naturalWidth || sourceImg.width;
      const origH = sourceImg.naturalHeight || sourceImg.height;

      const px = Math.round((cropBox.x / 100) * origW);
      const py = Math.round((cropBox.y / 100) * origH);
      const pw = Math.max(1, Math.round((cropBox.width / 100) * origW));
      const ph = Math.max(1, Math.round((cropBox.height / 100) * origH));

      const cropCanvas = document.createElement('canvas');
      const isSwapped = rotation === 90 || rotation === 270;
      cropCanvas.width = isSwapped ? ph : pw;
      cropCanvas.height = isSwapped ? pw : ph;
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.translate(cropCanvas.width / 2, cropCanvas.height / 2);
      if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
      if (flipH) ctx.scale(-1, 1);

      drawShapePath(ctx, aspectRatio, -pw / 2, -ph / 2, pw, ph);
      ctx.clip();

      ctx.drawImage(sourceImg, px, py, pw, ph, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();

      const croppedUrl = cropCanvas.toDataURL('image/png');
      onApplyCrop({
        croppedDataUrl: croppedUrl,
        width: cropCanvas.width,
        height: cropCanvas.height,
        cropShape: aspectRatio,
        asset,
      });
      onClose();
    };
    sourceImg.src = asset.dataUrl;
  };

  const renderShapeSvgGuide = (shape) => {
    switch (shape) {
      case 'circle':
        return <ellipse cx="50" cy="50" rx="49" ry="49" fill="rgba(244,63,94,0.14)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />;
      case 'triangle':
        return <polygon points="50,2 98,98 2,98" fill="rgba(244,63,94,0.14)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />;
      case 'hexagon':
        return <polygon points="50,2 98,25 98,75 50,98 2,75 2,25" fill="rgba(244,63,94,0.14)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />;
      case 'star':
        return <polygon points="50,2 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="rgba(244,63,94,0.14)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />;
      default:
        return null;
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-white">Crop & Shape Frame</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[280px]">{asset.name || 'Image Cutout'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Viewport */}
        <div className="flex-1 p-5 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[300px]">
          <div
            ref={containerRef}
            className="relative select-none max-h-[330px] max-w-full flex items-center justify-center overflow-hidden rounded-lg shadow-inner"
            style={{
              backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
              backgroundSize: '14px 14px',
              backgroundColor: '#0f172a',
            }}
          >
            <img
              src={asset.dataUrl}
              alt="Source"
              className="max-h-[310px] max-w-full object-contain pointer-events-none transition-transform"
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
              }}
            />

            {/* Crop Overlay */}
            <div
              className={`absolute border-2 border-rose-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] cursor-move ${
                aspectRatio === 'circle' ? 'rounded-full' : 'rounded-none'
              }`}
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              onPointerDown={(e) => handlePointerDown('move', e)}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {renderShapeSvgGuide(aspectRatio)}
              </svg>

              {['free', '1:1', '4:5', '16:9'].includes(aspectRatio) && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-rose-300/40" />
                  <div className="border-r border-b border-rose-300/40" />
                  <div className="border-b border-rose-300/40" />
                  <div className="border-r border-b border-rose-300/40" />
                  <div className="border-r border-b border-rose-300/40" />
                  <div className="border-b border-rose-300/40" />
                  <div className="border-r border-rose-300/40" />
                  <div className="border-r border-rose-300/40" />
                  <div />
                </div>
              )}

              {/* Handles */}
              <div onPointerDown={(e) => handlePointerDown('nw', e)} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-rose-600 rounded-sm cursor-nwse-resize z-10" />
              <div onPointerDown={(e) => handlePointerDown('ne', e)} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-rose-600 rounded-sm cursor-nesw-resize z-10" />
              <div onPointerDown={(e) => handlePointerDown('sw', e)} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-rose-600 rounded-sm cursor-nesw-resize z-10" />
              <div onPointerDown={(e) => handlePointerDown('se', e)} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-rose-600 rounded-sm cursor-nwse-resize z-10" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">Crop Shape:</span>
              <span className="text-[10px] text-rose-400 font-mono font-bold uppercase flex items-center gap-1">
                <span>Hold <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">Shift</kbd> for 1:1 Scale</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'free', label: 'Freeform', desc: 'Custom' },
                { id: '1:1', label: '1:1 Square', desc: 'Equal X/Y' },
                { id: 'circle', label: 'Circle', desc: 'Round' },
                { id: 'triangle', label: 'Triangle', desc: 'Polygon' },
                { id: 'star', label: '5-Pt Star', desc: 'Badge' },
                { id: 'hexagon', label: 'Hexagon', desc: 'Hex' },
                { id: '4:5', label: '4:5 Page', desc: 'Magazine' },
                { id: '16:9', label: '16:9 Wide', desc: 'Cover' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setAspectRatio(r.id);
                    if (['1:1', 'circle', 'triangle', 'star', 'hexagon'].includes(r.id)) {
                      setCropBox({ x: 20, y: 20, width: 60, height: 60 });
                    } else if (r.id === '4:5') {
                      setCropBox({ x: 25, y: 15, width: 50, height: 70 });
                    } else if (r.id === '16:9') {
                      setCropBox({ x: 10, y: 25, width: 80, height: 50 });
                    }
                  }}
                  className={`px-2 py-1.5 rounded-lg text-left transition border ${
                    aspectRatio === r.id
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-800 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{r.label}</div>
                  <div className="text-[9px] text-slate-500 font-mono">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                Flip H
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyCropAndExport}
                className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-lg shadow-rose-500/20"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * ACCORDION SUB-COMPONENTS FOR RIGHT SIDEBAR
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

const StickerEffectRow = ({ label, icon, active, onToggle, last, children }) => {
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
 * IMPORTED ASSETS LEFT SIDEBAR PANEL
 * ============================================================================
 */
const ImportedAssets = ({ fabricCanvas, setActiveObject }) => {
  const fileInputRef = useRef(null);

  const [importedImages, setImportedImages] = useState(() => {
    try {
      const saved = localStorage.getItem('__stickers_imported_assets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cropModalAsset, setCropModalAsset] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('__stickers_imported_assets', JSON.stringify(importedImages.slice(0, 20)));
    } catch {
      // ignore
    }
  }, [importedImages]);

  useEffect(() => {
    const handleTriggerCropModal = (e) => {
      const targetObj = e.detail?.activeObject;
      if (!targetObj) return;

      const dataUrl = targetObj.assetDataUrl || targetObj.toDataURL?.() || targetObj._element?.src;
      if (!dataUrl) return;

      setCropModalAsset({
        name: targetObj.assetName || 'Canvas Graphic',
        dataUrl,
        cropShape: targetObj.cropShape || 'rect',
        fabricObject: targetObj,
      });
    };

    window.addEventListener('open-image-crop-modal', handleTriggerCropModal);
    return () => window.removeEventListener('open-image-crop-modal', handleTriggerCropModal);
  }, []);

  const handleUploadAsset = (e) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result;
      if (!data) return;

      const img = new Image();
      img.onload = () => {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const newAsset = {
          id: 'asset_' + Date.now(),
          name: cleanName,
          dataUrl: data,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          cropShape: 'rect',
        };

        setImportedImages((prev) => [newAsset, ...prev]);

        const fabricImg = createImportedImageAsset(fabricCanvas, img, {
          name: cleanName,
          dataUrl: data,
          cropShape: 'rect',
        });
        if (fabricImg && setActiveObject) {
          setActiveObject(fabricImg);
        }
      };
      img.src = data;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddImportedToCanvas = (asset) => {
    if (!fabricCanvas) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const fabricImg = createImportedImageAsset(fabricCanvas, img, {
        name: asset.name,
        dataUrl: asset.dataUrl,
        cropShape: asset.cropShape || 'rect',
      });
      if (fabricImg && setActiveObject) {
        setActiveObject(fabricImg);
      }
    };
    img.src = asset.dataUrl;
  };

  const handleDeleteImported = (e, id) => {
    e.stopPropagation();
    setImportedImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplyCropResult = ({ croppedDataUrl, width, height, cropShape, asset }) => {
    if (asset?.fabricObject && fabricCanvas) {
      const obj = asset.fabricObject;
      const updatedImg = new Image();
      updatedImg.onload = () => {
        if (typeof obj.setElement === 'function') {
          obj.setElement(updatedImg);
        } else {
          obj._element = updatedImg;
        }
        obj.set({
          width: updatedImg.naturalWidth || width,
          height: updatedImg.naturalHeight || height,
        });
        obj.assetDataUrl = croppedDataUrl;
        obj.cropShape = cropShape;
        obj._stickerBufferCache = null;
        attachImportedAssetRenderer(obj);
        obj.setCoords();
        obj.dirty = true;
        fabricCanvas.requestRenderAll();
        if (setActiveObject) setActiveObject(obj);
      };
      updatedImg.src = croppedDataUrl;
    }

    if (asset?.id) {
      setImportedImages((prev) =>
        prev.map((item) =>
          item.id === asset.id
            ? { ...item, dataUrl: croppedDataUrl, width, height, cropShape }
            : item
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          onChange={handleUploadAsset}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-rose-500/50 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 group shadow-sm"
        >
          <svg className="w-4 h-4 text-rose-400 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Upload Graphic / Photo</span>
        </button>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Imported Cutouts
          </span>
          <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            {importedImages.length} SAVED
          </span>
        </div>

        {importedImages.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
            <p className="text-[11px] text-slate-500">
              No custom graphics uploaded yet. Upload a photo or PNG above to crop into shapes!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {importedImages.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleAddImportedToCanvas(asset)}
                className="group relative p-2 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-rose-500/50 cursor-pointer transition flex flex-col items-center gap-1.5 text-left"
              >
                <button
                  type="button"
                  onClick={(e) => handleDeleteImported(e, asset.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:bg-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10 text-xs"
                  title="Remove"
                >
                  ×
                </button>

                <div
                  className="w-full h-16 rounded-lg overflow-hidden flex items-center justify-center p-1 relative border border-slate-700/40"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                    backgroundSize: '12px 12px',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <img
                    src={asset.dataUrl}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow transition-transform group-hover:scale-105"
                  />
                </div>

                <div className="w-full flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-300 truncate max-w-[70px]">
                    {asset.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCropModalAsset(asset);
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/80 hover:bg-rose-500 text-slate-300 hover:text-white font-medium transition"
                      title="Crop shape"
                    >
                      Crop
                    </button>
                    <span className="text-[9px] font-mono text-rose-400 font-bold group-hover:underline">
                      + Add
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImageCropModal
        isOpen={Boolean(cropModalAsset)}
        onClose={() => setCropModalAsset(null)}
        asset={cropModalAsset}
        onApplyCrop={handleApplyCropResult}
      />
    </div>
  );
};

/**
 * ============================================================================
 * IMPORTED ASSET PROPERTIES PANEL (RIGHT SIDEBAR)
 * ============================================================================
 */
export const ImportedAssetPropertiesPanel = ({ fabricCanvas, activeObject }) => {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  if (!activeObject || !fabricCanvas) return null;

  const update = (prop, val) => {
    activeObject.set(prop, val);
    activeObject[prop] = val;
    activeObject._stickerBufferCache = null;
    activeObject.objectCaching = false;
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  const opacityVal = Math.round((activeObject.opacity ?? 1) * 100);
  const blendMode = activeObject.globalCompositeOperation || 'source-over';
  const shape = activeObject.cropShape || 'rect';
  const customBorderWidth = Number(activeObject.customBorderWidth) || 0;
  const customBorderColor = activeObject.customBorderColor || '#111111';

  // Soft Paper Shadow
  const shadow = activeObject.shadow;
  const hasSoftShadow = Boolean(shadow);
  const shadowBlur = shadow ? Number(shadow.blur) || 0 : 0;

  const openCropModal = () => {
    window.dispatchEvent(
      new CustomEvent('open-image-crop-modal', {
        detail: { activeObject },
      })
    );
  };

  const applyTonePreset = (preset) => {
    const filtersModule = fabric.filters || fabric.FabricImage?.filters || fabric.Image?.filters;
    if (!filtersModule || typeof activeObject.applyFilters !== 'function') return;

    activeObject.filters = [];
    if (preset === 'sepia' && filtersModule.Sepia) {
      activeObject.filters.push(new filtersModule.Sepia());
    } else if (preset === 'grayscale' && filtersModule.Grayscale) {
      activeObject.filters.push(new filtersModule.Grayscale());
    } else if (preset === 'contrast' && filtersModule.Contrast) {
      activeObject.filters.push(new filtersModule.Contrast({ contrast: 0.3 }));
    } else if (preset === 'invert' && filtersModule.Invert) {
      activeObject.filters.push(new filtersModule.Invert());
    }

    activeObject.applyFilters();
    activeObject.activeTonePreset = preset;
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  const applyFrameStyle = (style) => {
    activeObject.set({ stroke: null, strokeWidth: 0 });
    if (style === 'none') {
      activeObject.customBorderWidth = 0;
      activeObject.customBorderDash = null;
    } else if (style === 'solid') {
      activeObject.customBorderColor = '#111111';
      activeObject.customBorderWidth = 3;
      activeObject.customBorderDash = null;
    } else if (style === 'dashed') {
      activeObject.customBorderColor = '#f43f5e';
      activeObject.customBorderWidth = 2.5;
      activeObject.customBorderDash = [6, 4];
    } else if (style === 'polaroid') {
      activeObject.customBorderColor = '#ffffff';
      activeObject.customBorderWidth = 14;
      activeObject.customBorderDash = null;
    }
    attachImportedAssetRenderer(activeObject);
    activeObject.dirty = true;
    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  return (
    <div className="space-y-5">
      {/* 1. Crop & Shape Trigger */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={openCropModal}
          className="w-full py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-2 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Crop / Change Shape</span>
        </button>
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>Active Shape:</span>
          <span className="font-mono font-bold text-rose-400 uppercase bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            {shape}
          </span>
        </div>
      </div>

      {/* 2. Opacity */}
      <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Opacity</label>
          <span className="text-xs font-mono font-bold text-rose-400">{opacityVal}%</span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          value={opacityVal}
          onChange={(e) => update('opacity', Number(e.target.value) / 100)}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[100, 75, 50, 25].map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => update('opacity', op / 100)}
              className={`py-1 rounded text-[10px] font-mono font-semibold transition border ${
                opacityVal === op
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              {op}%
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sticker Pop Effects (Die-Cut, 3D Shadow, Dotted Stitches, Tint) */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Sticker Effects (Shapes & Cutouts)
        </span>
        <div className="rounded-xl border border-slate-700/60 overflow-hidden divide-y divide-slate-700/40 bg-slate-800/40">
          {/* Die-Cut Border */}
          <StickerEffectRow
            label="Die-Cut Paper Halo"
            icon="🏷️"
            active={Boolean(activeObject.cutoutEffect)}
            onToggle={(v) => update('cutoutEffect', v)}
          >
            <SliderRow
              label="Halo Size" unit="px"
              min={4} max={26} step={1}
              value={activeObject.cutoutHalo ?? 10}
              onChange={(v) => update('cutoutHalo', v)}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Paper Color</span>
              <div className="flex items-center gap-1.5">
                {['#FFFFFF', '#FFFBEB', '#FDF2F8', '#1E293B', '#E11D48'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => update('cutoutPaperColor', hex)}
                    className={`w-4 h-4 rounded-full border border-slate-600 transition ${(activeObject.cutoutPaperColor || '#FFFFFF').toUpperCase() === hex.toUpperCase()
                      ? 'ring-2 ring-rose-500 scale-110'
                      : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: hex }}
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

          {/* Thick 3D Extrusion Shadow */}
          <StickerEffectRow
            label="Thick 3D Extrusion"
            icon="▪"
            active={Boolean(activeObject.thickShadow)}
            onToggle={(v) => update('thickShadow', v)}
          >
            <SliderRow
              label="3D Depth" unit="px"
              min={0} max={24} step={1}
              value={activeObject.depth3D ?? 7}
              onChange={(v) => update('depth3D', v)}
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
              <span>3D Shadow Color</span>
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

          {/* Dotted Stroke */}
          <StickerEffectRow
            label="Dotted Stitches"
            icon="···"
            active={Boolean(activeObject.dottedStroke)}
            onToggle={(v) => update('dottedStroke', v)}
          >
            <SliderRow
              label="Dot Size" unit="px"
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
              <span>Dot Color</span>
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

          {/* Color Tint Overlay */}
          <div className="p-3 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Color Tint Wash</span>
              <span className="font-mono text-slate-400 uppercase text-[10px]">
                {activeObject.imageTint === 'none' || !activeObject.imageTint ? 'ORIGINAL' : activeObject.imageTint}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <button
                type="button"
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
                  type="button"
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
        </div>
      </div>

      {/* 4. Frame & Borders */}
      <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Shape-Matching Frame
          </label>
          <span className="text-[10px] text-amber-300 font-mono">
            {customBorderWidth > 0 ? `${customBorderWidth}px` : 'Off'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'none', label: 'No Border' },
            { id: 'solid', label: 'Solid Outline' },
            { id: 'dashed', label: 'Cutout Dashes' },
            { id: 'polaroid', label: 'Die-Cut White' },
          ].map((frame) => (
            <button
              key={frame.id}
              type="button"
              onClick={() => applyFrameStyle(frame.id)}
              className="py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
            >
              {frame.label}
            </button>
          ))}
        </div>

        {customBorderWidth > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customBorderColor}
                onChange={(e) => {
                  activeObject.customBorderColor = e.target.value;
                  attachImportedAssetRenderer(activeObject);
                  activeObject.dirty = true;
                  fabricCanvas.requestRenderAll();
                  forceUpdate();
                }}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-slate-300">Border Color</span>
              <span className="text-xs font-mono text-slate-400 ml-auto uppercase">{customBorderColor}</span>
            </div>
            <PrintSafetyWarning color={customBorderColor} onChange={(c) => update('customBorderColor', c)} compact />

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Border Thickness:</span>
                <span className="font-mono text-slate-400">{customBorderWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                value={customBorderWidth}
                onChange={(e) => {
                  activeObject.customBorderWidth = Number(e.target.value);
                  attachImportedAssetRenderer(activeObject);
                  activeObject.dirty = true;
                  fabricCanvas.requestRenderAll();
                  forceUpdate();
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Print Blend Modes */}
      <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Print Blend Mode
          </label>
          <span className="text-[10px] text-amber-400 font-mono">Paper Bleed</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'source-over', label: 'Normal' },
            { id: 'multiply', label: 'Multiply' },
            { id: 'screen', label: 'Screen' },
            { id: 'overlay', label: 'Overlay' },
            { id: 'darken', label: 'Darken' },
            { id: 'difference', label: 'Difference' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => update('globalCompositeOperation', mode.id)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition border ${
                blendMode === mode.id
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Editorial Tones */}
      <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Editorial Tones
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'none', label: 'Original' },
            { id: 'sepia', label: 'Sepia Wash' },
            { id: 'grayscale', label: 'Newsprint' },
            { id: 'contrast', label: 'High Pop' },
            { id: 'invert', label: 'Negative' },
          ].map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => applyTonePreset(tone.id)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition border ${
                activeObject.activeTonePreset === tone.id
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Soft Paper Shadow */}
      <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Soft Paper Shadow
          </label>
          <button
            type="button"
            onClick={() => {
              if (hasSoftShadow) {
                activeObject.set('shadow', null);
              } else {
                activeObject.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.35)', blur: 12, offsetX: 5, offsetY: 8 }));
              }
              fabricCanvas.requestRenderAll();
              forceUpdate();
            }}
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition flex items-center gap-1.5 ${
              hasSoftShadow ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {hasSoftShadow ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {hasSoftShadow && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Shadow Softness:</span>
              <span className="font-mono text-slate-400">{shadowBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={shadowBlur}
              onChange={(e) => {
                const blur = Number(e.target.value);
                activeObject.set('shadow', new fabric.Shadow({ color: shadow?.color || 'rgba(0,0,0,0.35)', blur, offsetX: 5, offsetY: 8 }));
                fabricCanvas.requestRenderAll();
                forceUpdate();
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        )}
      </div>

      {/* 8. Transforms */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-semibold text-slate-400 block">Transform & Flip</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => update('flipX', !activeObject.flipX)}
            className={`p-2 rounded-lg text-xs font-semibold border transition ${
              activeObject.flipX ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            Flip X
          </button>
          <button
            type="button"
            onClick={() => update('flipY', !activeObject.flipY)}
            className={`p-2 rounded-lg text-xs font-semibold border transition ${
              activeObject.flipY ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            Flip Y
          </button>
          <button
            type="button"
            onClick={() => update('angle', ((activeObject.angle || 0) + 90) % 360)}
            className="p-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            Rotate 90°
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportedAssets;
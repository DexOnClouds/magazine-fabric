import { useEffect, useRef } from 'react';

/**
 * ============================================================================
 * ALIGNMENT COMPONENT & MAGNETIC SNAPPING ENGINE (PROGRESSIVE SHIFT-LOCK)
 * ============================================================================
 */

// Canvas standard dimensions (A4 in points)
export const BASE_WIDTH = 595;
export const BASE_HEIGHT = 842;
export const DEFAULT_SAFE_MARGIN = 36; // 0.5 inch safe margin in points

// Default magnetic snap threshold in canvas coordinate units
export const DEFAULT_SNAP_THRESHOLD = 6;

// Smart Guide aesthetic theme
export const GUIDE_STYLE = {
  stroke: '#f43f5e',         // Vibrant magenta / rose
  lineWidth: 1,              // Base width (scaled by canvas zoom)
  dash: [4, 3],              // Clean dashed pattern
  tickSize: 6,               // Crosshair tick size
  badgeBg: 'rgba(244, 63, 94, 0.95)',
  badgeText: '#ffffff',
  font: 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  spacingColor: '#fb7185',   // Softer rose for spacing badges
};

/**
 * ============================================================================
 * 1. GEOMETRY & BOUNDS HELPERS
 * ============================================================================
 */
export const getObjectBounds = (obj) => {
  const originX = obj.originX || 'left';
  const originY = obj.originY || 'top';
  const width = (obj.width || 0) * (obj.scaleX || 1);
  const height = (obj.height || 0) * (obj.scaleY || 1);

  let left = typeof obj.left === 'number' ? obj.left : 0;
  let top = typeof obj.top === 'number' ? obj.top : 0;

  if (originX === 'center') left -= width / 2;
  else if (originX === 'right') left -= width;

  if (originY === 'center') top -= height / 2;
  else if (originY === 'bottom') top -= height;

  const right = left + width;
  const bottom = top + height;
  const centerX = left + width / 2;
  const centerY = top + height / 2;

  return {
    left,
    top,
    right,
    bottom,
    centerX,
    centerY,
    width,
    height,
    originX,
    originY,
  };
};

export const applySnapX = (obj, newLeft) => {
  const originX = obj.originX || 'left';
  const width = (obj.width || 0) * (obj.scaleX || 1);
  if (originX === 'center') {
    obj.set('left', newLeft + width / 2);
  } else if (originX === 'right') {
    obj.set('left', newLeft + width);
  } else {
    obj.set('left', newLeft);
  }
};

export const applySnapY = (obj, newTop) => {
  const originY = obj.originY || 'top';
  const height = (obj.height || 0) * (obj.scaleY || 1);
  if (originY === 'center') {
    obj.set('top', newTop + height / 2);
  } else if (originY === 'bottom') {
    obj.set('top', newTop + height);
  } else {
    obj.set('top', newTop);
  }
};

/**
 * ============================================================================
 * 2. ALIGNMENT RULES
 * ============================================================================
 */

export const canvasHorizontalCenterRule = ({ bounds, canvasWidth = BASE_WIDTH, canvasHeight = BASE_HEIGHT, snapThreshold }) => {
  const canvasCenterX = canvasWidth / 2;
  const diff = bounds.centerX - canvasCenterX;

  if (Math.abs(diff) <= snapThreshold) {
    return {
      axis: 'x',
      snappedX: bounds.left - diff,
      diffX: diff,
      guide: {
        id: 'canvas-center-x',
        type: 'vertical',
        x: canvasCenterX,
        y1: 0,
        y2: canvasHeight,
        label: 'Center X',
      },
    };
  }
  return null;
};

export const canvasVerticalCenterRule = ({ bounds, canvasWidth = BASE_WIDTH, canvasHeight = BASE_HEIGHT, snapThreshold }) => {
  const canvasCenterY = canvasHeight / 2;
  const diff = bounds.centerY - canvasCenterY;

  if (Math.abs(diff) <= snapThreshold) {
    return {
      axis: 'y',
      snappedY: bounds.top - diff,
      diffY: diff,
      guide: {
        id: 'canvas-center-y',
        type: 'horizontal',
        y: canvasCenterY,
        x1: 0,
        x2: canvasWidth,
        label: 'Center Y',
      },
    };
  }
  return null;
};

export const canvasEdgesAndMarginsRule = ({
  bounds,
  canvasWidth = BASE_WIDTH,
  canvasHeight = BASE_HEIGHT,
  safeMargin = DEFAULT_SAFE_MARGIN,
  snapThreshold,
}) => {
  const results = [];

  const xTargets = [
    { targetX: 0, testVal: bounds.left, snapPos: 0, label: 'Canvas Left Edge' },
    { targetX: safeMargin, testVal: bounds.left, snapPos: safeMargin, label: 'Safe Margin Left' },
    { targetX: canvasWidth - safeMargin, testVal: bounds.right, snapPos: canvasWidth - safeMargin - bounds.width, label: 'Safe Margin Right' },
    { targetX: canvasWidth, testVal: bounds.right, snapPos: canvasWidth - bounds.width, label: 'Canvas Right Edge' },
  ];

  for (const t of xTargets) {
    const diff = t.testVal - t.targetX;
    if (Math.abs(diff) <= snapThreshold) {
      results.push({
        axis: 'x',
        snappedX: t.snapPos,
        diffX: diff,
        guide: {
          id: `canvas-edge-x-${t.targetX}`,
          type: 'vertical',
          x: t.targetX,
          y1: 0,
          y2: canvasHeight,
          label: t.label,
        },
      });
      break;
    }
  }

  const yTargets = [
    { targetY: 0, testVal: bounds.top, snapPos: 0, label: 'Canvas Top Edge' },
    { targetY: safeMargin, testVal: bounds.top, snapPos: safeMargin, label: 'Safe Margin Top' },
    { targetY: canvasHeight - safeMargin, testVal: bounds.bottom, snapPos: canvasHeight - safeMargin - bounds.height, label: 'Safe Margin Bottom' },
    { targetY: canvasHeight, testVal: bounds.bottom, snapPos: canvasHeight - bounds.height, label: 'Canvas Bottom Edge' },
  ];

  for (const t of yTargets) {
    const diff = t.testVal - t.targetY;
    if (Math.abs(diff) <= snapThreshold) {
      results.push({
        axis: 'y',
        snappedY: t.snapPos,
        diffY: diff,
        guide: {
          id: `canvas-edge-y-${t.targetY}`,
          type: 'horizontal',
          y: t.targetY,
          x1: 0,
          x2: canvasWidth,
          label: t.label,
        },
      });
      break;
    }
  }

  return results.length > 0 ? results : null;
};

export const relativeHorizontalRule = ({ bounds, otherObjects, snapThreshold, canvasHeight = BASE_HEIGHT }) => {
  let bestMatch = null;
  let minDiff = Infinity;

  for (const other of otherObjects) {
    const otherBounds = getObjectBounds(other);

    const candidates = [
      { kind: 'left-left', diff: bounds.left - otherBounds.left, targetLeft: otherBounds.left, guideX: otherBounds.left },
      { kind: 'center-center', diff: bounds.centerX - otherBounds.centerX, targetLeft: otherBounds.centerX - bounds.width / 2, guideX: otherBounds.centerX },
      { kind: 'right-right', diff: bounds.right - otherBounds.right, targetLeft: otherBounds.right - bounds.width, guideX: otherBounds.right },
      { kind: 'left-right', diff: bounds.left - otherBounds.right, targetLeft: otherBounds.right, guideX: otherBounds.right },
      { kind: 'right-left', diff: bounds.right - otherBounds.left, targetLeft: otherBounds.left - bounds.width, guideX: otherBounds.left },
    ];

    for (const candidate of candidates) {
      const absDiff = Math.abs(candidate.diff);
      if (absDiff <= snapThreshold && absDiff < minDiff) {
        minDiff = absDiff;
        bestMatch = { snappedX: candidate.targetLeft, diffX: candidate.diff, candidate, otherBounds };
      }
    }
  }

  if (bestMatch) {
    const { candidate, otherBounds } = bestMatch;
    const yMin = Math.max(0, Math.min(bounds.top, otherBounds.top) - 16);
    const yMax = Math.min(canvasHeight, Math.max(bounds.bottom, otherBounds.bottom) + 16);

    return {
      axis: 'x',
      snappedX: bestMatch.snappedX,
      diffX: bestMatch.diffX,
      guide: {
        id: `relative-x-${candidate.kind}`,
        type: 'vertical',
        x: candidate.guideX,
        y1: yMin,
        y2: yMax,
        anchorPoints: [
          { x: candidate.guideX, y: bounds.centerY },
          { x: candidate.guideX, y: otherBounds.centerY },
        ],
      },
    };
  }
  return null;
};

export const relativeVerticalRule = ({ bounds, otherObjects, snapThreshold, canvasWidth = BASE_WIDTH }) => {
  let bestMatch = null;
  let minDiff = Infinity;

  for (const other of otherObjects) {
    const otherBounds = getObjectBounds(other);

    const candidates = [
      { kind: 'top-top', diff: bounds.top - otherBounds.top, targetTop: otherBounds.top, guideY: otherBounds.top },
      { kind: 'center-center', diff: bounds.centerY - otherBounds.centerY, targetTop: otherBounds.centerY - bounds.height / 2, guideY: otherBounds.centerY },
      { kind: 'bottom-bottom', diff: bounds.bottom - otherBounds.bottom, targetTop: otherBounds.bottom - bounds.height, guideY: otherBounds.bottom },
      { kind: 'top-bottom', diff: bounds.top - otherBounds.bottom, targetTop: otherBounds.bottom, guideY: otherBounds.bottom },
      { kind: 'bottom-top', diff: bounds.bottom - otherBounds.top, targetTop: otherBounds.top - bounds.height, guideY: otherBounds.top },
    ];

    for (const candidate of candidates) {
      const absDiff = Math.abs(candidate.diff);
      if (absDiff <= snapThreshold && absDiff < minDiff) {
        minDiff = absDiff;
        bestMatch = { snappedY: candidate.targetTop, diffY: candidate.diff, candidate, otherBounds };
      }
    }
  }

  if (bestMatch) {
    const { candidate, otherBounds } = bestMatch;
    const xMin = Math.max(0, Math.min(bounds.left, otherBounds.left) - 16);
    const xMax = Math.min(canvasWidth, Math.max(bounds.right, otherBounds.right) + 16);

    return {
      axis: 'y',
      snappedY: bestMatch.snappedY,
      diffY: bestMatch.diffY,
      guide: {
        id: `relative-y-${candidate.kind}`,
        type: 'horizontal',
        y: candidate.guideY,
        x1: xMin,
        x2: xMax,
        anchorPoints: [
          { x: bounds.centerX, y: candidate.guideY },
          { x: otherBounds.centerX, y: candidate.guideY },
        ],
      },
    };
  }
  return null;
};

export const equalSpacingRule = ({ bounds, otherObjects, snapThreshold }) => {
  if (otherObjects.length < 2) return null;
  const results = [];

  const hObjects = otherObjects
    .map(getObjectBounds)
    .filter((ob) => Math.abs(ob.centerY - bounds.centerY) < Math.max(bounds.height, ob.height) * 1.5)
    .sort((a, b) => a.left - b.left);

  for (let i = 0; i < hObjects.length - 1; i++) {
    const leftObj = hObjects[i];
    const rightObj = hObjects[i + 1];

    if (bounds.left >= leftObj.left && bounds.right <= rightObj.right) {
      const totalSpace = rightObj.left - leftObj.right;
      const equalGap = (totalSpace - bounds.width) / 2;
      if (equalGap >= 0) {
        const targetLeft = leftObj.right + equalGap;
        const diff = bounds.left - targetLeft;
        if (Math.abs(diff) <= snapThreshold) {
          results.push({
            axis: 'x',
            snappedX: targetLeft,
            diffX: diff,
            guide: {
              id: 'spacing-h-between',
              type: 'spacing-h',
              gap: Math.round(equalGap),
              intervals: [
                { x1: leftObj.right, x2: targetLeft, y: bounds.centerY },
                { x1: targetLeft + bounds.width, x2: rightObj.left, y: bounds.centerY },
              ],
            },
          });
          break;
        }
      }
    }

    const existingGap = rightObj.left - leftObj.right;
    if (existingGap > 4) {
      const targetRightSide = rightObj.right + existingGap;
      const diffRight = bounds.left - targetRightSide;
      if (Math.abs(diffRight) <= snapThreshold) {
        results.push({
          axis: 'x',
          snappedX: targetRightSide,
          diffX: diffRight,
          guide: {
            id: 'spacing-h-series',
            type: 'spacing-h',
            gap: Math.round(existingGap),
            intervals: [
              { x1: leftObj.right, x2: rightObj.left, y: bounds.centerY },
              { x1: rightObj.right, x2: targetRightSide, y: bounds.centerY },
            ],
          },
        });
        break;
      }
    }
  }

  const vObjects = otherObjects
    .map(getObjectBounds)
    .filter((ob) => Math.abs(ob.centerX - bounds.centerX) < Math.max(bounds.width, ob.width) * 1.5)
    .sort((a, b) => a.top - b.top);

  for (let i = 0; i < vObjects.length - 1; i++) {
    const topObj = vObjects[i];
    const bottomObj = vObjects[i + 1];

    if (bounds.top >= topObj.top && bounds.bottom <= bottomObj.bottom) {
      const totalSpace = bottomObj.top - topObj.bottom;
      const equalGap = (totalSpace - bounds.height) / 2;
      if (equalGap >= 0) {
        const targetTop = topObj.bottom + equalGap;
        const diff = bounds.top - targetTop;
        if (Math.abs(diff) <= snapThreshold) {
          results.push({
            axis: 'y',
            snappedY: targetTop,
            diffY: diff,
            guide: {
              id: 'spacing-v-between',
              type: 'spacing-v',
              gap: Math.round(equalGap),
              intervals: [
                { y1: topObj.bottom, y2: targetTop, x: bounds.centerX },
                { y1: targetTop + bounds.height, y2: bottomObj.top, x: bounds.centerX },
              ],
            },
          });
          break;
        }
      }
    }

    const existingGap = bottomObj.top - topObj.bottom;
    if (existingGap > 4) {
      const targetBelow = bottomObj.bottom + existingGap;
      const diffBottom = bounds.top - targetBelow;
      if (Math.abs(diffBottom) <= snapThreshold) {
        results.push({
          axis: 'y',
          snappedY: targetBelow,
          diffY: diffBottom,
          guide: {
            id: 'spacing-v-series',
            type: 'spacing-v',
            gap: Math.round(existingGap),
            intervals: [
              { y1: topObj.bottom, y2: bottomObj.top, x: bounds.centerX },
              { y1: bottomObj.bottom, y2: targetBelow, x: bounds.centerX },
            ],
          },
        });
        break;
      }
    }
  }

  return results.length > 0 ? results : null;
};

export const ALIGNMENT_RULES = [
  canvasHorizontalCenterRule,
  canvasVerticalCenterRule,
  canvasEdgesAndMarginsRule,
  relativeHorizontalRule,
  relativeVerticalRule,
  equalSpacingRule,
];

/**
 * ============================================================================
 * 3. CANVAS GUIDELINES & BADGES RENDERER
 * ============================================================================
 */
const drawPillBadge = (ctx, text, cx, cy, zoom) => {
  ctx.save();
  ctx.font = GUIDE_STYLE.font;
  const paddingX = 4 / zoom;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const h = 14 / zoom;
  const w = textWidth + paddingX * 2;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = 3 / zoom;

  ctx.fillStyle = GUIDE_STYLE.badgeBg;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = GUIDE_STYLE.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5 / zoom);
  ctx.restore();
};

const renderGuidelinesOnCanvas = (canvas, guides) => {
  if (!canvas || !guides || guides.length === 0) return;

  const ctx = canvas.getTopContext?.() || canvas.contextTop;
  if (!ctx) return;

  const zoom = canvas.getZoom() || 1;
  const vpt = canvas.viewportTransform || [zoom, 0, 0, zoom, 0, 0];

  ctx.save();
  ctx.transform(...vpt);

  const scaledLineWidth = GUIDE_STYLE.lineWidth / zoom;
  const tick = GUIDE_STYLE.tickSize / zoom;

  for (const guide of guides) {
    ctx.strokeStyle = GUIDE_STYLE.stroke;
    ctx.lineWidth = scaledLineWidth;

    if (guide.type === 'vertical') {
      ctx.setLineDash(GUIDE_STYLE.dash.map((d) => d / zoom));
      ctx.beginPath();
      ctx.moveTo(guide.x, guide.y1);
      ctx.lineTo(guide.x, guide.y2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(guide.x - tick, guide.y1);
      ctx.lineTo(guide.x + tick, guide.y1);
      ctx.moveTo(guide.x - tick, guide.y2);
      ctx.lineTo(guide.x + tick, guide.y2);
      ctx.stroke();

      if (guide.anchorPoints) {
        for (const pt of guide.anchorPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = GUIDE_STYLE.stroke;
          ctx.fill();
        }
      }
    } else if (guide.type === 'horizontal') {
      ctx.setLineDash(GUIDE_STYLE.dash.map((d) => d / zoom));
      ctx.beginPath();
      ctx.moveTo(guide.x1, guide.y);
      ctx.lineTo(guide.x2, guide.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(guide.x1, guide.y - tick);
      ctx.lineTo(guide.x1, guide.y + tick);
      ctx.moveTo(guide.x2, guide.y - tick);
      ctx.lineTo(guide.x2, guide.y + tick);
      ctx.stroke();

      if (guide.anchorPoints) {
        for (const pt of guide.anchorPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5 / zoom, 0, Math.PI * 2);
          ctx.fillStyle = GUIDE_STYLE.stroke;
          ctx.fill();
        }
      }
    } else if (guide.type === 'spacing-h') {
      ctx.setLineDash([]);
      ctx.strokeStyle = GUIDE_STYLE.spacingColor;
      for (const seg of guide.intervals) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y);
        ctx.lineTo(seg.x2, seg.y);
        ctx.moveTo(seg.x1, seg.y - tick);
        ctx.lineTo(seg.x1, seg.y + tick);
        ctx.moveTo(seg.x2, seg.y - tick);
        ctx.lineTo(seg.x2, seg.y + tick);
        ctx.stroke();

        drawPillBadge(ctx, `${guide.gap}`, (seg.x1 + seg.x2) / 2, seg.y, zoom);
      }
    } else if (guide.type === 'spacing-v') {
      ctx.setLineDash([]);
      ctx.strokeStyle = GUIDE_STYLE.spacingColor;
      for (const seg of guide.intervals) {
        ctx.beginPath();
        ctx.moveTo(seg.x, seg.y1);
        ctx.lineTo(seg.x, seg.y2);
        ctx.moveTo(seg.x - tick, seg.y1);
        ctx.lineTo(seg.x + tick, seg.y1);
        ctx.moveTo(seg.x - tick, seg.y2);
        ctx.lineTo(seg.x + tick, seg.y2);
        ctx.stroke();

        drawPillBadge(ctx, `${guide.gap}`, seg.x, (seg.y1 + seg.y2) / 2, zoom);
      }
    }
  }

  ctx.restore();
};

/**
 * ============================================================================
 * 4. MAIN ALIGNMENT COMPONENT
 * ============================================================================
 */
const Alignment = ({
  fabricCanvas,
  enabled = true,
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
  safeMargin = DEFAULT_SAFE_MARGIN,
  canvasWidth = BASE_WIDTH,
  canvasHeight = BASE_HEIGHT,
  showGuides = true,
}) => {
  const activeGuidesRef = useRef([]);

  // Independent per-axis lock tracking
  const shiftLockRef = useRef({
    snappedX: null,
    snappedY: null,
    guideX: null,
    guideY: null,
  });

  useEffect(() => {
    if (!fabricCanvas) return;

    const clearGuides = () => {
      activeGuidesRef.current = [];
      shiftLockRef.current = { snappedX: null, snappedY: null, guideX: null, guideY: null };
      if (fabricCanvas.contextTop && fabricCanvas.clearContext) {
        fabricCanvas.clearContext(fabricCanvas.contextTop);
      }
      fabricCanvas.requestRenderAll();
    };

    const handleObjectMoving = (e) => {
      if (!enabled) {
        clearGuides();
        return;
      }

      const target = e.target;
      if (!target) return;

      const isShiftKey = Boolean(e.e?.shiftKey);

      // If Shift key is released, clear previous locks
      if (!isShiftKey) {
        shiftLockRef.current.snappedX = null;
        shiftLockRef.current.snappedY = null;
        shiftLockRef.current.guideX = null;
        shiftLockRef.current.guideY = null;
      }

      // Check current locked state for each axis
      const hasLockedX = isShiftKey && shiftLockRef.current.snappedX !== null;
      const hasLockedY = isShiftKey && shiftLockRef.current.snappedY !== null;

      // Apply any active axis locks before calculating bounds
      if (hasLockedX) {
        applySnapX(target, shiftLockRef.current.snappedX);
      }
      if (hasLockedY) {
        applySnapY(target, shiftLockRef.current.snappedY);
      }

      // If BOTH X and Y are locked, lock entire position and render guides
      if (hasLockedX && hasLockedY) {
        target.setCoords();
        const guides = [];
        if (shiftLockRef.current.guideX) guides.push(shiftLockRef.current.guideX);
        if (shiftLockRef.current.guideY) guides.push(shiftLockRef.current.guideY);
        activeGuidesRef.current = guides;
        if (showGuides) fabricCanvas.requestRenderAll();
        return;
      }

      target.setCoords();
      let bounds = getObjectBounds(target);

      const allObjects = fabricCanvas.getObjects ? fabricCanvas.getObjects() : [];
      const otherObjects = allObjects.filter((obj) => {
        if (!obj || obj === target) return false;
        if (obj.visible === false) return false;
        if (obj.excludeFromAlignment) return false;
        return true;
      });

      let bestX = null;
      let bestY = null;
      let minDiffX = Infinity;
      let minDiffY = Infinity;

      // Run alignment rules
      for (const rule of ALIGNMENT_RULES) {
        const rawResult = rule({
          target,
          bounds,
          otherObjects,
          canvas: fabricCanvas,
          canvasWidth,
          canvasHeight,
          safeMargin,
          snapThreshold,
        });

        if (!rawResult) continue;
        const results = Array.isArray(rawResult) ? rawResult : [rawResult];

        for (const res of results) {
          // Only evaluate X if X is not locked
          if (!hasLockedX && typeof res.snappedX === 'number') {
            const absDiff = Math.abs(res.diffX ?? 0);
            if (absDiff < minDiffX) {
              minDiffX = absDiff;
              bestX = res;
            }
          }
          // Only evaluate Y if Y is not locked
          if (!hasLockedY && typeof res.snappedY === 'number') {
            const absDiff = Math.abs(res.diffY ?? 0);
            if (absDiff < minDiffY) {
              minDiffY = absDiff;
              bestY = res;
            }
          }
        }
      }

      // Apply & Progressively Lock X
      if (!hasLockedX && bestX) {
        applySnapX(target, bestX.snappedX);
        if (isShiftKey) {
          shiftLockRef.current.snappedX = bestX.snappedX;
          shiftLockRef.current.guideX = bestX.guide;
        }
      }

      // Apply & Progressively Lock Y
      if (!hasLockedY && bestY) {
        applySnapY(target, bestY.snappedY);
        if (isShiftKey) {
          shiftLockRef.current.snappedY = bestY.snappedY;
          shiftLockRef.current.guideY = bestY.guide;
        }
      }

      target.setCoords();

      // Collect all active and locked guidelines to render
      const collectedGuides = [];
      const currentGuideX = hasLockedX ? shiftLockRef.current.guideX : bestX?.guide;
      const currentGuideY = hasLockedY ? shiftLockRef.current.guideY : bestY?.guide;

      if (currentGuideX) collectedGuides.push(currentGuideX);
      if (currentGuideY) collectedGuides.push(currentGuideY);

      activeGuidesRef.current = collectedGuides;
      if (showGuides) {
        fabricCanvas.requestRenderAll();
      }
    };

    const handleBeforeRender = () => {
      if (fabricCanvas.contextTop && fabricCanvas.clearContext) {
        fabricCanvas.clearContext(fabricCanvas.contextTop);
      }
    };

    const handleAfterRender = () => {
      if (showGuides && activeGuidesRef.current.length > 0) {
        renderGuidelinesOnCanvas(fabricCanvas, activeGuidesRef.current);
      }
    };

    fabricCanvas.on('object:moving', handleObjectMoving);
    fabricCanvas.on('before:render', handleBeforeRender);
    fabricCanvas.on('after:render', handleAfterRender);
    fabricCanvas.on('mouse:up', clearGuides);
    fabricCanvas.on('object:modified', clearGuides);
    fabricCanvas.on('selection:cleared', clearGuides);

    return () => {
      fabricCanvas.off('object:moving', handleObjectMoving);
      fabricCanvas.off('before:render', handleBeforeRender);
      fabricCanvas.off('after:render', handleAfterRender);
      fabricCanvas.off('mouse:up', clearGuides);
      fabricCanvas.off('object:modified', clearGuides);
      fabricCanvas.off('selection:cleared', clearGuides);
      clearGuides();
    };
  }, [fabricCanvas, enabled, snapThreshold, safeMargin, canvasWidth, canvasHeight, showGuides]);

  return null;
};

export default Alignment;
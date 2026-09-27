import React, { useState, useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { checkColor, suggestPrintSafe } from '../../utils/cmyk';

/**
 * ============================================================================
 * 1. BOX PRESET STYLES
 * ============================================================================
 */
export const BOX_PRESETS = [
  {
    id: 'comic_pop',
    name: 'Comic Pop',
    boxFill: '#FEF08A',
    strokeColor: '#000000',
    strokeWidth: 3.5,
    hasShadow: true,
    shadowColor: '#000000',
    shadowDepth: 5,
    cornerRadius: 6,
    isDottedBox: false,
  },
  {
    id: 'clean_white',
    name: 'Clean Grid',
    boxFill: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 2,
    hasShadow: false,
    shadowColor: '#000000',
    shadowDepth: 0,
    cornerRadius: 2,
    isDottedBox: false,
  },
  {
    id: 'rounded_play',
    name: 'Rounded Tile',
    boxFill: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    hasShadow: true,
    shadowColor: '#F43F5E',
    shadowDepth: 4,
    cornerRadius: 12,
    isDottedBox: false,
  },
  {
    id: 'dotted_box',
    name: 'Dotted Box',
    boxFill: '#FFFBEB',
    strokeColor: '#000000',
    strokeWidth: 2.5,
    hasShadow: false,
    shadowColor: '#000000',
    shadowDepth: 0,
    cornerRadius: 6,
    isDottedBox: true,
  },
  {
    id: 'pastel_pink',
    name: 'Pop Pink',
    boxFill: '#FCE7F3',
    strokeColor: '#000000',
    strokeWidth: 3,
    hasShadow: true,
    shadowColor: '#000000',
    shadowDepth: 4,
    cornerRadius: 6,
    isDottedBox: false,
  },
];

const SWATCH_PALETTE = [
  '#000000', '#FFFFFF', '#FEF08A', '#FCE7F3',
  '#DCFCE7', '#DBEAFE', '#F87171', '#F59E0B',
];

// Fisher-Yates random index picker for hints
export const getRandomIndices = (totalCount, countToReveal) => {
  const total = Math.max(1, totalCount);
  const k = Math.min(Math.max(1, countToReveal), total);
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, k).sort((a, b) => a - b);
};

// Helper to draw smooth rounded rectangles
const drawRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

/**
 * ============================================================================
 * 2. CANVAS CUSTOM RENDERER
 * ============================================================================
 */
export const attachGuessRenderer = (obj) => {
  if (!obj) return;
  obj.isGuessAsset = true;
  obj.objectCaching = false;

  if (obj.cacheProperties) {
    obj.cacheProperties = [
      ...obj.cacheProperties,
      'isGuessAsset', 'guessType', 'stylePresetId', 'word',
      'letterCount', 'displayMode', 'itemSize', 'gap',
      'strokeColor', 'strokeWidth', 'boxFill', 'textColor',
      'shadowColor', 'hasShadow', 'shadowDepth', 'cornerRadius',
      'showNumbers', 'isDottedBox', 'revealedIndices', 'hintCount'
    ];
  }

  obj._render = function (ctx) {
    const count = Math.max(1, Number(this.letterCount) || (this.word ? this.word.length : 1));
    const rawWord = (this.word || '').toUpperCase();
    const letters = rawWord ? rawWord.split('') : [];

    const size = Number(this.itemSize) || 38;
    const gap = Number(this.gap) || 8;
    const strokeW = Number(this.strokeWidth) || 3;
    const strokeCol = this.strokeColor || '#000000';
    const fillCol = this.boxFill || '#FEF08A';
    const textCol = this.textColor || '#000000';
    const shadowCol = this.shadowColor || '#000000';
    const hasShadow = Boolean(this.hasShadow);
    const shadowDepth = hasShadow ? (Number(this.shadowDepth) || 5) : 0;
    const cornerR = this.cornerRadius !== undefined ? Number(this.cornerRadius) : 6;
    const mode = this.displayMode || 'blank';
    const type = this.guessType || 'boxes';
    const showNums = Boolean(this.showNumbers);
    const isDottedBox = Boolean(this.isDottedBox);

    const revealedIndices = Array.isArray(this.revealedIndices) ? this.revealedIndices : [];

    const totalContentW = count * size + (count - 1) * gap;
    const startX = -totalContentW / 2 - (hasShadow ? shadowDepth / 2 : 0);

    ctx.save();

    if (type === 'boxes') {
      const startY = -size / 2 - (hasShadow ? shadowDepth / 2 : 0);

      for (let i = 0; i < count; i++) {
        const char = letters[i] || '';
        if (char === ' ') continue;

        const bx = startX + i * (size + gap);
        const by = startY;

        // 1. 3D Pop Shadow
        if (hasShadow && shadowDepth > 0) {
          ctx.save();
          ctx.fillStyle = shadowCol;
          drawRoundedRect(ctx, bx + shadowDepth, by + shadowDepth, size, size, cornerR);
          ctx.fill();
          ctx.restore();
        }

        // 2. Box Fill & Border
        ctx.save();
        drawRoundedRect(ctx, bx, by, size, size, cornerR);
        ctx.fillStyle = fillCol;
        ctx.fill();

        if (strokeW > 0) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = strokeW;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          if (isDottedBox) {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 3. Small Index Number (1, 2, 3...)
        if (showNums) {
          ctx.save();
          ctx.font = 'bold 9px sans-serif';
          ctx.fillStyle = strokeCol;
          ctx.globalAlpha = 0.55;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`${i + 1}`, bx + 4, by + 4);
          ctx.restore();
        }

        // 4. Letter inside box
        let letterToDraw = '';
        if (mode === 'filled') {
          letterToDraw = char;
        } else if (mode === 'hint' || mode === 'first_last') {
          if (revealedIndices.includes(i)) letterToDraw = char;
        }

        if (letterToDraw) {
          ctx.save();
          const fontSize = Math.round(size * 0.54);
          ctx.font = `900 ${fontSize}px "Arial Black", "Arial", "Impact", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = textCol;
          ctx.fillText(letterToDraw, bx + size / 2, by + size / 2 + (showNums ? 2 : 0));
          ctx.restore();
        }
      }
    } else {
      // Long Dash or Question-Paper Dotted Dash
      const isDotted = type === 'dotted_dash';
      const dashY = mode !== 'blank' ? 10 : 0;

      for (let i = 0; i < count; i++) {
        const char = letters[i] || '';
        if (char === ' ') continue;

        const x1 = startX + i * (size + gap);
        const x2 = x1 + size;
        const y = dashY;

        ctx.save();
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = strokeW;

        if (isDotted) {
          ctx.lineCap = 'round';
          ctx.setLineDash([1.5, 4.5]);
        } else {
          ctx.lineCap = 'round';
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.restore();

        // Index number below dash
        if (showNums) {
          ctx.save();
          ctx.font = 'bold 8.5px sans-serif';
          ctx.fillStyle = strokeCol;
          ctx.globalAlpha = 0.5;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`${i + 1}`, x1 + size / 2, y + strokeW + 4);
          ctx.restore();
        }

        // Letter above dash
        let letterToDraw = '';
        if (mode === 'filled') {
          letterToDraw = char;
        } else if (mode === 'hint' || mode === 'first_last') {
          if (revealedIndices.includes(i)) letterToDraw = char;
        }

        if (letterToDraw) {
          ctx.save();
          const fontSize = Math.round(size * 0.58);
          ctx.font = `900 ${fontSize}px "Arial Black", "Arial", "Impact", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = textCol;
          ctx.fillText(letterToDraw, x1 + size / 2, y - 4);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  };

  const originalToObject = obj.toObject.bind(obj);
  obj.toObject = function (propertiesToInclude = []) {
    return originalToObject([
      ...propertiesToInclude,
      'isGuessAsset', 'guessType', 'stylePresetId', 'word',
      'letterCount', 'displayMode', 'itemSize', 'gap',
      'strokeColor', 'strokeWidth', 'boxFill', 'textColor',
      'shadowColor', 'hasShadow', 'shadowDepth', 'cornerRadius',
      'showNumbers', 'isDottedBox', 'revealedIndices', 'hintCount',
    ]);
  };
};

/**
 * ============================================================================
 * 3. FABRIC CREATION & UPDATE HELPERS
 * ============================================================================
 */
export const createGuessAsset = (fabricCanvas, options = {}) => {
  if (!fabricCanvas) return null;

  const count = Math.max(1, Number(options.letterCount) || (options.word ? options.word.length : 6));
  const size = Number(options.itemSize) || 38;
  const gap = Number(options.gap) || 8;
  const shadowDepth = options.hasShadow ? (Number(options.shadowDepth) || 5) : 0;

  const totalContentW = count * size + (count - 1) * gap;
  const totalW = totalContentW + shadowDepth + 20;
  const totalH = options.guessType === 'boxes'
    ? size + shadowDepth + 20
    : (options.displayMode !== 'blank' ? 56 : 38);

  const vpCenter = typeof fabricCanvas.getVpCenter === 'function'
    ? fabricCanvas.getVpCenter()
    : { x: 300, y: 300 };

  const centerLeft = options.left !== undefined ? options.left : (vpCenter.x - totalW / 2);
  const centerTop = options.top !== undefined ? options.top : (vpCenter.y - totalH / 2);

  const guessObj = new fabric.FabricObject({
    left: centerLeft,
    top: centerTop,
    width: totalW,
    height: totalH,
    fill: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    cornerColor: '#f43f5e',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    padding: 6,
    objectCaching: false,
    ...options,
  });

  guessObj.isGuessAsset = true;
  guessObj.guessType = options.guessType || 'boxes';
  guessObj.stylePresetId = options.stylePresetId || 'comic_pop';
  guessObj.word = options.word || '';
  guessObj.letterCount = count;
  guessObj.displayMode = options.displayMode || 'blank';
  guessObj.hintCount = options.hintCount || 1;
  guessObj.revealedIndices = options.revealedIndices || (options.displayMode === 'hint' ? getRandomIndices(count, guessObj.hintCount) : []);
  guessObj.itemSize = size;
  guessObj.gap = gap;
  guessObj.strokeColor = options.strokeColor || '#000000';
  guessObj.strokeWidth = options.strokeWidth ?? 3.5;
  guessObj.boxFill = options.boxFill || '#FEF08A';
  guessObj.textColor = options.textColor || '#000000';
  guessObj.shadowColor = options.shadowColor || '#000000';
  guessObj.hasShadow = options.hasShadow ?? true;
  guessObj.shadowDepth = shadowDepth || 5;
  guessObj.cornerRadius = options.cornerRadius ?? 6;
  guessObj.showNumbers = Boolean(options.showNumbers);
  guessObj.isDottedBox = Boolean(options.isDottedBox);

  attachGuessRenderer(guessObj);

  fabricCanvas.add(guessObj);
  fabricCanvas.setActiveObject(guessObj);
  fabricCanvas.requestRenderAll();

  return guessObj;
};

export const updateGuessAsset = (fabricCanvas, obj, newOptions = {}) => {
  if (!fabricCanvas || !obj || !obj.isGuessAsset) return;

  Object.assign(obj, newOptions);

  const count = Math.max(1, Number(obj.letterCount) || (obj.word ? obj.word.length : 6));
  const size = Number(obj.itemSize) || 38;
  const gap = Number(obj.gap) || 8;
  const shadowDepth = obj.hasShadow ? (Number(obj.shadowDepth) || 5) : 0;

  const totalContentW = count * size + (count - 1) * gap;
  const totalW = totalContentW + shadowDepth + 20;
  const totalH = obj.guessType === 'boxes'
    ? size + shadowDepth + 20
    : (obj.displayMode !== 'blank' ? 56 : 38);

  obj.set({
    width: totalW,
    height: totalH,
  });

  if (typeof obj.setCoords === 'function') {
    obj.setCoords();
  }
  obj.dirty = true;
  fabricCanvas.requestRenderAll();
};

/**
 * ============================================================================
 * 4. REUSABLE UI PRIMITIVES
 * ============================================================================
 */
const ColorPickerRow = ({ label, value, onChange, presets = SWATCH_PALETTE }) => {
  const cmykInfo = value && value.startsWith('#') ? checkColor(value) : null;
  const isUnsafe = cmykInfo && !cmykInfo.isSafe;
  const fix = isUnsafe ? suggestPrintSafe(value) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          {isUnsafe && (
            <span
              className="text-[9px] px-1.5 py-0.2 rounded font-semibold"
              style={{
                backgroundColor: cmykInfo.severity === 'danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                color: cmykInfo.severity === 'danger' ? '#f87171' : '#fbbf24',
              }}
              title={cmykInfo.warnings.join(' ')}
            >
              ⚠️ Print Unsafe
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-slate-400 uppercase">{value}</span>
          <input
            type="color"
            value={value.startsWith('#') ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer bg-transparent border border-slate-700 p-0"
          />
        </div>
      </div>
      {presets.length > 0 && (
        <div className="flex gap-1.5 pt-0.5">
          {presets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              style={{ backgroundColor: c }}
              className={`w-4 h-4 rounded-full border transition hover:scale-110 ${
                value.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-rose-500 scale-110 border-white' : 'border-black/40'
              }`}
            />
          ))}
        </div>
      )}
      {isUnsafe && fix?.corrected && fix.corrected !== value && (
        <div className="flex items-center justify-between text-[10px] pt-0.5 text-amber-300">
          <span className="truncate max-w-[150px]">{cmykInfo.warnings[0]}</span>
          <button
            type="button"
            onClick={() => onChange(fix.corrected)}
            className="underline hover:text-amber-200 font-mono"
            title="Convert to nearest print-safe CMYK color"
          >
            Fix ({fix.corrected.toUpperCase()})
          </button>
        </div>
      )}
    </div>
  );
};

const RangeSlider = ({ label, unit, min, max, step, value, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[11px] text-slate-300">
      <span>{label}</span>
      <span className="font-mono text-slate-400">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(step % 1 !== 0 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
    />
  </div>
);

/**
 * ============================================================================
 * 5. RIGHT SIDEBAR PROPERTIES PANEL (LIVE REAL-TIME INSPECTOR)
 * ============================================================================
 */
export const WordGuessPropertiesPanel = ({ fabricCanvas, activeObject }) => {
  const [, setTick] = useState(0);
  const triggerTick = () => setTick((t) => t + 1);

  // Popup state for the hint options
  const [showHintPopup, setShowHintPopup] = useState(false);
  const popupRef = useRef(null);

  // Close popup if clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowHintPopup(false);
      }
    };
    if (showHintPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHintPopup]);

  if (!activeObject || !activeObject.isGuessAsset) return null;

  const updateProp = (prop, val) => {
    activeObject[prop] = val;
    updateGuessAsset(fabricCanvas, activeObject, { [prop]: val });
    triggerTick();
  };

  const applyPreset = (preset) => {
    const changes = {
      stylePresetId: preset.id,
      boxFill: preset.boxFill,
      strokeColor: preset.strokeColor,
      strokeWidth: preset.strokeWidth,
      hasShadow: preset.hasShadow,
      shadowColor: preset.shadowColor,
      shadowDepth: preset.shadowDepth,
      cornerRadius: preset.cornerRadius,
      isDottedBox: preset.isDottedBox,
    };
    Object.assign(activeObject, changes);
    updateGuessAsset(fabricCanvas, activeObject, changes);
    triggerTick();
  };

  const currentType = activeObject.guessType || 'boxes';
  const isBoxes = currentType === 'boxes';
  const word = activeObject.word || '';
  const letterCount = activeObject.letterCount || (word ? word.length : 6);
  const displayMode = activeObject.displayMode || 'blank';
  const hintCount = activeObject.hintCount || 1;
  const itemSize = activeObject.itemSize || 38;
  const gap = activeObject.gap || 8;
  const strokeWidth = activeObject.strokeWidth ?? 3;
  const strokeColor = activeObject.strokeColor || '#000000';
  const boxFill = activeObject.boxFill || '#FEF08A';
  const textColor = activeObject.textColor || '#000000';
  const hasShadow = Boolean(activeObject.hasShadow);
  const shadowDepth = activeObject.shadowDepth || 5;
  const cornerRadius = activeObject.cornerRadius !== undefined ? activeObject.cornerRadius : 6;
  const showNumbers = Boolean(activeObject.showNumbers);
  const isDottedBox = Boolean(activeObject.isDottedBox);

  // Hint allocation handler: randomly picks positions across the word
  const applyRandomHint = (revealedCount) => {
    const count = Math.max(1, Number(activeObject.letterCount) || (activeObject.word ? activeObject.word.length : 6));
    const randomIndices = getRandomIndices(count, revealedCount);
    
    activeObject.displayMode = 'hint';
    activeObject.hintCount = revealedCount;
    activeObject.revealedIndices = randomIndices;

    updateGuessAsset(fabricCanvas, activeObject, {
      displayMode: 'hint',
      hintCount: revealedCount,
      revealedIndices: randomIndices,
    });
    triggerTick();
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. Clue Format Switcher */}
      <div className="space-y-1.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Format
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => updateProp('guessType', 'boxes')}
            className={`py-1.5 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
              currentType === 'boxes'
                ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold'
                : 'border-slate-700 bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xs">🔲</span>
            <span className="text-[10px]">Boxes</span>
          </button>

          <button
            type="button"
            onClick={() => updateProp('guessType', 'long_dash')}
            className={`py-1.5 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
              currentType === 'long_dash'
                ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold'
                : 'border-slate-700 bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xs">➖</span>
            <span className="text-[10px]">Long Dash</span>
          </button>

          <button
            type="button"
            onClick={() => updateProp('guessType', 'dotted_dash')}
            className={`py-1.5 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
              currentType === 'dotted_dash'
                ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-bold'
                : 'border-slate-700 bg-slate-850 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xs">⋯</span>
            <span className="text-[10px]">Dotted Blank</span>
          </button>
        </div>
      </div>

      {/* 2. Box Style Variations */}
      {isBoxes && (
        <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Box Presets
            </label>
            <span className="text-[10px] text-amber-400 font-mono">5 Styles</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {BOX_PRESETS.map((preset) => {
              const isSelected = activeObject.stylePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded-lg border text-left transition flex items-center gap-2 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/20 text-white'
                      : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded border border-black/40 shrink-0"
                    style={{ backgroundColor: preset.boxFill }}
                  />
                  <div className="truncate text-[11px] font-semibold">{preset.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Word & Letter Slots */}
      <div className="space-y-2.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="space-y-1">
          <label className="flex justify-between text-xs font-semibold text-slate-300">
            <span>Word / Secret Answer</span>
            <span className="text-[10px] font-mono text-rose-400">
              {word ? `${word.length} letters` : 'Empty slots'}
            </span>
          </label>
          <input
            type="text"
            value={word}
            placeholder="e.g. ELEPHANT"
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              activeObject.word = val;
              const newLen = val.trim().length;
              if (newLen > 0) {
                activeObject.letterCount = newLen;
                // Re-adjust hints if out of bounds
                if (activeObject.displayMode === 'hint') {
                  activeObject.revealedIndices = getRandomIndices(newLen, activeObject.hintCount || 1);
                }
              }
              updateGuessAsset(fabricCanvas, activeObject, {
                word: val,
                ...(newLen > 0 ? { letterCount: newLen, revealedIndices: activeObject.revealedIndices } : {}),
              });
              triggerTick();
            }}
            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white uppercase font-mono tracking-widest focus:border-rose-500 focus:outline-none"
          />
        </div>

        {/* Slot count stepper */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] text-slate-300">
            <span>Slots / Digits Count</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const nextCount = Math.max(1, letterCount - 1);
                  activeObject.revealedIndices = getRandomIndices(nextCount, activeObject.hintCount || 1);
                  updateProp('letterCount', nextCount);
                }}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center"
              >
                −
              </button>
              <span className="font-mono text-xs font-bold text-white px-2 py-0.5 bg-slate-900 rounded border border-slate-700 w-8 text-center">
                {letterCount}
              </span>
              <button
                type="button"
                onClick={() => updateProp('letterCount', Math.min(24, letterCount + 1))}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Visibility Mode with Hint Dropdown / Popup */}
        <div className="space-y-1 pt-1 border-t border-slate-700/40 relative">
          <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
            <span>Display Mode</span>
            {displayMode === 'hint' && (
              <span className="text-[10px] text-amber-400 font-mono">
                {hintCount} Random {hintCount === 1 ? 'Letter' : 'Letters'}
              </span>
            )}
          </label>

          <div className="grid grid-cols-3 gap-1 relative">
            {/* Blank Button */}
            <button
              type="button"
              onClick={() => {
                setShowHintPopup(false);
                updateProp('displayMode', 'blank');
              }}
              className={`py-1 rounded-md text-[10px] font-bold border transition ${
                displayMode === 'blank'
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ⬜ Blank
            </button>

            {/* Hint Button with Popover Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (displayMode !== 'hint') {
                    applyRandomHint(hintCount || 1);
                  }
                  setShowHintPopup((prev) => !prev);
                }}
                className={`w-full py-1 rounded-md text-[10px] font-bold border transition flex items-center justify-center gap-1 ${
                  displayMode === 'hint'
                    ? 'border-rose-500 bg-rose-500 text-white shadow-md shadow-rose-500/25'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>💡 Hint</span>
                <span className="text-[9px] opacity-75">▾</span>
              </button>

              {/* POPUP: Choose 1/2/3 Random Letters */}
              {showHintPopup && (
                <div
                  ref={popupRef}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      Random Hint
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHintPopup(false)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-400 mb-2 leading-tight">
                    Reveal random letters across the word:
                  </p>

                  {/* 1 / 2 / 3 Selector */}
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {[1, 2, 3].map((num) => {
                      const isSelected = displayMode === 'hint' && hintCount === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => applyRandomHint(num)}
                          className={`py-1 rounded text-[10px] font-extrabold border transition ${
                            isSelected
                              ? 'bg-rose-500 border-rose-400 text-white shadow'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {num} {num === 1 ? 'Letter' : 'Letters'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Re-roll button for a new random arrangement */}
                  <button
                    type="button"
                    onClick={() => applyRandomHint(hintCount || 1)}
                    className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <span>🎲</span>
                    <span>Re-roll Random</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filled Button */}
            <button
              type="button"
              onClick={() => {
                setShowHintPopup(false);
                updateProp('displayMode', 'filled');
              }}
              className={`py-1 rounded-md text-[10px] font-bold border transition ${
                displayMode === 'filled'
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              🔤 Filled
            </button>
          </div>
        </div>
      </div>

      {/* 4. Real-time Colors & Styling */}
      <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          Colors & Sizing
        </label>

        {isBoxes && (
          <ColorPickerRow
            label="Box Background Color"
            value={boxFill}
            onChange={(val) => updateProp('boxFill', val)}
          />
        )}

        <ColorPickerRow
          label={isBoxes ? 'Box Border Color' : 'Dash Color'}
          value={strokeColor}
          onChange={(val) => updateProp('strokeColor', val)}
        />

        {displayMode !== 'blank' && (
          <ColorPickerRow
            label="Letter Text Color"
            value={textColor}
            onChange={(val) => updateProp('textColor', val)}
          />
        )}

        <div className="space-y-2 pt-2 border-t border-slate-700/40">
          <RangeSlider
            label={isBoxes ? 'Box Dimensions' : 'Dash Width'}
            unit="px"
            min={20} max={64} step={2}
            value={itemSize}
            onChange={(val) => updateProp('itemSize', val)}
          />

          <RangeSlider
            label="Gap Between Slots"
            unit="px"
            min={2} max={24} step={1}
            value={gap}
            onChange={(val) => updateProp('gap', val)}
          />

          <RangeSlider
            label={isBoxes ? 'Border Thickness' : 'Dash Thickness'}
            unit="px"
            min={1} max={7} step={0.5}
            value={strokeWidth}
            onChange={(val) => updateProp('strokeWidth', val)}
          />

          {isBoxes && (
            <RangeSlider
              label="Corner Rounding"
              unit="px"
              min={0} max={20} step={1}
              value={cornerRadius}
              onChange={(val) => updateProp('cornerRadius', val)}
            />
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-700/40">
          <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer select-none">
            <span>Numbered Slots (1, 2, 3...)</span>
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => updateProp('showNumbers', e.target.checked)}
              className="accent-rose-500 rounded cursor-pointer"
            />
          </label>

          {isBoxes && (
            <>
              <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer select-none">
                <span>Dotted Box Outline</span>
                <input
                  type="checkbox"
                  checked={isDottedBox}
                  onChange={(e) => updateProp('isDottedBox', e.target.checked)}
                  className="accent-rose-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer select-none">
                <span>Comic 3D Drop Shadow</span>
                <input
                  type="checkbox"
                  checked={hasShadow}
                  onChange={(e) => updateProp('hasShadow', e.target.checked)}
                  className="accent-rose-500 rounded cursor-pointer"
                />
              </label>

              {hasShadow && (
                <RangeSlider
                  label="3D Shadow Depth"
                  unit="px"
                  min={2} max={12} step={1}
                  value={shadowDepth}
                  onChange={(val) => updateProp('shadowDepth', val)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * 6. LEFT SIDEBAR GENERATOR COMPONENT (CREATOR PANEL)
 * ============================================================================
 */
const WordGuess = ({ fabricCanvas, setActiveObject }) => {
  const [guessType, setGuessType] = useState('boxes');
  const [stylePresetId, setStylePresetId] = useState('comic_pop');
  const [wordInput, setWordInput] = useState('');
  const [digitCount, setDigitCount] = useState(6);
  const [displayMode, setDisplayMode] = useState('blank');
  const [hintCount, setHintCount] = useState(1);
  const [boxFill, setBoxFill] = useState('#FEF08A');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [hasShadow, setHasShadow] = useState(true);

  const handleSelectPreset = (preset) => {
    setStylePresetId(preset.id);
    setBoxFill(preset.boxFill);
    setStrokeColor(preset.strokeColor);
    setHasShadow(preset.hasShadow);
  };

  const handleCreate = () => {
    if (!fabricCanvas) return;
    const preset = BOX_PRESETS.find((p) => p.id === stylePresetId) || BOX_PRESETS[0];
    const count = Math.max(1, digitCount);

    const newObj = createGuessAsset(fabricCanvas, {
      guessType,
      stylePresetId,
      word: wordInput.trim().toUpperCase(),
      letterCount: count,
      displayMode,
      hintCount,
      revealedIndices: displayMode === 'hint' ? getRandomIndices(count, hintCount) : [],
      boxFill: guessType === 'boxes' ? boxFill : 'transparent',
      strokeColor,
      strokeWidth: guessType === 'boxes' ? preset.strokeWidth : 3,
      hasShadow: guessType === 'boxes' ? hasShadow : false,
      shadowDepth: preset.shadowDepth,
      cornerRadius: preset.cornerRadius,
      isDottedBox: preset.isDottedBox,
    });

    if (newObj && setActiveObject) {
      setActiveObject(newObj);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Word Guess Clues
          </span>
          <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded">
            ASSET
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Add letter boxes, solid dashes, or exam-style dotted blanks.
        </p>
      </div>

      {/* Format Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-300">Choose Format</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setGuessType('boxes')}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              guessType === 'boxes'
                ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🔲</span>
            <span className="text-[10px] font-semibold">Boxes</span>
          </button>

          <button
            type="button"
            onClick={() => setGuessType('long_dash')}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              guessType === 'long_dash'
                ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="text-base">➖</span>
            <span className="text-[10px] font-semibold">Long Dash</span>
          </button>

          <button
            type="button"
            onClick={() => setGuessType('dotted_dash')}
            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              guessType === 'dotted_dash'
                ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="text-base">⋯</span>
            <span className="text-[10px] font-semibold">Dotted Blank</span>
          </button>
        </div>
      </div>

      {/* Box Preset Picker (if boxes) */}
      {guessType === 'boxes' && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300">Box Style Preset</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {BOX_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  stylePresetId === preset.id
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/40 inline-block"
                  style={{ backgroundColor: preset.boxFill }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Word & Count inputs */}
      <div className="p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300">Word or Answer (Optional)</label>
          <input
            type="text"
            placeholder="e.g. TREASURE"
            value={wordInput}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setWordInput(val);
              if (val.trim().length > 0) setDigitCount(val.trim().length);
            }}
            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white uppercase font-mono tracking-widest focus:border-rose-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span>Number of Letters / Slots</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDigitCount((c) => Math.max(1, c - 1))}
              className="w-5 h-5 rounded bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600 flex items-center justify-center"
            >
              -
            </button>
            <span className="font-mono text-xs font-bold text-white px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
              {digitCount}
            </span>
            <button
              type="button"
              onClick={() => setDigitCount((c) => Math.min(24, c + 1))}
              className="w-5 h-5 rounded bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600 flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Insert Button */}
      <button
        type="button"
        onClick={handleCreate}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add {digitCount}-{guessType === 'boxes' ? 'Box' : 'Dash'} Blank to Canvas</span>
      </button>
    </div>
  );
};

export default WordGuess;
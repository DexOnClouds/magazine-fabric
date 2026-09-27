import { useState, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { BODY_FONTS, ensureFontLoaded } from '../utils/fonts';
import {
  hasTextSelection,
  applyTextStyle,
  toggleBold,
  toggleItalic,
  toggleUnderline,
} from '../utils/textSelectionHelper';
import PrintSafetyWarning from './PrintSafetyWarning';

// Minimal editorial body text starters (minimal names, no description text, default black color)
const BODY_TEXT_STARTERS = [
  {
    id: 'standard',
    name: 'Standard',
    badge: 'Poppins',
    text: 'Your story begins here. Double click to type editorial articles, interviews, captions, or personal notes for your magazine spread.',
    fontSize: 15,
    fontFamily: 'Poppins',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#000000',
    lineHeight: 1.5,
    textAlign: 'left',
    width: 420,
  },
  {
    id: 'lead',
    name: 'Lead',
    badge: 'Playfair',
    text: 'Every great publication starts with a compelling hook. This lead paragraph introduces the core narrative with clarity and style.',
    fontSize: 18,
    fontFamily: 'Playfair Display',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#000000',
    lineHeight: 1.45,
    textAlign: 'left',
    width: 430,
  },
  {
    id: 'quote',
    name: 'Quote',
    badge: 'Italic',
    text: '“Design is not just what it looks like and feels like. Design is how it makes the story breathe on the page.”',
    fontSize: 16,
    fontFamily: 'Playfair Display',
    fontWeight: 'bold',
    fontStyle: 'italic',
    fill: '#000000',
    lineHeight: 1.5,
    textAlign: 'center',
    width: 380,
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    badge: 'Shine',
    text: 'Authentic vintage typewriter print with organic mechanical texture and timeless editorial appeal.',
    fontSize: 15,
    fontFamily: 'Shine Typewriter',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#000000',
    lineHeight: 1.5,
    textAlign: 'left',
    width: 420,
  },
  {
    id: 'pixel',
    name: 'Pixel',
    badge: 'Geist',
    text: 'Digital cyber aesthetic with crisp pixel-grid letterforms for modern indie spreads.',
    fontSize: 14,
    fontFamily: 'Geist Pixel',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#000000',
    lineHeight: 1.45,
    textAlign: 'left',
    width: 420,
  },
  {
    id: 'caption',
    name: 'Caption',
    badge: 'Meta',
    text: 'Words & Photography by Editorial Team • Spring Issue 2026',
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '500',
    fontStyle: 'normal',
    fill: '#475569',
    lineHeight: 1.4,
    textAlign: 'left',
    width: 360,
  },
];

const EDITORIAL_PALETTE = [
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Charcoal Black', hex: '#111827' },
  { name: 'Slate Gray', hex: '#475569' },
  { name: 'Navy Blue', hex: '#1E3A8A' },
  { name: 'Wine Red', hex: '#991B1B' },
  { name: 'Forest Green', hex: '#14532D' },
  { name: 'Warm Mocha', hex: '#78350F' },
  { name: 'Paper White', hex: '#FFFFFF' },
];

/**
 * ============================================================================
 * 1. LEFT SIDEBAR: MINIMAL BODY TEXT CREATOR & PRESETS
 * ============================================================================
 */
const BodyText = ({ fabricCanvas, setActiveObject }) => {
  const [selectedFormat, setSelectedFormat] = useState('standard');
  const [activeBodyFont, setActiveBodyFont] = useState('Poppins');

  // Add Body Text placed right in the middle by default, with black font
  const handleAddBodyText = async (starter = BODY_TEXT_STARTERS[0]) => {
    if (!fabricCanvas) return;

    const chosenFont = starter.fontFamily || activeBodyFont;
    await ensureFontLoaded(chosenFont);

    const boxWidth = starter.width || 420;
    // Logical A4 dimensions: 595 x 842. Perfectly center both horizontally and vertically
    const leftPos = Math.max(30, Math.round((595 - boxWidth) / 2));
    const topPos = 320;

    const bodyObj = new fabric.Textbox(starter.text, {
      left: leftPos,
      top: topPos,
      width: boxWidth,
      fontSize: starter.fontSize || 15,
      fontFamily: chosenFont,
      fontWeight: starter.fontWeight || 'normal',
      fontStyle: starter.fontStyle || 'normal',
      fill: starter.fill || '#000000', // Always pure black by default for standard
      textAlign: starter.textAlign || 'left',
      lineHeight: starter.lineHeight || 1.5,
      cornerColor: '#f43f5e',
      cornerStyle: 'circle',
      cornerSize: 10,
      transparentCorners: false,
    });

    bodyObj.isBodyText = true;
    bodyObj.layerCategory = 'bodyText';

    fabricCanvas.add(bodyObj);
    bodyObj.setCoords();

    fabricCanvas.setActiveObject(bodyObj);
    if (setActiveObject) setActiveObject(bodyObj);
    fabricCanvas.requestRenderAll();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Main Action */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Body Text
          </h3>
          <p className="text-xs text-slate-400">
            Editorial paragraphs, stories, and quotes.
          </p>
        </div>

        {/* Primary "+ Add Body Text" Button */}
        <button
          onClick={() => handleAddBodyText(BODY_TEXT_STARTERS[0])}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition flex items-center justify-center gap-2 group"
          title="Add editorial body text in the middle of canvas"
        >
          <svg className="w-4 h-4 transition group-hover:rotate-90 duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Body Text</span>
        </button>
      </div>

      {/* Body Font Collection Grid */}
      <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Body Fonts
          </label>
          <span className="text-[10px] text-amber-400 font-mono">
            {BODY_FONTS.length} FONTS
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {BODY_FONTS.map((font) => {
            const isSelected = activeBodyFont.toLowerCase() === font.family.toLowerCase();
            return (
              <button
                key={font.id}
                onClick={async () => {
                  setActiveBodyFont(font.family);
                  await ensureFontLoaded(font.family);
                  if (fabricCanvas) {
                    const active = fabricCanvas.getActiveObject();
                    if (active && (active instanceof fabric.Textbox || active.type === 'textbox')) {
                      active.set('fontFamily', font.family);
                      active.initDimensions?.();
                      fabricCanvas.requestRenderAll();
                    }
                  }
                }}
                className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700 text-slate-300'
                }`}
                title={`Use ${font.name} for body text`}
              >
                <div className="text-xs font-semibold truncate">{font.name}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-sans">
                  <span className="truncate">{font.category}</span>
                  <span className="text-xs font-bold" style={{ fontFamily: font.family }}>
                    Aa
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimal Starters List (No wordy descriptions) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Quick Starters
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {BODY_TEXT_STARTERS.length} STYLES
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {BODY_TEXT_STARTERS.map((starter) => {
            const isCurrent = selectedFormat === starter.id;
            return (
              <button
                key={starter.id}
                onClick={() => {
                  setSelectedFormat(starter.id);
                  handleAddBodyText(starter);
                }}
                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between group ${
                  isCurrent
                    ? 'bg-slate-800 border-rose-500/60 shadow-sm'
                    : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                }`}
                title={`Add ${starter.name} to center of canvas`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition">
                    {starter.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {starter.badge}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:text-rose-400 transition">
                  +
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * 2. RIGHT SIDEBAR: BODY TEXT PROPERTIES INSPECTOR PANEL
 * Dedicated properties window for Body Text layers (supports partial selection!)
 * ============================================================================
 */
export const BodyTextPropertiesPanel = ({
  fabricCanvas,
  activeObject,
  centerHorizontally,
  bringToFront,
  sendToBack,
}) => {
  const [, setTick] = useState(0);
  const triggerUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Listen to Fabric canvas events to stay reactively updated
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleUpdate = () => triggerUpdate();

    fabricCanvas.on('text:selection:changed', handleUpdate);
    fabricCanvas.on('text:changed', handleUpdate);
    fabricCanvas.on('object:modified', handleUpdate);

    return () => {
      fabricCanvas.off('text:selection:changed', handleUpdate);
      fabricCanvas.off('text:changed', handleUpdate);
      fabricCanvas.off('object:modified', handleUpdate);
    };
  }, [fabricCanvas, triggerUpdate]);

  if (!activeObject) return null;

  const isSelectionActive = hasTextSelection(activeObject);

  // Extract current values (if text is highlighted, read from selection; otherwise whole object)
  let currentFont = activeObject.fontFamily || 'Poppins';
  let currentSize = Math.round(activeObject.fontSize || 15);
  let isBold = activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700;
  let isItalic = activeObject.fontStyle === 'italic';
  let isUnderline = activeObject.underline === true;
  let currentFill = activeObject.fill || '#000000';
  const lineHeight = Number(activeObject.lineHeight || 1.5).toFixed(2);
  const textAlign = activeObject.textAlign || 'left';
  const charSpacing = activeObject.charSpacing || 0;
  const textVal = activeObject.text || '';

  if (isSelectionActive) {
    const selStyles = activeObject.getSelectionStyles() || [];
    if (selStyles.length > 0) {
      const first = selStyles[0] || {};
      if (first.fontFamily) currentFont = first.fontFamily;
      if (first.fontSize) currentSize = Math.round(first.fontSize);
      if (first.fontWeight !== undefined) isBold = first.fontWeight === 'bold' || first.fontWeight === 700;
      if (first.fontStyle !== undefined) isItalic = first.fontStyle === 'italic';
      if (first.underline !== undefined) isUnderline = first.underline === true;
      if (first.fill) currentFill = first.fill;
    }
  }

  // Update property (supports partial text selection vs whole layer)
  const updateProp = (prop, val) => {
    applyTextStyle(fabricCanvas, activeObject, prop, val);
    triggerUpdate();
  };

  const handleFontChange = async (fontFamily) => {
    await ensureFontLoaded(fontFamily);
    applyTextStyle(fabricCanvas, activeObject, 'fontFamily', fontFamily);
    triggerUpdate();
  };

  const changeFontSize = (newSize) => {
    const s = Math.max(8, Math.min(120, Number(newSize) || 15));
    applyTextStyle(fabricCanvas, activeObject, 'fontSize', s);
    triggerUpdate();
  };

  return (
    <div className="space-y-5 select-none">
      {/* Selection Scope Banner */}
      <div
        className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
          isSelectionActive
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isSelectionActive ? 'bg-rose-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="font-semibold">
            {isSelectionActive ? 'Highlighted Selection' : 'Entire Paragraph'}
          </span>
        </div>
        <span className="text-[10px] font-mono opacity-80">
          {isSelectionActive ? 'Partial Styling' : 'Default All'}
        </span>
      </div>

      {/* Text Content Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Paragraph Content</label>
          <span className="text-[10px] text-slate-400 font-mono">{textVal.length} chars</span>
        </div>
        <textarea
          rows={3}
          value={textVal}
          onChange={(e) => {
            activeObject.set('text', e.target.value);
            activeObject.initDimensions?.();
            fabricCanvas.requestRenderAll();
            triggerUpdate();
          }}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition resize-none font-medium leading-relaxed"
          placeholder="Type body text..."
        />
      </div>

      {/* Font Family Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Font Family</label>
          <span className="text-[10px] text-amber-400 font-mono">{BODY_FONTS.length} Fonts</span>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
          {BODY_FONTS.map((font) => {
            const isSelected = currentFont.toLowerCase() === font.family.toLowerCase();
            return (
              <button
                key={font.id}
                onClick={() => handleFontChange(font.family)}
                className={`w-full text-left px-3 py-1.5 rounded-lg border transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">{font.name}</div>
                  <div className="text-[9px] text-slate-400 font-sans">{font.category}</div>
                </div>
                <div
                  className="text-sm px-2 py-0.5 rounded bg-slate-900/60 text-slate-200 font-bold"
                  style={{ fontFamily: font.family }}
                >
                  Aa
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size & Steppers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Font Size</label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => changeFontSize(currentSize - 1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition"
              title="Decrease size"
            >
              −
            </button>
            <span className="text-xs font-mono font-bold text-slate-200 w-9 text-center">
              {currentSize}pt
            </span>
            <button
              onClick={() => changeFontSize(currentSize + 1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center text-xs font-bold transition"
              title="Increase size"
            >
              +
            </button>
          </div>
        </div>

        <input
          type="range"
          min="9"
          max="64"
          value={currentSize}
          onChange={(e) => changeFontSize(e.target.value)}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      {/* Line Height (Leading) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Line Height (Spacing)</label>
          <span className="text-[10px] text-slate-400 font-mono">{lineHeight}x</span>
        </div>
        <input
          type="range"
          min="1.0"
          max="2.4"
          step="0.05"
          value={lineHeight}
          onChange={(e) => {
            const lh = Number(e.target.value);
            activeObject.set('lineHeight', lh);
            activeObject.initDimensions?.();
            fabricCanvas.requestRenderAll();
            triggerUpdate();
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      {/* Formatting (Bold, Italic, Underline) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Formatting</label>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              toggleBold(fabricCanvas, activeObject);
              triggerUpdate();
            }}
            className={`py-1.5 rounded-lg border text-xs font-bold transition ${
              isBold
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Bold"
          >
            B
          </button>
          <button
            onClick={() => {
              toggleItalic(fabricCanvas, activeObject);
              triggerUpdate();
            }}
            className={`py-1.5 rounded-lg border text-xs italic transition ${
              isItalic
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Italic"
          >
            I
          </button>
          <button
            onClick={() => {
              toggleUnderline(fabricCanvas, activeObject);
              triggerUpdate();
            }}
            className={`py-1.5 rounded-lg border text-xs underline transition ${
              isUnderline
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Underline"
          >
            U
          </button>
          <button
            onClick={() => {
              const upper = textVal.toUpperCase();
              activeObject.set('text', upper);
              activeObject.initDimensions?.();
              fabricCanvas.requestRenderAll();
              triggerUpdate();
            }}
            className="py-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition"
            title="Convert to UPPERCASE"
          >
            AA
          </button>
        </div>

        {/* Alignment */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => {
                activeObject.set('textAlign', align);
                activeObject.initDimensions?.();
                fabricCanvas.requestRenderAll();
                triggerUpdate();
              }}
              className={`py-1 rounded-md border text-xs capitalize transition ${
                textAlign === align
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Letter Spacing (Tracking) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Letter Spacing</label>
          <span className="text-[10px] text-slate-400 font-mono">{charSpacing}</span>
        </div>
        <input
          type="range"
          min="-30"
          max="200"
          step="5"
          value={charSpacing}
          onChange={(e) => {
            const cs = Number(e.target.value);
            activeObject.set('charSpacing', cs);
            activeObject.initDimensions?.();
            fabricCanvas.requestRenderAll();
            triggerUpdate();
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
      </div>

      {/* Font Color */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Font Color</label>
        <div className="flex items-center gap-3 bg-slate-800/60 p-2 rounded-xl border border-slate-700/70">
          <input
            type="color"
            value={typeof currentFill === 'string' && currentFill.startsWith('#') ? currentFill : '#000000'}
            onChange={(e) => updateProp('fill', e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
          />
          <div className="flex-1">
            <div className="text-xs font-mono font-bold text-slate-200 uppercase">
              {typeof currentFill === 'string' ? currentFill : '#000000'}
            </div>
            <div className="text-[10px] text-slate-400">
              {isSelectionActive ? 'Applies to highlighted text' : 'Applies to entire body text'}
            </div>
          </div>
        </div>

        {/* Editorial Palette Swatches */}
        <div className="grid grid-cols-4 gap-1.5">
          {EDITORIAL_PALETTE.map((c) => (
            <button
              key={c.hex}
              onClick={() => updateProp('fill', c.hex)}
              className="h-6 rounded-md border border-slate-700 shadow-sm transition hover:scale-105 flex items-center justify-center text-[9px] font-mono text-white/70"
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>

        {/* Print Safety Warning */}
        <PrintSafetyWarning
          color={typeof currentFill === 'string' && currentFill.startsWith('#') ? currentFill : null}
          onChange={(safeHex) => updateProp('fill', safeHex)}
        />
      </div>

      {/* Position & Layers */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-400 block">Position & Order</label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={centerHorizontally}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            Center on Page
          </button>
          <button
            onClick={bringToFront}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
          >
            Bring to Front
          </button>
          <button
            onClick={sendToBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition col-span-2"
          >
            Send to Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default BodyText;

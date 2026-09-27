import { useState } from 'react';
import * as fabric from 'fabric';
import { ensureFontLoaded } from '../utils/fonts';
import { getVectorStitchedPatch, renderStitchedPatchToContext } from '../utils/stitchedPatchEngine';

/**
 * ============================================================================
 * HEADING STYLE PRESETS & PROPERTIES
 * ============================================================================
 */
export const HEADING_STYLES = [
  {
    id: 'stitched-patch',
    name: 'Stitched Sticker Patch',
    badgeText: 'As Seen On',
    description: 'Yellow contour silhouette with crisp peripheral stitches (exact match to image)',
    fontFamily: 'Pearl Jean',
    fontSize: 85,
    fill: '#111111',
    stroke: null,
    strokeWidth: 0,
    backgroundColor: null,
    boxBorderStyle: 'none',
    boxPadding: 22,
    enable3D: false,
    enableStitchedPatch: true,
    patchColor: '#E6EA58',
    patchSize: 28,
    stitchColor: '#111111',
    stitchWidth: 2.5,
    stitchDash: [6, 5],
    shadow: null,
  },
  {
    id: 'pop-stamp',
    name: 'Comic Pop Stamp',
    badgeText: 'MINESWEEPER',
    description: 'Red comic pill badge with bold white text, clean single border & hard shadow',
    fontFamily: 'Painless',
    fontSize: 85,
    fill: '#FFFFFF',
    stroke: null,
    strokeWidth: 0,
    backgroundColor: '#E63946',
    boxBorderStyle: 'solid',
    boxBorderColor: '#111111',
    boxBorderWidth: 2.75,
    boxBorderDash: [],
    boxCornerRadius: 14,
    boxPadding: 16,
    enable3D: false,
    enableStitchedPatch: false,
    shadow: {
      color: '#111111',
      blur: 0,
      offsetX: 5,
      offsetY: 5,
    },
  },
  {
    id: 'retro-shadow',
    name: 'Retro Offset Shadow',
    badgeText: 'PALOOZA',
    description: 'Crisp 0-blur offset shadow with bold outline',
    fontFamily: 'Pearl Jean',
    fontSize: 85,
    fill: '#FF4B72',
    stroke: '#000000',
    strokeWidth: 2.2,
    backgroundColor: null,
    boxBorderStyle: 'none',
    boxPadding: 8,
    enable3D: false,
    enableStitchedPatch: false,
    shadow: {
      color: '#000000',
      blur: 0,
      offsetX: 5.5,
      offsetY: 5.5,
    },
  },
  {
    id: 'retro-3d-extrusion',
    name: 'Retro 3D Extrusion',
    badgeText: 'Words:',
    description: 'Photoshop 3D block depth effect (exact match to Words: in image)',
    fontFamily: 'Rogient Block',
    fontSize: 85,
    fill: '#E62325',
    stroke: '#000000',
    strokeWidth: 2.2,
    backgroundColor: null,
    boxBorderStyle: 'none',
    boxPadding: 8,
    enable3D: true,
    depth3D: 7,
    shadowColor3D: '#000000',
    dirX3D: 1,
    dirY3D: 1,
    enableStitchedPatch: false,
    shadow: null,
  },
  {
    id: 'dotted-yellow',
    name: 'Dotted Yellow Badge',
    badgeText: 'FUN FACT!',
    description: 'Yellow background with dotted stroke (like FUN FACT in image)',
    fontFamily: 'Frogie',
    fontSize: 85,
    fill: '#111111',
    stroke: null,
    strokeWidth: 0,
    backgroundColor: '#FCE762',
    boxBorderStyle: 'dotted',
    boxBorderColor: '#111111',
    boxBorderWidth: 2.75,
    boxBorderDash: [7, 5],
    boxCornerRadius: 14,
    boxPadding: 18,
    enable3D: false,
    enableStitchedPatch: false,
    shadow: {
      color: 'rgba(0,0,0,0.14)',
      blur: 4,
      offsetX: 3.5,
      offsetY: 3.5,
    },
  },
];

/**
 * Hook custom background renderer, 3D extrusion, and stitched patch rendering to fabric.Textbox
 */
export const attachCustomBoxRenderer = (textObj) => {
  // Sequence counter to prevent out-of-order async resolution
  textObj._stitchedSeq = 0;

  // Async method to generate & cache vector contours
  textObj.updateStitchedPatch = async function (fabricCanvas) {
    if (!this.enableStitchedPatch) return;

    const currentSeq = ++this._stitchedSeq;

    const patch = await getVectorStitchedPatch(this.text, {
      fontFamily: this.fontFamily || 'Pearl Jean',
      fontSize: this.fontSize || 85,
      patchSize: this.patchSize ?? 28,
      patchRadius: this.patchRadius || (this.patchSize ? this.patchSize / 2 : 14),
      stitchDash: this.stitchDash || [6, 5],
    });

    if (currentSeq !== this._stitchedSeq) return;

    if (patch) {
      this._vectorPatch = patch;
      this.dirty = true;
      const targetCanvas = this.canvas || fabricCanvas;
      if (targetCanvas) {
        targetCanvas.requestRenderAll();
      }
    }
  };

  // Debounced update for live typing and halo sliders
  textObj._updateTimer = null;
  textObj.debouncedUpdateStitchedPatch = function (delay = 45) {
    clearTimeout(this._updateTimer);
    this._updateTimer = setTimeout(() => {
      this.updateStitchedPatch(this.canvas);
    }, delay);
  };

  if (!textObj._stitchedListenersBound) {
    textObj.on('changed', function () {
      if (this.enableStitchedPatch) {
        this.debouncedUpdateStitchedPatch(40);
      }
    });
    textObj._stitchedListenersBound = true;
  }

  // Intercept Fabric's .set() so inspector sliders update dynamically without reselection
  if (!textObj._origSetHooked) {
    const origSet = textObj.set.bind(textObj);
    textObj.set = function (key, val) {
      const result = origSet(key, val);

      const isVectorProp =
        key === 'text' ||
        key === 'fontSize' ||
        key === 'fontFamily' ||
        key === 'patchSize' ||
        key === 'patchRadius' ||
        key === 'stitchDash' ||
        (typeof key === 'object' &&
          ('text' in key ||
            'fontSize' in key ||
            'fontFamily' in key ||
            'patchSize' in key ||
            'patchRadius' in key ||
            'stitchDash' in key));

      const isStyleProp =
        key === 'stitchWidth' ||
        key === 'stitchColor' ||
        key === 'patchColor' ||
        key === 'fill' ||
        key === 'backgroundColor' ||
        key === 'boxBorderColor' ||
        key === 'boxBorderWidth' ||
        key === 'boxCornerRadius' ||
        key === 'boxPadding' ||
        key === 'shadow' ||
        (typeof key === 'object' &&
          ('stitchWidth' in key ||
            'stitchColor' in key ||
            'patchColor' in key ||
            'fill' in key ||
            'backgroundColor' in key ||
            'boxBorderColor' in key ||
            'boxBorderWidth' in key ||
            'boxCornerRadius' in key ||
            'boxPadding' in key ||
            'shadow' in key));

      if (this.enableStitchedPatch) {
        if (isVectorProp) {
          this.debouncedUpdateStitchedPatch(40);
        } else if (isStyleProp) {
          this.dirty = true;
          this.canvas?.requestRenderAll();
        }
      } else if (isStyleProp) {
        this.dirty = true;
        this.canvas?.requestRenderAll();
      }

      return result;
    };
    textObj._origSetHooked = true;
  }

  // Dynamic getters/setters for direct property modifications
  let _patchSize = textObj.patchSize ?? 28;
  let _stitchWidth = textObj.stitchWidth ?? 2.5;
  let _patchColor = textObj.patchColor ?? '#E6EA58';
  let _stitchColor = textObj.stitchColor ?? '#111111';

  Object.defineProperty(textObj, 'patchSize', {
    get() {
      return _patchSize;
    },
    set(val) {
      _patchSize = Number(val);
      if (this.enableStitchedPatch) {
        this.debouncedUpdateStitchedPatch(40);
      }
    },
    configurable: true,
  });

  Object.defineProperty(textObj, 'stitchWidth', {
    get() {
      return _stitchWidth;
    },
    set(val) {
      _stitchWidth = Number(val);
      this.dirty = true;
      this.canvas?.requestRenderAll();
    },
    configurable: true,
  });

  Object.defineProperty(textObj, 'patchColor', {
    get() {
      return _patchColor;
    },
    set(val) {
      _patchColor = val;
      this.dirty = true;
      this.canvas?.requestRenderAll();
    },
    configurable: true,
  });

  Object.defineProperty(textObj, 'stitchColor', {
    get() {
      return _stitchColor;
    },
    set(val) {
      _stitchColor = val;
      this.dirty = true;
      this.canvas?.requestRenderAll();
    },
    configurable: true,
  });

  // 1. Hook background renderer (Badge boxes, comic shadow & single crisp border)
  textObj._renderBackground = function (ctx) {
    // A) STITCHED PATCH EFFECT
    if (this.enableStitchedPatch) {
      if (this._vectorPatch) {
        renderStitchedPatchToContext(ctx, this._vectorPatch, {
          patchColor: this.patchColor || '#E6EA58',
          stitchColor: this.stitchColor || '#111111',
          stitchWidth: this.stitchWidth ?? 2.5,
          textColor: 'transparent',
        });
      } else {
        this.updateStitchedPatch?.(this.canvas);
      }
      return;
    }

    if (!this.backgroundColor && (!this.boxBorderStyle || this.boxBorderStyle === 'none')) {
      return;
    }

    const pad = this.boxPadding || 0;
    const w = this.width + pad * 2;
    const h = this.height + pad * 2;
    const x = -this.width / 2 - pad;
    const y = -this.height / 2 - pad;
    const r = this.boxCornerRadius || 8;

    ctx.save();

    // 1. Render Box Drop Shadow (Layered underneath the badge)
    const hasShadow = this.shadow && (this.shadow.offsetX !== 0 || this.shadow.offsetY !== 0);
    if (hasShadow) {
      const sOffsetX = this.shadow.offsetX || 0;
      const sOffsetY = this.shadow.offsetY || 0;
      const sColor = this.shadow.color || '#111111';
      const sBlur = this.shadow.blur || 0;

      if (sBlur === 0) {
        // Comic-style hard drop shadow block
        ctx.fillStyle = sColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x + sOffsetX, y + sOffsetY, w, h, r);
        } else {
          ctx.rect(x + sOffsetX, y + sOffsetY, w, h);
        }
        ctx.fill();

        if (this.boxBorderStyle && this.boxBorderStyle !== 'none') {
          ctx.strokeStyle = sColor;
          ctx.lineWidth = this.boxBorderWidth || 2;
          ctx.setLineDash([]);
          ctx.stroke();
        }
      } else {
        // Blurred soft shadow
        ctx.save();
        ctx.shadowColor = sColor;
        ctx.shadowBlur = sBlur;
        ctx.shadowOffsetX = sOffsetX;
        ctx.shadowOffsetY = sOffsetY;
        ctx.fillStyle = this.backgroundColor || '#ffffff';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. CRITICAL FIX: Clear context shadow while rendering the badge fill & border.
    // This prevents the border stroke from casting a duplicate line on the top/left!
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 3. Fill background box (Covers top-left of shadow block)
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    }

    // 4. Draw crisp, single outer border stroke (No ghost inner lines)
    if (this.boxBorderStyle && this.boxBorderStyle !== 'none') {
      ctx.strokeStyle = this.boxBorderColor || '#111111';
      ctx.lineWidth = this.boxBorderWidth || 2;
      if (this.boxBorderStyle === 'dotted') {
        ctx.setLineDash(this.boxBorderDash || [6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.stroke();
    }

    // Restores original context state so the foreground text retains its crisp drop shadow!
    ctx.restore();
  };

  // 2. Hook text renderer
  if (!textObj._originalRenderText) {
    textObj._originalRenderText = textObj._renderText;
  }

  const originalRenderText = textObj._originalRenderText;

  textObj._renderText = function (ctx) {
    // A) STITCHED PATCH EFFECT
    if (this.enableStitchedPatch) {
      if (this._vectorPatch && this._vectorPatch.textPath2D) {
        ctx.save();
        ctx.fillStyle = this.fill || '#111111';
        ctx.fill(this._vectorPatch.textPath2D);
        ctx.restore();
        return;
      }
      originalRenderText.call(this, ctx);
      return;
    }

    // B) RETRO 3D EXTRUSION
    if (this.enable3D && this.depth3D && this.depth3D > 0) {
      ctx.save();
      const depth = Number(this.depth3D) || 7;
      const shadowColor = this.shadowColor3D || '#000000';
      const origFill = this.fill;
      const origStroke = this.stroke;
      const dirX = this.dirX3D !== undefined ? this.dirX3D : 1;
      const dirY = this.dirY3D !== undefined ? this.dirY3D : 1;
      const step = 0.5;

      this.fill = shadowColor;
      this.stroke = shadowColor;

      for (let d = depth; d >= step; d -= step) {
        ctx.save();
        ctx.translate(d * dirX, d * dirY);
        if (this.strokeWidth && this.strokeWidth > 0 && typeof this._renderTextStroke === 'function') {
          this._renderTextStroke(ctx);
        }
        if (typeof this._renderTextFill === 'function') {
          this._renderTextFill(ctx);
        }
        ctx.restore();
      }

      this.fill = origFill;
      this.stroke = origStroke;
      ctx.restore();
    }

    // C) Render regular front text
    originalRenderText.call(this, ctx);
  };
};

/**
 * Create a new heading Textbox with given style preset and add it to canvas
 */
export const createStyledHeading = async (fabricCanvas, styleId = 'stitched-patch', customOverrides = {}) => {
  if (!fabricCanvas) return null;

  const stylePreset = HEADING_STYLES.find((s) => s.id === styleId) || HEADING_STYLES[0];
  const merged = { ...stylePreset, ...customOverrides };

  await ensureFontLoaded(merged.fontFamily);

  const defaultText =
    customOverrides.text ||
    (stylePreset.id === 'retro-3d-extrusion'
      ? 'Words:'
      : stylePreset.id === 'stitched-patch'
        ? 'As Seen On'
        : stylePreset.id === 'pop-stamp'
          ? 'HEADING'
          : 'Heading');

  const textObj = new fabric.Textbox(defaultText, {
    left: customOverrides.left ?? 80,
    top: customOverrides.top ?? 120,
    width: customOverrides.width ?? 540,
    fontSize: merged.fontSize || 85,
    fontFamily: merged.fontFamily,
    fill: merged.fill,
    textAlign: merged.textAlign || 'center',
    stroke: merged.stroke || null,
    strokeWidth: merged.strokeWidth || 0,
    backgroundColor: merged.backgroundColor || null,
    cornerColor: '#f43f5e',
    cornerStyle: 'circle',
    cornerSize: 10,
    transparentCorners: false,
    padding: merged.boxPadding || 22,
    objectCaching: false,
    strokeUniform: true,
    lockUniScaling: true,
    shadow: merged.shadow
      ? new fabric.Shadow({
        color: merged.shadow.color,
        blur: merged.shadow.blur,
        offsetX: merged.shadow.offsetX,
        offsetY: merged.shadow.offsetY,
      })
      : null,
  });

  // Base heading properties
  textObj.headingStyleId = stylePreset.id;
  textObj.boxBorderStyle = merged.boxBorderStyle || 'none';
  textObj.boxBorderColor = merged.boxBorderColor || '#111111';
  textObj.boxBorderWidth = merged.boxBorderWidth || 2.75;
  textObj.boxBorderDash = merged.boxBorderDash || [];
  textObj.boxCornerRadius = merged.boxCornerRadius || 14;
  textObj.boxPadding = merged.boxPadding || 16;

  // Stitched patch properties
  textObj.enableStitchedPatch = !!merged.enableStitchedPatch;
  textObj.patchColor = merged.patchColor || '#E6EA58';
  textObj.patchSize = merged.patchSize ?? 28;
  textObj.stitchColor = merged.stitchColor || '#111111';
  textObj.stitchWidth = merged.stitchWidth ?? 2.5;
  textObj.stitchDash = merged.stitchDash || [6, 5];

  // 3D extrusion properties
  textObj.enable3D = !!merged.enable3D;
  textObj.depth3D = merged.depth3D || 7;
  textObj.shadowColor3D = merged.shadowColor3D || '#000000';
  textObj.dirX3D = merged.dirX3D !== undefined ? merged.dirX3D : 1;
  textObj.dirY3D = merged.dirY3D !== undefined ? merged.dirY3D : 1;

  attachCustomBoxRenderer(textObj);

  if (textObj.enableStitchedPatch) {
    await textObj.updateStitchedPatch(fabricCanvas);
  }

  fabricCanvas.add(textObj);
  fabricCanvas.setActiveObject(textObj);
  fabricCanvas.requestRenderAll();

  return textObj;
};

/**
 * Apply a style preset to an existing selected heading
 */
export const applyStyleToHeading = async (fabricCanvas, activeObject, styleId) => {
  if (!fabricCanvas || !activeObject) return;

  const stylePreset = HEADING_STYLES.find((s) => s.id === styleId);
  if (!stylePreset) return;

  await ensureFontLoaded(stylePreset.fontFamily);

  activeObject.set({
    fontFamily: stylePreset.fontFamily,
    fontSize: stylePreset.fontSize || 85,
    fill: stylePreset.fill,
    stroke: stylePreset.stroke || null,
    strokeWidth: stylePreset.strokeWidth || 0,
    backgroundColor: stylePreset.backgroundColor || null,
    padding: stylePreset.boxPadding || 16,
    objectCaching: false,
    strokeUniform: true,
    lockUniScaling: true,
    shadow: stylePreset.shadow
      ? new fabric.Shadow({
        color: stylePreset.shadow.color,
        blur: stylePreset.shadow.blur,
        offsetX: stylePreset.shadow.offsetX,
        offsetY: stylePreset.shadow.offsetY,
      })
      : null,
  });

  activeObject.headingStyleId = stylePreset.id;
  activeObject.boxBorderStyle = stylePreset.boxBorderStyle || 'none';
  activeObject.boxBorderColor = stylePreset.boxBorderColor || '#111111';
  activeObject.boxBorderWidth = stylePreset.boxBorderWidth || 2.75;
  activeObject.boxBorderDash = stylePreset.boxBorderDash || [];
  activeObject.boxCornerRadius = stylePreset.boxCornerRadius || 14;
  activeObject.boxPadding = stylePreset.boxPadding || 16;

  // Stitched patch properties
  activeObject.enableStitchedPatch = !!stylePreset.enableStitchedPatch;
  activeObject.patchColor = stylePreset.patchColor || '#E6EA58';
  activeObject.patchSize = stylePreset.patchSize ?? 28;
  activeObject.stitchColor = stylePreset.stitchColor || '#111111';
  activeObject.stitchWidth = stylePreset.stitchWidth ?? 2.5;
  activeObject.stitchDash = stylePreset.stitchDash || [6, 5];

  // 3D extrusion properties
  activeObject.enable3D = !!stylePreset.enable3D;
  activeObject.depth3D = stylePreset.depth3D || 7;
  activeObject.shadowColor3D = stylePreset.shadowColor3D || '#000000';
  activeObject.dirX3D = stylePreset.dirX3D !== undefined ? stylePreset.dirX3D : 1;
  activeObject.dirY3D = stylePreset.dirY3D !== undefined ? stylePreset.dirY3D : 1;

  attachCustomBoxRenderer(activeObject);

  if (activeObject.enableStitchedPatch) {
    await activeObject.updateStitchedPatch(fabricCanvas);
  }

  activeObject.dirty = true;
  if (activeObject.initDimensions) activeObject.initDimensions();
  activeObject.setCoords();
  fabricCanvas.requestRenderAll();
};

/**
 * ============================================================================
 * HEADINGS REACT COMPONENT
 * ============================================================================
 */
const Headings = ({ fabricCanvas, setActiveObject }) => {
  const [selectedStyleId, setSelectedStyleId] = useState('stitched-patch');

  const handleAddHeading = async (styleIdToUse) => {
    const styleId = styleIdToUse || selectedStyleId;
    const newObj = await createStyledHeading(fabricCanvas, styleId, {
      left: 70,
      top: 120 + Math.random() * 40,
    });
    if (newObj && setActiveObject) {
      setActiveObject(newObj);
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Action Button */}
      <div>
        <button
          onClick={() => handleAddHeading()}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition flex items-center justify-center gap-2 group transform active:scale-95"
        >
          <svg className="w-5 h-5 transition-transform group-hover:scale-125" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Heading</span>
        </button>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          Places an editable heading on the canvas. Double click to type!
        </p>
      </div>

      {/* Heading Styles Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Choose Heading Style
          </span>
          <span className="text-[10px] text-amber-400 font-mono font-semibold">
            MAGAZINE ZINE
          </span>
        </div>

        <div className="space-y-2.5">
          {HEADING_STYLES.map((style) => {
            const isSelected = selectedStyleId === style.id;
            return (
              <div
                key={style.id}
                onClick={() => {
                  setSelectedStyleId(style.id);
                  handleAddHeading(style.id);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer group relative shadow-sm ${isSelected
                    ? 'border-rose-500 bg-slate-800/90 ring-1 ring-rose-500'
                    : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition">
                    {style.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    {style.fontFamily}
                  </span>
                </div>

                {/* Visual Preview Badge */}
                <div
                  className="py-2.5 px-3 rounded-lg text-center overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02]"
                  style={{
                    backgroundColor: style.backgroundColor || 'rgba(255,255,255,0.04)',
                    border:
                      style.boxBorderStyle === 'dotted'
                        ? '2px dashed #111111'
                        : style.boxBorderStyle === 'solid'
                          ? '2px solid #111111'
                          : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {style.enableStitchedPatch ? (
                    <div className="inline-block px-4 py-1 rounded-full bg-[#E6EA58] border-2 border-dashed border-black">
                      <span
                        style={{
                          fontFamily: style.fontFamily,
                          color: '#111111',
                          fontSize: '22px',
                          fontWeight: 'bold',
                        }}
                      >
                        {style.badgeText}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: style.fontFamily,
                        color: style.fill,
                        fontSize: '22px',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textShadow:
                          style.shadow && style.shadow.blur === 0
                            ? `${style.shadow.offsetX}px ${style.shadow.offsetY}px 0px ${style.shadow.color}`
                            : 'none',
                        WebkitTextStroke: style.strokeWidth
                          ? `${style.strokeWidth * 0.75}px ${style.stroke}`
                          : 'none',
                      }}
                    >
                      {style.badgeText}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                  {style.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Tips Card */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Editing Headings:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
          <li>Click "+ Add Heading" or any style card to add a heading.</li>
          <li>Double click on the canvas to edit text directly.</li>
          <li>Sliders update in real-time without reselecting!</li>
        </ul>
      </div>
    </div>
  );
};

export default Headings;

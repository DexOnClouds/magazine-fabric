import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { checkColor, SEVERITY, formatCmyk, suggestPrintSafe } from '../utils/cmyk';
import * as fabric from 'fabric';
import pageColorIcon from '../assets/icons/page/pagecolor.svg';
import pageSettingIcon from '../assets/icons/page/pagesetting.svg';
import pageStyleIcon from '../assets/icons/page/pagestyle.svg';

export const PASTEL_PAGE_COLORS = [
  { name: 'Butter Yellow', hex: '#FDE9C9' },
  { name: 'Blush Pink', hex: '#F6D6D9' },
  { name: 'Sage Green', hex: '#CDE6D0' },
  { name: 'Powder Blue', hex: '#C9E2EF' },
  { name: 'Dusty Lavender', hex: '#E3D6EF' },
  { name: 'Cotton Candy Pink', hex: '#FBE0EC' },
  { name: 'Sandy Beige', hex: '#F5E6C8' },
  { name: 'Seafoam Mint', hex: '#D9EAE6' },
];

export const GENZ_ACCENT_PALETTE = [
  { name: 'Candy Pink', hex: '#F472B6' },
  { name: 'Hot Rose', hex: '#E11D48' },
  { name: 'Periwinkle Blue', hex: '#93C5FD' },
  { name: 'Electric Lilac', hex: '#C084FC' },
  { name: 'Pastel Mint', hex: '#4ADE80' },
  { name: 'Sunny Gold', hex: '#FACC15' },
  { name: 'Peach Coral', hex: '#FB923C' },
  { name: 'Slate Gray', hex: '#475569' },
];

export const PAGE_STYLES = [
  { id: 'none', name: 'Plain Canvas', previewType: 'solid' },
  { id: 'grid', name: 'Graph Paper', previewType: 'grid' },
  { id: 'lined', name: 'Lined Notebook', previewType: 'lined' },
  { id: 'star-banner', name: 'Y2K Star Spread', previewType: 'star-banner' },
  { id: 'dots', name: 'Dot Matrix', previewType: 'dots' },
  { id: 'candy-stripes', name: 'Luminous Pinstripes', previewType: 'stripes' },
  { id: 'polka-dots', name: 'Pastel Star Confetti', previewType: 'stars' },
  { id: 'checker', name: 'Heart Checkerboard', previewType: 'checker-heart' },
  { id: 'sidebar-strip', name: 'Sidebar Strip', previewType: 'sidebar' },
  { id: 'arcade-frame', name: 'Dotted Frame', previewType: 'arcade-dotted' },
  { id: 'scallop-border', name: 'Sleek Trim Border', previewType: 'scallop' },
];

/**
 * Generates transparent PNG pattern overlays with customizable colors and placement
 */
export const generatePageStyleDataUrl = (
  styleId,
  width = 595,
  height = 842,
  options = {}
) => {
  if (!styleId || styleId === 'none') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const accent = options.accentColor || '#F472B6';
  const secondary = options.secondaryColor || '#93C5FD';
  const opacity = options.opacity !== undefined ? options.opacity : 0.65;
  const borderPlacement = options.borderPlacement || 'top-bottom'; // 'top-bottom' | 'all' | 'left-right'

  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = opacity;

  // Helper: Draw 5-pointed star
  const drawStar = (cx, cy, spikes, outerRadius, innerRadius, fillColor = '#FFFFFF', initialRot = (Math.PI / 2) * 3) => {
    let rot = initialRot;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  };

  // Helper: Draw cute heart
  const drawHeart = (cx, cy, r, fill = '#FFFFFF') => {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    ctx.moveTo(0, -r * 0.15);
    ctx.bezierCurveTo(-r * 0.6, -r * 0.8, -r * 1.15, -r * 0.05, 0, r * 0.95);
    ctx.bezierCurveTo(r * 1.15, -r * 0.05, r * 0.6, -r * 0.8, 0, -r * 0.15);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  };

  // 1. Graph Paper
  if (styleId === 'grid') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const step = 24;
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }

  // 2. Lined Notebook
  if (styleId === 'lined') {
    const lineSpacing = 28;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }

  // 3. Y2K Star Spread
  if (styleId === 'star-banner') {
    const bannerHeight = 48;
    ctx.strokeStyle = 'rgba(45, 45, 45, 0.12)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const step = 24;
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x, bannerHeight);
      ctx.lineTo(x, height - bannerHeight);
    }
    for (let y = bannerHeight; y <= height - bannerHeight; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, bannerHeight);
    for (let x = 20; x < width; x += 38) {
      drawStar(x, bannerHeight / 2, 5, 10, 4.5);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);
    for (let x = 20; x < width; x += 38) {
      drawStar(x, height - bannerHeight / 2, 5, 10, 4.5);
    }

    return canvas.toDataURL('image/png');
  }

  // 4. Dot Matrix
  if (styleId === 'dots') {
    ctx.fillStyle = accent;
    const dotSpacing = 22;
    for (let x = 11; x < width; x += dotSpacing) {
      for (let y = 11; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return canvas.toDataURL('image/png');
  }

  // 5. Luminous Pinstripes
  if (styleId === 'candy-stripes') {
    const stripeWidth = 9;
    for (let x = 0; x < width; x += stripeWidth * 2) {
      ctx.fillStyle = accent;
      ctx.fillRect(x, 0, stripeWidth, height);
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.65;
    const radGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    radGrad.addColorStop(0, 'rgba(255, 255, 235, 0.88)');
    radGrad.addColorStop(0.35, 'rgba(255, 255, 250, 0.55)');
    radGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.05)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');

    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  // 6. Pastel Star Confetti
  if (styleId === 'polka-dots') {
    const starPalette = ['#F472B6', '#60A5FA', '#C084FC', '#4ADE80', '#FACC15'];
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const cellSize = 42;
    for (let y = 18; y < height; y += cellSize) {
      for (let x = 18; x < width; x += cellSize) {
        const jitterX = (pseudoRandom() - 0.5) * 22;
        const jitterY = (pseudoRandom() - 0.5) * 22;
        const starX = x + jitterX;
        const starY = y + jitterY;
        const outerR = 6.5 + pseudoRandom() * 4.5;
        const innerR = outerR * 0.44;
        const rotation = pseudoRandom() * Math.PI * 2;
        const colorIdx = Math.floor(pseudoRandom() * (starPalette.length + 1));
        const starColor = colorIdx === starPalette.length ? accent : starPalette[colorIdx];

        drawStar(starX, starY, 5, outerR, innerR, starColor, rotation);
      }
    }
    return canvas.toDataURL('image/png');
  }

  // 7. Heart Checkerboard
  if (styleId === 'checker') {
    const size = 38;
    const grout = 2.5;
    let seed = 108;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    let row = 0;
    for (let y = 0; y < height; y += size) {
      let col = 0;
      for (let x = 0; x < width; x += size) {
        const isColored = (row + col) % 2 === 1;
        const tileW = size - grout;
        const tileH = size - grout;
        const tileX = x + grout / 2;
        const tileY = y + grout / 2;

        if (isColored) {
          const isBlue = pseudoRandom() < 0.28;
          ctx.fillStyle = isBlue ? (secondary || '#93C5FD') : accent;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(tileX, tileY, tileW, tileH, 4);
            ctx.fill();
          } else {
            ctx.fillRect(tileX, tileY, tileW, tileH);
          }

          if (pseudoRandom() < 0.42) {
            drawHeart(tileX + tileW / 2, tileY + tileH / 2 - 1, 9, '#FFFFFF');
          }
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(tileX, tileY, tileW, tileH, 4);
            ctx.fill();
          } else {
            ctx.fillRect(tileX, tileY, tileW, tileH);
          }
        }
        col++;
      }
      row++;
    }
    return canvas.toDataURL('image/png');
  }

  // 8. Sidebar Strip
  if (styleId === 'sidebar-strip') {
    const stripWidth = 72;
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, stripWidth, height);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(stripWidth - 4, 0);
    ctx.lineTo(stripWidth - 4, height);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let y = 40; y < height; y += 64) {
      drawStar(stripWidth / 2 - 2, y, 5, 12, 5.5, '#FFFFFF');
    }

    ctx.strokeStyle = 'rgba(45, 45, 45, 0.10)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let y = 30; y < height; y += 30) {
      ctx.moveTo(stripWidth + 15, y);
      ctx.lineTo(width - 15, y);
    }
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }

  // 9. Arcade Frame (Simplified: clean dotted lines along periphery)
  if (styleId === 'arcade-frame') {
    const margin = 20;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
    ctx.setLineDash([]);
    return canvas.toDataURL('image/png');
  }

  // 10. Sleek Trim Border (Customizable placement: top-bottom / all / left-right)
  if (styleId === 'scallop-border') {
    const thickness = 22; // Sleek thickness leaving maximum space for content
    const scallopStep = 18;
    const scallopRadius = 9;

    const drawTopBorder = () => {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, width, thickness - 7);
      // Scalloped lower edge
      for (let x = 0; x <= width; x += scallopStep) {
        ctx.beginPath();
        ctx.arc(x + scallopStep / 2, thickness - 7, scallopRadius, 0, Math.PI);
        ctx.fill();
        // Eyelet circle perforation (no hearts)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + scallopStep / 2, thickness - 6, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
      }
      // Top delicate inner stitch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(width, 5);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawBottomBorder = () => {
      ctx.fillStyle = accent;
      ctx.fillRect(0, height - (thickness - 7), width, thickness - 7);
      for (let x = 0; x <= width; x += scallopStep) {
        ctx.beginPath();
        ctx.arc(x + scallopStep / 2, height - (thickness - 7), scallopRadius, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x + scallopStep / 2, height - (thickness - 6), 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, height - 5);
      ctx.lineTo(width, height - 5);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawLeftBorder = () => {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, thickness - 7, height);
      for (let y = 0; y <= height; y += scallopStep) {
        ctx.beginPath();
        ctx.arc(thickness - 7, y + scallopStep / 2, scallopRadius, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(thickness - 6, y + scallopStep / 2, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(5, height);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawRightBorder = () => {
      ctx.fillStyle = accent;
      ctx.fillRect(width - (thickness - 7), 0, thickness - 7, height);
      for (let y = 0; y <= height; y += scallopStep) {
        ctx.beginPath();
        ctx.arc(width - (thickness - 7), y + scallopStep / 2, scallopRadius, Math.PI / 2, -Math.PI / 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(width - (thickness - 6), y + scallopStep / 2, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(width - 5, 0);
      ctx.lineTo(width - 5, height);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (borderPlacement === 'top-bottom' || borderPlacement === 'all') {
      drawTopBorder();
      drawBottomBorder();
    }
    if (borderPlacement === 'left-right' || borderPlacement === 'all') {
      drawLeftBorder();
      drawRightBorder();
    }

    return canvas.toDataURL('image/png');
  }

  return null;
};

const PageContext = ({
  fabricCanvas,
  pageColor = '#FDE9C9',
  setPageColor,
  showSafeGuides,
  setShowSafeGuides,
  pages = [],
  activePageIndex = 0,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  pageStyle,
  setPageStyle,
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState('color');
  const [internalPageStyle, setInternalPageStyle] = useState('none');

  // Live CMYK print-safety check — recalculates whenever pageColor changes
  const cmykResult = useMemo(() => {
    if (!pageColor || pageColor.length < 4) return null;
    return checkColor(pageColor, 'Page Color');
  }, [pageColor]);

  // Customization options for the active style
  const [styleAccentColor, setStyleAccentColor] = useState('#F472B6');
  const [styleSecondaryColor, setStyleSecondaryColor] = useState('#93C5FD');
  const [styleOpacity, setStyleOpacity] = useState(0.65);
  const [borderPlacement, setBorderPlacement] = useState('top-bottom'); // 'top-bottom' | 'all' | 'left-right'

  const currentActiveStyle = pageStyle || pages[activePageIndex]?.style || internalPageStyle;

  // Apply or remove background design on Fabric Canvas
  const applyStyleToCanvas = useCallback(
    async (styleId, customOpts = {}) => {
      if (!fabricCanvas) return;

      if (!styleId || styleId === 'none') {
        fabricCanvas.backgroundImage = null;
        fabricCanvas.requestRenderAll();
        return;
      }

      const width = 595;
      const height = 842;

      const opts = {
        accentColor: customOpts.accentColor || styleAccentColor,
        secondaryColor: customOpts.secondaryColor || styleSecondaryColor,
        opacity: customOpts.opacity !== undefined ? customOpts.opacity : styleOpacity,
        borderPlacement: customOpts.borderPlacement || borderPlacement,
      };

      const dataUrl = generatePageStyleDataUrl(styleId, width, height, opts);
      if (!dataUrl) return;

      try {
        const fabricImg = await fabric.FabricImage.fromURL(dataUrl);
        fabricImg.set({
          originX: 'left',
          originY: 'top',
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
          selectable: false,
          evented: false,
        });

        fabricCanvas.backgroundImage = fabricImg;
        fabricCanvas.requestRenderAll();
      } catch (err) {
        console.error('Error applying page style:', err);
      }
    },
    [fabricCanvas, styleAccentColor, styleSecondaryColor, styleOpacity, borderPlacement]
  );

  const handleSelectStyle = (styleId) => {
    setInternalPageStyle(styleId);
    if (setPageStyle) setPageStyle(styleId);
    if (pages[activePageIndex]) {
      pages[activePageIndex].style = styleId;
    }
    applyStyleToCanvas(styleId);
  };

  const handleAccentColorChange = (newColor) => {
    setStyleAccentColor(newColor);
    applyStyleToCanvas(currentActiveStyle, { accentColor: newColor });
  };

  const handleSecondaryColorChange = (newColor) => {
    setStyleSecondaryColor(newColor);
    applyStyleToCanvas(currentActiveStyle, { secondaryColor: newColor });
  };

  const handleOpacityChange = (newOpacity) => {
    setStyleOpacity(newOpacity);
    applyStyleToCanvas(currentActiveStyle, { opacity: newOpacity });
  };

  const handlePlacementChange = (newPlacement) => {
    setBorderPlacement(newPlacement);
    applyStyleToCanvas(currentActiveStyle, { borderPlacement: newPlacement });
  };

  // Re-apply style when switching pages or mounting canvas
  useEffect(() => {
    if (fabricCanvas) {
      applyStyleToCanvas(currentActiveStyle);
    }
  }, [fabricCanvas, activePageIndex, currentActiveStyle, applyStyleToCanvas]);

  return (
    <div className="space-y-6">
      {/* ========================================= */}
      {/* TOP SECTION: MAGAZINE PAGES LIST         */}
      {/* ========================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Magazine Pages
            </span>
            <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
          <button
            onClick={onAddPage}
            className="text-xs bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-semibold py-1 px-2.5 rounded-lg transition flex items-center gap-1 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Page</span>
          </button>
        </div>

        {/* Pages Thumbnail List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {pages.map((page, index) => {
            const isActive = index === activePageIndex;
            return (
              <div
                key={page.id || index}
                onClick={() => onSelectPage && onSelectPage(index)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-800 border-rose-500 text-white shadow-md ring-1 ring-rose-500/50'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-10 rounded border shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-800 shrink-0 transition-all"
                    style={{ backgroundColor: page.backgroundColor || '#FFFFFF' }}
                  >
                    {index + 1}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold truncate">Page {index + 1}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {page.name || `A4 Magazine Spread`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDuplicatePage) onDuplicatePage(index);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-700/50 transition"
                    title="Duplicate Page"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeletePage) onDeletePage(index);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/50 transition"
                      title="Delete Page"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3 MINIMAL ICON SUBMENUS: Page Color | Page Setting | Style*/}
      {/* ========================================================= */}
      <div className="pt-3 border-t border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Page Options
          </span>
          <span className="text-[10px] font-mono text-slate-500 uppercase">
            {activeSubmenu === 'color'
              ? 'Color Palette'
              : activeSubmenu === 'setting'
              ? 'Canvas Settings'
              : 'Paper Styles'}
          </span>
        </div>

        {/* Submenu Navigation Bar */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
          {/* Submenu 1: Page Color */}
          <button
            onClick={() => setActiveSubmenu('color')}
            title="Page Color"
            className={`py-2 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 relative group ${
              activeSubmenu === 'color'
                ? 'bg-rose-500/15 border border-rose-500/40 shadow-sm'
                : 'border border-transparent hover:bg-slate-800/60 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <img
                src={pageColorIcon}
                alt="Page Color"
                className="w-5 h-5 object-contain transition-transform group-hover:scale-110"
              />
            </div>
            <span
              className={`text-[10px] font-medium tracking-tight ${
                activeSubmenu === 'color' ? 'text-rose-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Color
            </span>
            {activeSubmenu === 'color' && (
              <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-rose-400" />
            )}
          </button>

          {/* Submenu 2: Page Setting */}
          <button
            onClick={() => setActiveSubmenu('setting')}
            title="Page Setting"
            className={`py-2 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 relative group ${
              activeSubmenu === 'setting'
                ? 'bg-rose-500/15 border border-rose-500/40 shadow-sm'
                : 'border border-transparent hover:bg-slate-800/60 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <img
                src={pageSettingIcon}
                alt="Page Setting"
                className="w-5 h-5 object-contain transition-transform group-hover:scale-110"
              />
            </div>
            <span
              className={`text-[10px] font-medium tracking-tight ${
                activeSubmenu === 'setting' ? 'text-rose-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Setting
            </span>
            {activeSubmenu === 'setting' && (
              <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-rose-400" />
            )}
          </button>

          {/* Submenu 3: Page Style */}
          <button
            onClick={() => setActiveSubmenu('style')}
            title="Page Style"
            className={`py-2 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 relative group ${
              activeSubmenu === 'style'
                ? 'bg-rose-500/15 border border-rose-500/40 shadow-sm'
                : 'border border-transparent hover:bg-slate-800/60 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <img
                src={pageStyleIcon}
                alt="Page Style"
                className="w-5 h-5 object-contain transition-transform group-hover:scale-110"
              />
            </div>
            <span
              className={`text-[10px] font-medium tracking-tight ${
                activeSubmenu === 'style' ? 'text-rose-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Style
            </span>
            {activeSubmenu === 'style' && (
              <span className="absolute -bottom-0.5 w-4 h-0.5 rounded-full bg-rose-400" />
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* SUBMENU 1: PAGE COLOR                                    */}
        {/* ========================================================= */}
        {activeSubmenu === 'color' && (
          <div className="space-y-4 pt-1">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Custom Canvas Tint</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  {pageColor}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-600 shadow-inner shrink-0 cursor-pointer">
                  <input
                    type="color"
                    value={pageColor || '#FDE9C9'}
                    onChange={(e) => setPageColor(e.target.value)}
                    className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer opacity-0"
                  />
                  <div
                    className="w-full h-full rounded-lg"
                    style={{ backgroundColor: pageColor || '#FDE9C9' }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={pageColor}
                    onChange={(e) => setPageColor(e.target.value)}
                    placeholder="#FDE9C9"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 uppercase focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* ── CMYK Print-Safety Warning Banner ── */}
              {cmykResult && (
                <div
                  className="rounded-xl border p-3 space-y-2 text-xs transition-all duration-300"
                  style={{
                    borderColor:
                      cmykResult.severity === SEVERITY.DANGER  ? 'rgba(239,68,68,0.5)'  :
                      cmykResult.severity === SEVERITY.WARNING ? 'rgba(249,115,22,0.5)' :
                      cmykResult.severity === SEVERITY.CAUTION ? 'rgba(234,179,8,0.45)' :
                                                                  'rgba(34,197,94,0.4)',
                    backgroundColor:
                      cmykResult.severity === SEVERITY.DANGER  ? 'rgba(239,68,68,0.08)'  :
                      cmykResult.severity === SEVERITY.WARNING ? 'rgba(249,115,22,0.08)' :
                      cmykResult.severity === SEVERITY.CAUTION ? 'rgba(234,179,8,0.07)'  :
                                                                  'rgba(34,197,94,0.07)',
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold" style={{
                      color:
                        cmykResult.severity === SEVERITY.DANGER  ? '#f87171' :
                        cmykResult.severity === SEVERITY.WARNING ? '#fb923c' :
                        cmykResult.severity === SEVERITY.CAUTION ? '#facc15' :
                                                                    '#4ade80',
                    }}>
                      <span>
                        {cmykResult.severity === SEVERITY.DANGER  && '🔴'}
                        {cmykResult.severity === SEVERITY.WARNING && '🟠'}
                        {cmykResult.severity === SEVERITY.CAUTION && '🟡'}
                        {cmykResult.severity === SEVERITY.SAFE    && '✅'}
                      </span>
                      <span className="uppercase tracking-wide text-[10px]">
                        {cmykResult.severity === SEVERITY.SAFE ? 'Print Safe' : `Print ${cmykResult.severity}`}
                      </span>
                    </div>
                    {/* CMYK readout */}
                    {cmykResult.cmyk && (
                      <span className="font-mono text-[9px] text-slate-400">
                        {formatCmyk(cmykResult.cmyk)} · TIC {cmykResult.tic}%
                      </span>
                    )}
                  </div>

                  {/* Warnings */}
                  {cmykResult.warnings.length > 0 && (
                    <ul className="space-y-1">
                      {cmykResult.warnings.map((w, i) => (
                        <li key={i} className="text-slate-300 leading-snug">{w}</li>
                      ))}
                    </ul>
                  )}

                  {/* Suggested fix */}
                  {cmykResult.severity !== SEVERITY.SAFE && (() => {
                    const fix = suggestPrintSafe(pageColor);
                    return fix.corrected && fix.corrected !== pageColor ? (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                        <span className="text-slate-400">💡 Suggested fix:</span>
                        <button
                          onClick={() => setPageColor(fix.corrected)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold hover:opacity-80 transition"
                          style={{ backgroundColor: fix.corrected, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                          title={`Apply print-safe color: ${fix.corrected}`}
                        >
                          <span>{fix.corrected.toUpperCase()}</span>
                          <span style={{ opacity: 0.8 }}>· TIC {fix.tic}%</span>
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Curated Pastels</span>
                <span className="text-[10px] font-mono text-slate-500">8 TONES</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PASTEL_PAGE_COLORS.map((item) => {
                  const isSelected =
                    pageColor?.toLowerCase() === item.hex.toLowerCase();
                  return (
                    <button
                      key={item.hex}
                      onClick={() => setPageColor(item.hex)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition relative group ${
                        isSelected
                          ? 'border-rose-500 bg-slate-800 text-white shadow-sm ring-1 ring-rose-500/50'
                          : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-lg border border-black/10 shadow-sm shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: item.hex }}
                      >
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 text-slate-800 drop-shadow-sm"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-medium truncate capitalize">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.hex}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBMENU 2: PAGE SETTING                                   */}
        {/* ========================================================= */}
        {activeSubmenu === 'setting' && (
          <div className="space-y-4 pt-1">
            {/* Safe Guides Switch */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    A4 Print Safe Margins
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Visual bounds for editorial bleed & trim
                  </div>
                </div>
                <button
                  onClick={() => setShowSafeGuides(!showSafeGuides)}
                  className={`w-11 h-6 rounded-full transition relative ${
                    showSafeGuides ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      showSafeGuides ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Pattern & Border Customization in Settings */}
            {currentActiveStyle !== 'none' ? (
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Pattern Customization
                  </span>
                  <span className="text-[9px] font-mono uppercase text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    {currentActiveStyle}
                  </span>
                </div>

                {/* Border Placement Option (for Sleek Trim Border) */}
                {currentActiveStyle === 'scallop-border' && (
                  <div className="space-y-1.5 pb-2 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400">Border Placement</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'top-bottom', label: 'Top & Bottom' },
                        { id: 'all', label: 'All 4 Sides' },
                        { id: 'left-right', label: 'Left & Right' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handlePlacementChange(item.id)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition ${
                            borderPlacement === item.id
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Accent Color */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Pattern Color</span>
                    <span className="font-mono text-slate-300 uppercase">{styleAccentColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-600 shadow-inner shrink-0 cursor-pointer">
                      <input
                        type="color"
                        value={styleAccentColor}
                        onChange={(e) => handleAccentColorChange(e.target.value)}
                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: styleAccentColor }} />
                    </div>
                    <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
                      {GENZ_ACCENT_PALETTE.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => handleAccentColorChange(c.hex)}
                          title={c.name}
                          className={`w-6 h-6 rounded-md border shrink-0 transition-transform hover:scale-110 ${
                            styleAccentColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'border-white ring-1 ring-white/50'
                              : 'border-black/20'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Opacity / Intensity Slider */}
                <div className="space-y-1 pt-2 border-t border-slate-700/50">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Pattern Opacity</span>
                    <span className="font-mono text-slate-300">{Math.round(styleOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="1.0"
                    step="0.05"
                    value={styleOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-center text-[10px] text-slate-500">
                Select a Paper Style in the Style tab to customize pattern colors.
              </div>
            )}

            {/* A4 Specifications Card */}
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">A4 Document Specs</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                  PORTRAIT SPREAD
                </span>
              </div>
              <div className="space-y-1.5 pt-1 text-slate-400 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span>Aspect Ratio:</span>
                  <span className="font-mono text-slate-300">1 : 1.4142 (210 × 297 mm)</span>
                </div>
                <div className="flex justify-between">
                  <span>Canvas Viewport:</span>
                  <span className="font-mono text-slate-300">595 × 842 pt</span>
                </div>
                <div className="flex justify-between">
                  <span>Export Resolution:</span>
                  <span className="font-mono text-slate-300">2480 × 3508 px (300 DPI)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBMENU 3: PAGE STYLE (Icon/Logo Cards Grid + Color Edit) */}
        {/* ========================================================= */}
        {activeSubmenu === 'style' && (
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Paper Patterns
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {PAGE_STYLES.length} STYLES
              </span>
            </div>

            {/* Sleek Grid of Visual Style Swatches */}
            <div className="grid grid-cols-3 gap-2.5">
              {PAGE_STYLES.map((style) => {
                const isSelected = currentActiveStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleSelectStyle(style.id)}
                    title={style.name}
                    className={`aspect-[1/1.3] w-full rounded-xl border p-1 transition relative flex flex-col items-center justify-center group overflow-hidden ${
                      isSelected
                        ? 'border-rose-500 bg-slate-800 ring-2 ring-rose-500/50 shadow-md'
                        : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {/* Miniature Page Canvas Preview */}
                    <div
                      className="w-full h-full rounded-lg border border-black/15 shadow-inner overflow-hidden relative flex flex-col justify-between transition-transform group-hover:scale-[1.02]"
                      style={{ backgroundColor: pageColor || '#FDE9C9' }}
                    >
                      {/* Swatch: Plain */}
                      {style.previewType === 'solid' && (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
                          </svg>
                        </div>
                      )}

                      {/* Swatch: Grid / Squares */}
                      {style.previewType === 'grid' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `
                              linear-gradient(to right, rgba(0,0,0,0.18) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0,0,0,0.18) 1px, transparent 1px)
                            `,
                            backgroundSize: '8px 8px',
                          }}
                        />
                      )}

                      {/* Swatch: Lined Notebook */}
                      {style.previewType === 'lined' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `linear-gradient(rgba(59,90,150,0.28) 1px, transparent 1px)`,
                            backgroundSize: '100% 7px',
                          }}
                        />
                      )}

                      {/* Swatch: Y2K Star Spread */}
                      {style.previewType === 'star-banner' && (
                        <div className="w-full h-full flex flex-col justify-between">
                          <div className="h-3 bg-rose-600 flex items-center justify-center gap-0.5 text-[7px] text-white overflow-hidden select-none">
                            ★ ★ ★
                          </div>
                          <div
                            className="flex-1"
                            style={{
                              backgroundImage: `
                                linear-gradient(to right, rgba(0,0,0,0.14) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(0,0,0,0.14) 1px, transparent 1px)
                              `,
                              backgroundSize: '6px 6px',
                            }}
                          />
                          <div className="h-3 bg-rose-600 flex items-center justify-center gap-0.5 text-[7px] text-white overflow-hidden select-none">
                            ★ ★ ★
                          </div>
                        </div>
                      )}

                      {/* Swatch: Dot Matrix */}
                      {style.previewType === 'dots' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.30) 1px, transparent 1px)`,
                            backgroundSize: '6px 6px',
                          }}
                        />
                      )}

                      {/* Swatch: Luminous Pinstripes */}
                      {style.previewType === 'stripes' && (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `
                              radial-gradient(circle at 50% 50%, rgba(255,255,235,0.92) 0%, rgba(244,114,182,0.6) 65%),
                              repeating-linear-gradient(90deg, ${styleAccentColor} 0px, ${styleAccentColor} 2px, transparent 2px, transparent 6px)
                            `,
                          }}
                        />
                      )}

                      {/* Swatch: Pastel Star Confetti */}
                      {style.previewType === 'stars' && (
                        <div className="w-full h-full relative overflow-hidden bg-amber-50/50">
                          <span className="absolute top-1 left-1.5 text-[8px] text-pink-400">★</span>
                          <span className="absolute top-2.5 right-2 text-[7px] text-blue-400">★</span>
                          <span className="absolute bottom-2 left-2 text-[9px] text-yellow-400">★</span>
                          <span className="absolute bottom-3 right-1.5 text-[8px] text-purple-400">★</span>
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-green-400">★</span>
                        </div>
                      )}

                      {/* Swatch: Heart Checkerboard */}
                      {style.previewType === 'checker-heart' && (
                        <div
                          className="w-full h-full grid grid-cols-3 grid-rows-4 p-0.5 gap-0.5"
                          style={{ backgroundColor: 'rgba(253, 230, 138, 0.4)' }}
                        >
                          <div className="rounded-sm bg-pink-300 flex items-center justify-center text-[7px] text-white">♥</div>
                          <div className="rounded-sm bg-white/70" />
                          <div className="rounded-sm bg-blue-200 flex items-center justify-center text-[7px] text-white">♥</div>
                          <div className="rounded-sm bg-white/70" />
                          <div className="rounded-sm bg-pink-300 flex items-center justify-center text-[7px] text-white">♥</div>
                          <div className="rounded-sm bg-white/70" />
                          <div className="rounded-sm bg-blue-200" />
                          <div className="rounded-sm bg-white/70" />
                          <div className="rounded-sm bg-pink-300 flex items-center justify-center text-[7px] text-white">♥</div>
                          <div className="rounded-sm bg-white/70" />
                          <div className="rounded-sm bg-pink-300" />
                          <div className="rounded-sm bg-white/70" />
                        </div>
                      )}

                      {/* Swatch: Sidebar Strip */}
                      {style.previewType === 'sidebar' && (
                        <div className="w-full h-full flex">
                          <div
                            className="w-1/3 h-full flex flex-col items-center justify-around text-[6px] text-white py-0.5"
                            style={{ backgroundColor: styleAccentColor }}
                          >
                            <span>★</span>
                            <span>★</span>
                            <span>★</span>
                          </div>
                          <div
                            className="w-2/3 h-full"
                            style={{
                              backgroundImage: `linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)`,
                              backgroundSize: '100% 6px',
                            }}
                          />
                        </div>
                      )}

                      {/* Swatch: Arcade Dotted Periphery */}
                      {style.previewType === 'arcade-dotted' && (
                        <div className="w-full h-full p-1.5 flex items-center justify-center">
                          <div
                            className="w-full h-full border-2 border-dotted rounded-sm"
                            style={{ borderColor: styleAccentColor }}
                          />
                        </div>
                      )}

                      {/* Swatch: Sleek Scallop Trim Border */}
                      {style.previewType === 'scallop' && (
                        <div className="w-full h-full flex flex-col justify-between">
                          <div
                            className="h-2 w-full flex items-center justify-around px-0.5"
                            style={{ backgroundColor: styleAccentColor }}
                          >
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                          </div>
                          <div
                            className="h-2 w-full flex items-center justify-around px-0.5"
                            style={{ backgroundColor: styleAccentColor }}
                          >
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                            <span className="w-1 h-1 rounded-full bg-white opacity-80" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Active Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shadow">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Customization Bar directly below Style Swatches */}
            {currentActiveStyle !== 'none' && (
              <div className="mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200">
                    Pattern Customization
                  </span>
                  <button
                    onClick={() => handleSelectStyle('none')}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-mono underline"
                  >
                    Reset Plain
                  </button>
                </div>

                {/* Border Placement Selection for Sleek Trim Border */}
                {currentActiveStyle === 'scallop-border' && (
                  <div className="space-y-1.5 pb-1 border-b border-slate-700/50">
                    <span className="text-[10px] text-slate-400">Border Placement</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'top-bottom', label: 'Top & Bottom' },
                        { id: 'all', label: 'All 4 Sides' },
                        { id: 'left-right', label: 'Left & Right' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handlePlacementChange(item.id)}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition ${
                            borderPlacement === item.id
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Accent Picker */}
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-600 shadow-inner shrink-0 cursor-pointer">
                    <input
                      type="color"
                      value={styleAccentColor}
                      onChange={(e) => handleAccentColorChange(e.target.value)}
                      className="absolute -top-2 -left-2 w-11 h-11 cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full" style={{ backgroundColor: styleAccentColor }} />
                  </div>

                  <div className="flex-1 flex gap-1 overflow-x-auto py-0.5">
                    {GENZ_ACCENT_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => handleAccentColorChange(c.hex)}
                        title={c.name}
                        className={`w-5 h-5 rounded border shrink-0 transition-transform hover:scale-110 ${
                          styleAccentColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'border-white ring-1 ring-white/50'
                            : 'border-black/20'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageContext;
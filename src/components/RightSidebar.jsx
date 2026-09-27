import { useState, useEffect } from 'react';
import * as fabric from 'fabric';
import PrintSafetyWarning from './PrintSafetyWarning';
import { AVAILABLE_FONTS, ensureFontLoaded } from '../utils/fonts';
import {
  HEADING_STYLES,
  applyStyleToHeading,
  attachCustomBoxRenderer,
  createStyledHeading,
} from '../utils/headingStyles';
import {
  StickerEffectsPanel,
  BoxPropertiesPanel,
  WordGuessPropertiesPanel,
} from './assets/index';
import { ImportedAssetPropertiesPanel } from './assets/ImportedAssets';
import { BodyTextPropertiesPanel } from './BodyText';
import LayersPanel from './LayersPanel';
import UndoRedoControls from './UndoRedoControls';

const VINTAGE_COLOR_PALETTE = [
  { name: 'Tomato Red', hex: '#D83A3A' },
  { name: 'Retro Orange', hex: '#F77F00' },
  { name: 'Retro Yellow', hex: '#FCE762' },
  { name: 'Vintage Mustard', hex: '#E9C46A' },
  { name: 'Olive Green', hex: '#2A9D8F' },
  { name: 'Pop Cyan', hex: '#2B8EE4' },
  { name: 'Deep Navy', hex: '#1D3557' },
  { name: 'Bubblegum', hex: '#E85D75' },
  { name: 'Zine Black', hex: '#111827' },
  { name: 'Paper White', hex: '#FFFFFF' },
];

const RightSidebar = ({
  fabricCanvas,
  activeObject,
  setActiveObject,
  historyState,
  onUndo,
  onRedo,
}) => {
  const [, setUpdateTick] = useState(0);
  const triggerUpdate = () => setUpdateTick((t) => t + 1);

  const [sidebarTab, setSidebarTab] = useState('properties');

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleCanvasChange = () => {
      triggerUpdate();
    };

    fabricCanvas.on('object:modified', handleCanvasChange);
    fabricCanvas.on('object:scaling', handleCanvasChange);
    fabricCanvas.on('object:moving', handleCanvasChange);
    fabricCanvas.on('text:changed', handleCanvasChange);
    fabricCanvas.on('selection:updated', handleCanvasChange);
    fabricCanvas.on('selection:created', handleCanvasChange);

    return () => {
      fabricCanvas.off('object:modified', handleCanvasChange);
      fabricCanvas.off('object:scaling', handleCanvasChange);
      fabricCanvas.off('object:moving', handleCanvasChange);
      fabricCanvas.off('text:changed', handleCanvasChange);
      fabricCanvas.off('selection:updated', handleCanvasChange);
      fabricCanvas.off('selection:created', handleCanvasChange);
    };
  }, [fabricCanvas]);

  const isLayerSelected = Boolean(
    activeObject &&
      (activeObject instanceof fabric.Textbox ||
        activeObject.type === 'textbox' ||
        typeof activeObject.set === 'function')
  );

  // Tab Header Helper
  const TabHeader = ({ children }) => (
    <div className="shrink-0">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        {children}
        <UndoRedoControls canUndo={historyState?.canUndo} canRedo={historyState?.canRedo} onUndo={onUndo} onRedo={onRedo} />
      </div>
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setSidebarTab('properties')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
            sidebarTab === 'properties'
              ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5'
              : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setSidebarTab('layers')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
            sidebarTab === 'layers'
              ? 'text-rose-400 border-b-2 border-rose-500 bg-rose-500/5'
              : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'
          }`}
        >
          Layers
        </button>
      </div>
    </div>
  );

  // General Action Helpers
  const duplicateTitle = () => {
    if (!fabricCanvas || !activeObject) return;
    activeObject.clone().then((cloned) => {
      cloned.set({
        left: (activeObject.left || 50) + 20,
        top: (activeObject.top || 50) + 20,
      });
      attachCustomBoxRenderer(cloned);
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      if (setActiveObject) setActiveObject(cloned);
      fabricCanvas.requestRenderAll();
      triggerUpdate();
    });
  };

  const deleteTitle = () => {
    if (!fabricCanvas || !activeObject) return;
    fabricCanvas.remove(activeObject);
    fabricCanvas.discardActiveObject();
    if (setActiveObject) setActiveObject(null);
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  const centerHorizontally = () => {
    if (!fabricCanvas || !activeObject) return;
    const objWidth = (activeObject.width || 400) * (activeObject.scaleX || 1);
    activeObject.set('left', Math.max(20, Math.round((595 - objWidth) / 2)));
    activeObject.setCoords();
    fabricCanvas.fire('object:modified', { target: activeObject });
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  const bringToFront = () => {
    if (!fabricCanvas || !activeObject) return;
    fabricCanvas.bringObjectToFront(activeObject);
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  const sendToBack = () => {
    if (!fabricCanvas || !activeObject) return;
    fabricCanvas.sendObjectToBack(activeObject);
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  // INACTIVE STATE: NO LAYER SELECTED
  if (!isLayerSelected) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Layer Properties</h3>
          </div>
        </TabHeader>

        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center text-slate-500 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div className="space-y-1.5 max-w-[240px]">
              <h4 className="text-sm font-bold text-slate-200">No Layer Selected</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select an image, graphic cutout, or heading on the canvas to customize properties.
              </p>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: WORD GUESS
  if (activeObject?.isGuessAsset) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Word Clue Properties</h3>
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={centerHorizontally} title="Center on page" className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16M4 12h16" /></svg>
            </button>
            <button onClick={bringToFront} title="Bring to front" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
            </button>
            <button onClick={sendToBack} title="Send to back" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7M19 5l-7 7-7-7" /></svg>
            </button>
            <button onClick={deleteTitle} title="Delete clue" className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </TabHeader>
        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <WordGuessPropertiesPanel fabricCanvas={fabricCanvas} activeObject={activeObject} />
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: COMIC BOX
  if (activeObject?.isComicBox) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Box Properties</h3>
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Comic
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={centerHorizontally} title="Center on page" className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16M4 12h16" /></svg>
            </button>
            <button onClick={bringToFront} title="Bring to front" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
            </button>
            <button onClick={sendToBack} title="Send to back" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7M19 5l-7 7-7-7" /></svg>
            </button>
            <button onClick={deleteTitle} title="Delete box" className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </TabHeader>
        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <BoxPropertiesPanel fabricCanvas={fabricCanvas} activeObject={activeObject} />
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: STICKER ASSET
  if (activeObject?.isStickerAsset) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Sticker Properties</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={centerHorizontally} title="Center on page" className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16M4 12h16" /></svg>
            </button>
            <button onClick={bringToFront} title="Bring to front" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
            </button>
            <button onClick={sendToBack} title="Send to back" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7M19 5l-7 7-7-7" /></svg>
            </button>
            <button onClick={deleteTitle} title="Delete sticker" className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </TabHeader>
        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <StickerEffectsPanel fabricCanvas={fabricCanvas} activeObject={activeObject} />
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: IMPORTED IMAGE ASSET (Photo / Graphic Customization)
  if (
    activeObject?.isImportedAsset ||
    ((activeObject?.type === 'image' || (fabric.FabricImage && activeObject instanceof fabric.FabricImage)) &&
      !activeObject.isStickerAsset &&
      !activeObject.isComicBox &&
      !activeObject.isGuessAsset)
  ) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Graphic Asset</h3>
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Photo
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={centerHorizontally} title="Center on page" className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16M4 12h16" /></svg>
            </button>
            <button onClick={duplicateTitle} title="Duplicate layer" className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            <button onClick={bringToFront} title="Bring to front" className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" /></svg>
            </button>
            <button onClick={sendToBack} title="Send to back" className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7M19 5l-7 7-7-7" /></svg>
            </button>
            <button onClick={deleteTitle} title="Delete image" className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </TabHeader>
        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <ImportedAssetPropertiesPanel fabricCanvas={fabricCanvas} activeObject={activeObject} />
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: BODY TEXT
  if (activeObject?.isBodyText) {
    return (
      <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
        <TabHeader>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Body Text Properties</h3>
            <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Body
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={duplicateTitle} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition" title="Duplicate Layer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            <button onClick={deleteTitle} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition" title="Delete Layer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </TabHeader>

        {sidebarTab === 'layers' ? (
          <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <BodyTextPropertiesPanel
              fabricCanvas={fabricCanvas}
              activeObject={activeObject}
              centerHorizontally={centerHorizontally}
              bringToFront={bringToFront}
              sendToBack={sendToBack}
            />
          </div>
        )}
      </aside>
    );
  }

  // ACTIVE STATE: TEXT / HEADING INSPECTOR
  const fontFamily = activeObject.fontFamily || 'Rogient Block';
  const fontSize = Math.round(activeObject.fontSize || 50);
  const fill = activeObject.fill || '#111111';
  const textAlign = activeObject.textAlign || 'center';
  const isBold = activeObject.fontWeight === 'bold' || activeObject.fontWeight === 700;
  const isItalic = activeObject.fontStyle === 'italic';
  const isUnderline = activeObject.underline === true;
  const stroke = activeObject.stroke || '';
  const strokeWidth = Number(activeObject.strokeWidth) || 0;
  const hasOutline = strokeWidth > 0 && !!stroke && stroke !== 'transparent';
  const charSpacing = activeObject.charSpacing || 0;
  const textVal = activeObject.text || '';

  const backgroundColor = activeObject.backgroundColor || '';
  const boxBorderStyle = activeObject.boxBorderStyle || 'none';
  const boxBorderColor = activeObject.boxBorderColor || '#111111';
  const boxBorderWidth = Number(activeObject.boxBorderWidth) || 2;
  const boxCornerRadius = Number(activeObject.boxCornerRadius) || 10;
  const boxPadding = Number(activeObject.padding || activeObject.boxPadding || 8);

  const shadow = activeObject.shadow;
  const hasShadow = Boolean(shadow);
  const shadowColor = shadow ? (typeof shadow.color === 'string' ? shadow.color : '#000000') : '#000000';
  const shadowBlur = shadow ? Number(shadow.blur) || 0 : 0;
  const shadowOffsetX = shadow ? Number(shadow.offsetX) || 0 : 5;
  const shadowOffsetY = shadow ? Number(shadow.offsetY) || 0 : 5;

  const enable3D = Boolean(activeObject.enable3D);
  const depth3D = Number(activeObject.depth3D) || 7;
  const shadowColor3D = activeObject.shadowColor3D || '#000000';

  const enableStitchedPatch = Boolean(activeObject.enableStitchedPatch);
  const patchColor = activeObject.patchColor || '#E6EA58';
  const patchSize = Number(activeObject.patchSize) || 28;
  const stitchColor = activeObject.stitchColor || '#111111';
  const stitchWidth = Number(activeObject.stitchWidth) || 2.5;

  const updateProp = (prop, val) => {
    if (!fabricCanvas || !activeObject) return;
    const isTextProp = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'underline', 'fill'].includes(prop);
    const hasSelection = Boolean(
      activeObject.isEditing &&
      typeof activeObject.selectionStart === 'number' &&
      typeof activeObject.selectionEnd === 'number' &&
      activeObject.selectionStart !== activeObject.selectionEnd
    );

    if (isTextProp && hasSelection) {
      activeObject.setSelectionStyles({ [prop]: val });
      activeObject.dirty = true;
      if (typeof activeObject.initDimensions === 'function') {
        activeObject.isEditing = false;
        activeObject.initDimensions();
        activeObject.isEditing = true;
      }
      if (activeObject.cursorOffsetCache) activeObject.cursorOffsetCache = {};
    } else {
      activeObject.set(prop, val);
    }

    attachCustomBoxRenderer(activeObject);
    if (activeObject.enableStitchedPatch && activeObject.updateStitchedPatch) {
      activeObject.updateStitchedPatch(fabricCanvas);
    }
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  const handleApplyStyle = async (styleId) => {
    await applyStyleToHeading(fabricCanvas, activeObject, styleId);
    triggerUpdate();
  };

  const handleFontChange = async (font) => {
    await ensureFontLoaded(font);
    if (!fabricCanvas || !activeObject) return;
    activeObject.set('fontFamily', font);
    if (activeObject.initDimensions) activeObject.initDimensions();
    attachCustomBoxRenderer(activeObject);
    fabricCanvas.requestRenderAll();
    triggerUpdate();
  };

  return (
    <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
      <TabHeader>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Layer Properties</h3>
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={duplicateTitle} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition" title="Duplicate Layer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button onClick={deleteTitle} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition" title="Delete Layer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </TabHeader>

      {sidebarTab === 'layers' ? (
        <LayersPanel fabricCanvas={fabricCanvas} activeObject={activeObject} setActiveObject={setActiveObject} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Style Presets */}
          <div className="space-y-2 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Style Presets</label>
              <span className="text-[10px] text-rose-400 font-mono">1-Click Apply</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {HEADING_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleApplyStyle(style.id)}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-rose-500/60 text-left transition group shadow-sm"
                  title={style.description}
                >
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-rose-400 truncate">{style.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono truncate">{style.badgeText}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Heading Text Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Heading Text</label>
            <textarea
              rows={2}
              value={textVal}
              onChange={(e) => updateProp('text', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 transition resize-none font-medium"
              placeholder="Enter heading..."
            />
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Font Family</label>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {AVAILABLE_FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => handleFontChange(font.family)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg border transition flex items-center justify-between ${
                    fontFamily.toLowerCase() === font.family.toLowerCase()
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{font.name}</div>
                    <div className="text-[9px] text-slate-400 font-sans">{font.category}</div>
                  </div>
                  <div className="text-sm px-2 py-0.5 rounded bg-slate-900/60 text-slate-200 font-bold" style={{ fontFamily: font.family }}>
                    Aa
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Font Size</label>
              <span className="text-xs font-mono font-bold text-slate-200">{fontSize}pt</span>
            </div>
            <input
              type="range"
              min="12"
              max="140"
              value={fontSize}
              onChange={(e) => updateProp('fontSize', Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Font Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Font Color</label>
            <div className="flex items-center gap-3 bg-slate-800/60 p-2 rounded-xl border border-slate-700/70">
              <input
                type="color"
                value={typeof fill === 'string' && fill.startsWith('#') ? fill : '#111111'}
                onChange={(e) => updateProp('fill', e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <div className="flex-1">
                <div className="text-xs font-mono font-bold text-slate-200 uppercase">{typeof fill === 'string' ? fill : 'Custom'}</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {VINTAGE_COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateProp('fill', c.hex)}
                  className="h-6 rounded-md border border-slate-600 shadow-sm transition hover:scale-105"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default RightSidebar;

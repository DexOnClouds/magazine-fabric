import { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

/**
 * Identify if an object belongs to the 'text' (headings) or 'asset' (stickers/images) category
 */
function getLayerCategory(obj) {
  if (!obj) return 'asset';
  if (
    obj instanceof fabric.Textbox ||
    obj.type === 'textbox' ||
    obj instanceof fabric.IText ||
    obj.type === 'i-text' ||
    obj.type === 'text' ||
    Boolean(obj.text !== undefined)
  ) {
    return 'text';
  }
  return 'asset';
}

function getLayerLabel(obj) {
  if (obj.isStickerAsset) {
    const shape = obj.assetShape || 'sticker';
    return shape.charAt(0).toUpperCase() + shape.slice(1) + ' Sticker';
  }
  if (obj.isBodyText) {
    const t = String(obj.text || '').trim();
    return t.length > 0 ? t.slice(0, 24) + (t.length > 24 ? '...' : '') : 'Body Text';
  }
  if (obj.text !== undefined) {
    const t = String(obj.text || '').trim();
    return t.length > 0 ? t.slice(0, 24) + (t.length > 24 ? '...' : '') : 'Heading';
  }
  if (obj instanceof fabric.FabricImage || obj.type === 'image') {
    return 'Image Asset';
  }
  return 'Canvas Object';
}

/**
 * Single Layer Item in the unified list
 */
const LayerRow = ({
  obj,
  isActive,
  isLocked,
  category,
  onSelect,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}) => {
  const label = getLayerLabel(obj);

  return (
    <div
      draggable={!isLocked}
      onDragStart={(e) => onDragStart(e, obj)}
      onDragOver={(e) => onDragOver(e, obj)}
      onDrop={(e) => onDrop(e, obj)}
      onClick={() => onSelect(obj)}
      className={`
        group relative flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition select-none cursor-pointer border
        ${
          isDragOver
            ? 'border-rose-500 bg-rose-500/10 scale-[1.01]'
            : isActive
            ? 'bg-rose-500/15 border-rose-500/60 shadow-sm'
            : isLocked
            ? 'bg-slate-900/40 border-slate-800/40 opacity-70 cursor-not-allowed'
            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
        }
      `}
    >
      {/* Drag handle */}
      <div
        className={`shrink-0 text-slate-500 ${
          isLocked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing hover:text-slate-300'
        }`}
        title={isLocked ? 'Locked' : 'Drag to reorder layer stack'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Category Icon Badge (Visual identifier only) */}
      <div
        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold ${
          category === 'text'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}
        title={category === 'text' ? 'Text Heading' : 'Asset / Sticker'}
      >
        {category === 'text' ? (
          <span>T</span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </div>

      {/* Label & Details */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-medium truncate block ${
              isActive ? 'text-rose-300 font-semibold' : isLocked ? 'text-slate-500' : 'text-slate-200'
            }`}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
          <span>{obj.isBodyText ? 'Body Text' : category === 'text' ? 'Heading' : 'Asset'}</span>
          {isLocked && (
            <span className="text-amber-400 font-sans font-semibold bg-amber-500/10 px-1 rounded">
              Locked
            </span>
          )}
        </div>
      </div>

      {/* Reorder Buttons (Up = Bring Forward, Down = Send Backward) */}
      <div className="flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 transition">
        <button
          disabled={!canMoveUp || isLocked}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(obj);
          }}
          title="Bring Forward (Move Up in Stack)"
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded disabled:opacity-20 disabled:hover:bg-transparent"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          disabled={!canMoveDown || isLocked}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(obj);
          }}
          title="Send Backward (Move Down in Stack)"
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded disabled:opacity-20 disabled:hover:bg-transparent"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Lock / Unlock Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(obj);
        }}
        title={isLocked ? 'Unlock layer' : 'Lock layer (prevents moving/editing)'}
        className={`p-1.5 rounded-lg transition shrink-0 ${
          isLocked
            ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30'
            : 'text-slate-400 hover:text-rose-400 hover:bg-slate-700/60'
        }`}
      >
        {isLocked ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
};

/**
 * Main LayersPanel Component
 */
const LayersPanel = ({ fabricCanvas, activeObject, setActiveObject }) => {
  const [layers, setLayers] = useState([]);
  const [, setTick] = useState(0);
  const draggedObjRef = useRef(null);
  const [dragOverObj, setDragOverObj] = useState(null);

  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Sync layers from canvas in visual display order (topmost on canvas = first in UI list)
  const syncLayers = useCallback(() => {
    if (!fabricCanvas) {
      setLayers([]);
      return;
    }
    const objs = fabricCanvas.getObjects() || [];
    // Canvas index 0 is the background (bottom), so reverse it so top is on top of the list
    setLayers([...objs].reverse());
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;
    syncLayers();

    const handleCanvasChange = () => {
      syncLayers();
      forceUpdate();
    };

    fabricCanvas.on('object:added', handleCanvasChange);
    fabricCanvas.on('object:removed', handleCanvasChange);
    fabricCanvas.on('object:modified', handleCanvasChange);
    fabricCanvas.on('selection:created', handleCanvasChange);
    fabricCanvas.on('selection:updated', handleCanvasChange);
    fabricCanvas.on('selection:cleared', handleCanvasChange);

    return () => {
      fabricCanvas.off('object:added', handleCanvasChange);
      fabricCanvas.off('object:removed', handleCanvasChange);
      fabricCanvas.off('object:modified', handleCanvasChange);
      fabricCanvas.off('selection:created', handleCanvasChange);
      fabricCanvas.off('selection:updated', handleCanvasChange);
      fabricCanvas.off('selection:cleared', handleCanvasChange);
    };
  }, [fabricCanvas, syncLayers, forceUpdate]);

  // Select layer on canvas
  const handleSelect = (obj) => {
    if (!fabricCanvas || obj._locked) return;
    fabricCanvas.setActiveObject(obj);
    if (setActiveObject) setActiveObject(obj);
    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  // Lock / Unlock layer
  const handleToggleLock = (obj) => {
    if (!fabricCanvas) return;
    const isNowLocked = !obj._locked;
    obj._locked = isNowLocked;

    // Prevent selection and canvas clicks when locked
    obj.selectable = !isNowLocked;
    obj.evented = !isNowLocked;
    obj.lockMovementX = isNowLocked;
    obj.lockMovementY = isNowLocked;
    obj.lockRotation = isNowLocked;
    obj.lockScalingX = isNowLocked;
    obj.lockScalingY = isNowLocked;
    obj.hasControls = !isNowLocked;

    // If currently selected, unselect it immediately
    if (isNowLocked && fabricCanvas.getActiveObject() === obj) {
      fabricCanvas.discardActiveObject();
      if (setActiveObject) setActiveObject(null);
    }

    fabricCanvas.requestRenderAll();
    forceUpdate();
  };

  // Move layer visually UP (bring forward on canvas)
  const handleMoveUp = (obj) => {
    if (!fabricCanvas || obj._locked) return;
    fabricCanvas.bringObjectForward(obj);
    fabricCanvas.requestRenderAll();
    syncLayers();
    forceUpdate();
  };

  // Move layer visually DOWN (send backward on canvas)
  const handleMoveDown = (obj) => {
    if (!fabricCanvas || obj._locked) return;
    fabricCanvas.sendObjectBackwards(obj);
    fabricCanvas.requestRenderAll();
    syncLayers();
    forceUpdate();
  };

  // Drag and drop reordering
  const handleDragStart = (e, obj) => {
    draggedObjRef.current = obj;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, obj) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverObj !== obj) {
      setDragOverObj(obj);
    }
  };

  const handleDrop = (e, targetObj) => {
    e.preventDefault();
    const sourceObj = draggedObjRef.current;
    draggedObjRef.current = null;
    setDragOverObj(null);

    if (!sourceObj || !targetObj || sourceObj === targetObj || !fabricCanvas) return;

    const allCanvasObjs = fabricCanvas.getObjects();
    const targetIdx = allCanvasObjs.indexOf(targetObj);
    if (targetIdx === -1) return;

    // Move to target z-index on canvas
    fabricCanvas.moveObjectTo(sourceObj, targetIdx);
    fabricCanvas.requestRenderAll();
    syncLayers();
    forceUpdate();
  };

  if (!fabricCanvas) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-xs text-slate-500">Canvas not ready</p>
      </div>
    );
  }

  const textCount = layers.filter((obj) => getLayerCategory(obj) === 'text').length;
  const assetCount = layers.length - textCount;

  return (
    <div
      className="flex-1 overflow-y-auto p-4 space-y-4"
      onDragLeave={() => setDragOverObj(null)}
    >
      {/* Overview stats bar */}
      <div className="flex items-center justify-between bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/50 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="font-semibold text-slate-200">{textCount}</span> Text
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-slate-200">{assetCount}</span> Assets
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
        </span>
      </div>

      {layers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-center text-slate-500 shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-300">No Layers on Canvas</h4>
            <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
              Add headings or sticker assets to the canvas to view and reorder them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <span className="uppercase tracking-wider font-bold text-[10px] text-slate-400">Stack (Top to Bottom)</span>
            <span className="text-[10px] font-mono text-slate-500">Drag to reorder</span>
          </div>

          {/* Unified single list of layers */}
          <div className="space-y-1.5">
            {layers.map((obj, i) => (
              <LayerRow
                key={obj.id || `layer-${i}`}
                obj={obj}
                category={getLayerCategory(obj)}
                isActive={activeObject === obj}
                isLocked={Boolean(obj._locked)}
                onSelect={handleSelect}
                onToggleLock={handleToggleLock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                canMoveUp={i > 0}
                canMoveDown={i < layers.length - 1}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragOver={dragOverObj === obj}
              />
            ))}
          </div>

          {/* Helpful Tips footer */}
          <div className="pt-3 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Items at the top of the list appear in front on the canvas.</span>
            </div>
            <p className="pl-5 text-slate-400 leading-snug">
              Drag items or use the ▲/▼ buttons to move any text behind or above any asset freely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayersPanel;
import React, { useState } from 'react';
import Stickers, {
  StickerEffectsPanel,
  createStickerAsset,
  createImageStickerAsset,
  attachStickerRenderer,
  STICKER_ASSETS,
  STICKER_PALETTE,
} from './Stickers';
import ComicBoxes, { BoxPropertiesPanel, attachComicBoxRenderer } from './ComicBoxes';
import WordGuess, {
  WordGuessPropertiesPanel,
  createGuessAsset,
  updateGuessAsset,
  attachGuessRenderer,
  BOX_PRESETS,
} from './WordGuess';
import ImportedAssets from './ImportedAssets';

// Re-export all panels and engine helpers so other files have a single source
export {
  Stickers,
  StickerEffectsPanel,
  createStickerAsset,
  createImageStickerAsset,
  attachStickerRenderer,
  STICKER_ASSETS,
  STICKER_PALETTE,
  ComicBoxes,
  BoxPropertiesPanel,
  attachComicBoxRenderer,
  WordGuess,
  WordGuessPropertiesPanel,
  createGuessAsset,
  updateGuessAsset,
  attachGuessRenderer,
  BOX_PRESETS,
  ImportedAssets,
};

/**
 * Assets Main Coordinator
 * Tabs: Stickers | Comic Boxes | Word Guess | Imported Assets
 */
const Assets = ({ fabricCanvas, activeObject, setActiveObject }) => {
  const [activeTab, setActiveTab] = useState('stickers'); // 'stickers' | 'boxes' | 'games' | 'imported'

  const tabs = [
    { id: 'stickers', label: 'Stickers' },
    { id: 'boxes', label: 'Boxes' },
    { id: 'games', label: 'Games' },
    { id: 'imported', label: 'Imported' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Tab Navigation */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === 'stickers' && (
          <Stickers
            fabricCanvas={fabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
          />
        )}
        {activeTab === 'boxes' && (
          <ComicBoxes
            fabricCanvas={fabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
          />
        )}
        {activeTab === 'games' && (
          <WordGuess
            fabricCanvas={fabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
          />
        )}
        {activeTab === 'imported' && (
          <ImportedAssets
            fabricCanvas={fabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
          />
        )}
      </div>
    </div>
  );
};

export default Assets;

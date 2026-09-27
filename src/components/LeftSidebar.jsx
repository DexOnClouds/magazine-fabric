import { useState } from 'react';
import Headings from './Headings';
import BodyText from './BodyText';
import PageContext from './PageContext';
import Assets from './assets/index';

const LeftSidebar = ({
  fabricCanvas,
  pageColor,
  setPageColor,
  showSafeGuides,
  setShowSafeGuides,
  pages,
  activePageIndex,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  activeObject,
  setActiveObject,
}) => {
  // Four minimal icon options: 'headings' | 'bodyText' | 'pages' | 'assets'
  const [activeTab, setActiveTab] = useState('headings');

  return (
    <aside className="w-80 min-w-[320px] max-w-[320px] bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none z-20 shadow-xl overflow-hidden">
      {/* ========================================================= */}
      {/* MINIMAL ICON-ONLY TAB NAVIGATION                          */}
      {/* Headings | Body Text | Pages | Assets                     */}
      {/* ========================================================= */}
      <div className="flex items-center justify-around border-b border-slate-800 bg-slate-950/80 p-2 gap-1.5 shrink-0">
        {/* Option 1: Headings */}
        <button
          onClick={() => setActiveTab('headings')}
          title="Headings & Titles"
          aria-label="Headings"
          className={`flex-1 py-2.5 rounded-xl transition flex flex-col items-center justify-center relative group ${
            activeTab === 'headings'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          {/* Bold 'H' icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6v12M20 6v12M4 12h16" />
          </svg>
          {activeTab === 'headings' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400" />
          )}
        </button>

        {/* Option 2: Body Text */}
        <button
          onClick={() => setActiveTab('bodyText')}
          title="Body Text & Articles"
          aria-label="Body Text"
          className={`flex-1 py-2.5 rounded-xl transition flex flex-col items-center justify-center relative group ${
            activeTab === 'bodyText'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          {/* Paragraph lines icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h12M4 18h8" />
          </svg>
          {activeTab === 'bodyText' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400" />
          )}
        </button>

        {/* Option 3: Pages & Page Settings */}
        <button
          onClick={() => setActiveTab('pages')}
          title="Pages & Page Settings"
          aria-label="Pages"
          className={`flex-1 py-2.5 rounded-xl transition flex flex-col items-center justify-center relative group ${
            activeTab === 'pages'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {activeTab === 'pages' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400" />
          )}
        </button>

        {/* Option 4: Assets & Stickers */}
        <button
          onClick={() => setActiveTab('assets')}
          title="Assets & Elements"
          aria-label="Assets"
          className={`flex-1 py-2.5 rounded-xl transition flex flex-col items-center justify-center relative group ${
            activeTab === 'assets'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {activeTab === 'assets' && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-rose-400" />
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB CONTENT SCROLL AREA                                  */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 1. HEADINGS TAB */}
        {activeTab === 'headings' && (
          <Headings fabricCanvas={fabricCanvas} setActiveObject={setActiveObject} />
        )}

        {/* 2. BODY TEXT TAB */}
        {activeTab === 'bodyText' && (
          <BodyText fabricCanvas={fabricCanvas} setActiveObject={setActiveObject} />
        )}

        {/* 3. PAGES TAB (Isolated PageContext) */}
        {activeTab === 'pages' && (
          <PageContext
            fabricCanvas={fabricCanvas}
            pageColor={pageColor}
            setPageColor={setPageColor}
            showSafeGuides={showSafeGuides}
            setShowSafeGuides={setShowSafeGuides}
            pages={pages}
            activePageIndex={activePageIndex}
            onSelectPage={onSelectPage}
            onAddPage={onAddPage}
            onDeletePage={onDeletePage}
            onDuplicatePage={onDuplicatePage}
          />
        )}

        {/* 4. ASSETS TAB (Stickers and Graphics) */}
        {activeTab === 'assets' && (
          <Assets
            fabricCanvas={fabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
          />
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;

import { useState } from 'react';

const Navbar = ({
  zoom,
  setZoom,
  onExport,
  onClearPage,
  activePage,
  pageCount,
  onAddPage,
  onPrevPage,
  onNextPage,
}) => {
  const [exportQuality, setExportQuality] = useState('ultra'); // 'ultra' (300 DPI) | 'hd' (2x) | 'std' (1x)
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async (format) => {
    setIsExporting(true);
    try {
      await onExport(format, exportQuality);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-white shrink-0 select-none z-30 shadow-md">
      {/* Brand & Page Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-black text-white text-lg shadow-sm">
            M
          </div>
          <div>
            <div className="font-bold text-base leading-tight tracking-wide flex items-center gap-2">
              <span>Magazine Studio</span>
              <span className="text-[10px] uppercase font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded">
                A4 Editor
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              210 × 297 mm • 300 DPI Ultra Ready
            </p>
          </div>
        </div>

        {/* Page Switcher */}
        <div className="hidden sm:flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1 ml-4 space-x-2">
          <button
            onClick={onPrevPage}
            disabled={activePage <= 1}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded"
            title="Previous Page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs font-semibold px-1 text-slate-200">
            Page {activePage} / {pageCount}
          </span>
          <button
            onClick={onNextPage}
            disabled={activePage >= pageCount}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded"
            title="Next Page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onAddPage}
            className="text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white px-2 py-0.5 rounded transition flex items-center gap-1 font-medium ml-1"
            title="Add a new magazine page"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Page
          </button>
        </div>
      </div>

      {/* Center: Zoom Controls */}
      <div className="flex items-center bg-slate-800/90 border border-slate-700/70 rounded-lg px-1.5 py-1 space-x-1 shadow-inner">
        <button
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition"
          title="Zoom Out"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
          </svg>
        </button>

        <span className="text-xs font-mono font-medium px-2 text-slate-300 w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded transition"
          title="Zoom In"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={() => setZoom(0.80)}
          className="text-[11px] text-slate-400 hover:text-amber-400 px-2 py-1 rounded hover:bg-slate-700/60 transition"
          title="Fit Page to Screen (80%)"
        >
          Fit
        </button>
        <button
          onClick={() => setZoom(1.0)}
          className="text-[11px] text-slate-400 hover:text-amber-400 px-2 py-1 rounded hover:bg-slate-700/60 transition"
          title="Actual Size (100%)"
        >
          100%
        </button>
      </div>

      {/* Right: Actions & Export */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onClearPage}
          className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-700/80 hover:border-rose-500/40 transition hover:bg-rose-500/10 flex items-center gap-1.5"
          title="Clear all headings and elements on current page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden md:inline">Clear</span>
        </button>

        {/* Quality Selector */}
        <div className="hidden lg:flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setExportQuality('ultra')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              exportQuality === 'ultra'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Export at 300 DPI ultra-high print resolution (2480x3508)"
          >
            300 DPI Ultra
          </button>
          <button
            onClick={() => setExportQuality('hd')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${
              exportQuality === 'hd'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Export at 2x crisp HD resolution"
          >
            2× HD
          </button>
        </div>

        {/* Export Button */}
        <div className="flex items-center rounded-lg shadow-sm">
          <button
            disabled={isExporting}
            onClick={() => handleExportClick('png')}
            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-md hover:shadow-rose-500/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Rendering 300 DPI...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export High-Res</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

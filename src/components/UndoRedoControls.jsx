const UndoRedoControls = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <div className="flex items-center gap-1">
    <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2" /></svg>
    </button>
    <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h2" /></svg>
    </button>
  </div>
);

export default UndoRedoControls;

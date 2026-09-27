import React from 'react';
import { checkColor, suggestPrintSafe, SEVERITY } from '../utils/cmyk';

/**
 * Universal inline print safety warning badge & quick-fix button.
 * Can be added directly under or next to ANY color picker in the app.
 *
 * Props:
 * - color: string (e.g. '#39FF14', '#000000', 'rgb(...)')
 * - onChange: function(newHex: string) - callback when user clicks "Fix"
 * - className: string (optional styling)
 * - compact: boolean (if true, renders a small one-line inline pill)
 */
export const PrintSafetyWarning = ({ color, onChange, className = '', compact = false }) => {
  if (!color || typeof color !== 'string' || color === 'transparent' || color === 'none') {
    return null;
  }

  const result = checkColor(color);
  if (!result || result.isSafe) {
    return null;
  }

  const fix = suggestPrintSafe(color);
  const isDanger = result.severity === SEVERITY.DANGER;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-[10px] ${className}`}>
        <span
          className="px-1.5 py-0.5 rounded font-semibold text-[9px] flex items-center gap-1 shrink-0"
          style={{
            backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: isDanger ? '#f87171' : '#fbbf24',
            border: isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
          }}
          title={result.warnings.join(' • ')}
        >
          <span>{isDanger ? '🔴' : '⚠️'}</span>
          <span>Print {result.severity.toUpperCase()}</span>
        </span>
        {fix?.corrected && fix.corrected.toLowerCase() !== color.toLowerCase() && onChange && (
          <button
            type="button"
            onClick={() => onChange(fix.corrected)}
            className="text-[10px] text-sky-400 hover:text-sky-300 underline font-mono shrink-0"
            title={`Auto-correct to CMYK safe: ${fix.corrected}`}
          >
            Fix ({fix.corrected.toUpperCase()})
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-2 border text-[11px] space-y-1 transition-all ${className}`}
      style={{
        backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        borderColor: isDanger ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="font-semibold flex items-center gap-1"
          style={{ color: isDanger ? '#f87171' : '#fbbf24' }}
        >
          <span>{isDanger ? '🔴' : '⚠️'}</span>
          <span className="uppercase text-[10px] tracking-wide">
            Not Print Safe ({result.severity})
          </span>
        </div>
        {result.tic !== null && (
          <span className="font-mono text-[9px] text-slate-400">
            TIC: {result.tic}%
          </span>
        )}
      </div>

      <div className="text-[10px] text-slate-300 leading-tight">
        {result.warnings[0]}
      </div>

      {fix?.corrected && fix.corrected.toLowerCase() !== color.toLowerCase() && onChange && (
        <div className="pt-1 border-t border-slate-700/40 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Print safe alternative:</span>
          <button
            type="button"
            onClick={() => onChange(fix.corrected)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-[10px] hover:opacity-90 transition shadow-sm"
            style={{
              backgroundColor: fix.corrected,
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
            title={`Apply print safe color ${fix.corrected}`}
          >
            <span>Fix: {fix.corrected.toUpperCase()}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintSafetyWarning;

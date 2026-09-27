/**
 * cmyk.js — Print Color Safety Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Magazine apps live on-screen but die in print if colors aren't CMYK-safe.
 * This utility converts colors between color spaces, checks print safety,
 * warns about out-of-gamut colors (neons, electric hues, etc.), and suggests
 * corrected print-safe alternatives.
 *
 * Key concepts:
 *  • RGB/HEX colors cover a wider gamut than CMYK printing can reproduce.
 *  • Total Ink Coverage (TIC) above 300% causes ink pooling / smearing.
 *  • Highly saturated "neon" colors (neon green, electric blue, hot pink, etc.)
 *    cannot be reproduced by CMYK inks — they will print dull/muddy.
 *  • Some colors like pure RGB red (255,0,0) are borderline — they print but
 *    shifted (darker/oranger).
 */

// ─── Severity levels ──────────────────────────────────────────────────────────
export const SEVERITY = {
  SAFE: 'safe',         // Prints accurately
  CAUTION: 'caution',  // Slight gamut shift, acceptable for most projects
  WARNING: 'warning',  // Noticeable shift — review before printing
  DANGER: 'danger',    // Will print very differently from on-screen appearance
};

// ─── Known out-of-gamut color archetypes ─────────────────────────────────────
// These hue/saturation zones are well outside CMYK printable range.
const OUT_OF_GAMUT_ZONES = [
  {
    name: 'Neon Green',
    description: 'Electric/neon greens cannot be reproduced by CMYK ink.',
    hueMin: 80, hueMax: 145,
    satMin: 0.75, satMax: 1.0,
    lightMin: 0.4, lightMax: 1.0,
    severity: SEVERITY.DANGER,
    suggestion: 'Use a muted, darker green e.g. #2E7D32 or #4CAF50 for print.',
  },
  {
    name: 'Electric Blue / Cyan',
    description: 'Vibrant electric blues and cyans exceed CMYK gamut.',
    hueMin: 175, hueMax: 220,
    satMin: 0.85, satMax: 1.0,
    lightMin: 0.45, lightMax: 1.0,
    severity: SEVERITY.DANGER,
    suggestion: 'Use a deeper blue e.g. #1565C0 or a teal e.g. #00838F.',
  },
  {
    name: 'Hot Pink / Magenta',
    description: 'Neon pinks and magentas shift to flat or overly dark in CMYK.',
    hueMin: 290, hueMax: 340,
    satMin: 0.80, satMax: 1.0,
    lightMin: 0.5, lightMax: 0.9,
    severity: SEVERITY.DANGER,
    suggestion: 'Use a rich, darker pink e.g. #C2185B or deep magenta #AD1457.',
  },
  {
    name: 'Neon Yellow',
    description: 'Fluorescent yellows are outside CMYK gamut.',
    hueMin: 50, hueMax: 80,
    satMin: 0.9, satMax: 1.0,
    lightMin: 0.55, lightMax: 1.0,
    severity: SEVERITY.DANGER,
    suggestion: 'Use a golden yellow e.g. #F9A825 or amber #FF8F00.',
  },
  {
    name: 'Neon Orange',
    description: 'Highly saturated oranges can shift brownish in print.',
    hueMin: 15, hueMax: 45,
    satMin: 0.9, satMax: 1.0,
    lightMin: 0.5, lightMax: 0.85,
    severity: SEVERITY.WARNING,
    suggestion: 'Use a warmer, deeper orange e.g. #E65100 or #BF360C.',
  },
  {
    name: 'Bright Red',
    description: 'Pure RGB red shifts to orange-red in CMYK print.',
    hueMin: 0, hueMax: 15,
    satMin: 0.85, satMax: 1.0,
    lightMin: 0.45, lightMax: 0.75,
    severity: SEVERITY.WARNING,
    suggestion: 'Use a slightly deeper red e.g. #C62828 or #B71C1C for accurate print.',
  },
  {
    name: 'Bright Red (wrap-around hue)',
    description: 'Pure RGB red shifts to orange-red in CMYK print.',
    hueMin: 345, hueMax: 360,
    satMin: 0.85, satMax: 1.0,
    lightMin: 0.45, lightMax: 0.75,
    severity: SEVERITY.WARNING,
    suggestion: 'Use a slightly deeper red e.g. #C62828 or #B71C1C for accurate print.',
  },
  {
    name: 'Very Light / Near-White Pastels',
    description: 'Very light colors may appear as plain white or wash out entirely.',
    hueMin: 0, hueMax: 360,
    satMin: 0.0, satMax: 1.0,
    lightMin: 0.92, lightMax: 1.0,
    severity: SEVERITY.CAUTION,
    suggestion: 'Darken slightly to ensure visibility in print. Lightness < 90% is safer.',
  },
];

// ─── Color space conversions ──────────────────────────────────────────────────

/**
 * Parse a hex color string (#RGB or #RRGGBB) into { r, g, b } (0–255).
 * Returns null if the string is not a valid hex color.
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Convert { r, g, b } (0–255) to hex string e.g. "#ff3366".
 */
export function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Convert { r, g, b } (0–255) to CMYK percentages { c, m, y, k } (0–100).
 * This is a colorimetric approximation (device-independent).
 * Actual printed values depend on ICC profiles used by the printer/press.
 */
export function rgbToCmyk({ r, g, b }) {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;

  const k = 1 - Math.max(rp, gp, bp);

  if (k === 1) {
    // Pure black
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = (1 - rp - k) / (1 - k);
  const m = (1 - gp - k) / (1 - k);
  const y = (1 - bp - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

/**
 * Convert CMYK percentages { c, m, y, k } (0–100) back to { r, g, b } (0–255).
 */
export function cmykToRgb({ c, m, y, k }) {
  const r = 255 * (1 - c / 100) * (1 - k / 100);
  const g = 255 * (1 - m / 100) * (1 - k / 100);
  const b = 255 * (1 - y / 100) * (1 - k / 100);
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

/**
 * Convert { r, g, b } (0–255) to HSL { h: 0–360, s: 0–1, l: 0–1 }.
 */
export function rgbToHsl({ r, g, b }) {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;

  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rp) h = ((gp - bp) / delta + 6) % 6;
    else if (max === gp) h = (bp - rp) / delta + 2;
    else h = (rp - gp) / delta + 4;
    h = h * 60;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
}

/**
 * Parse an rgb() / rgba() CSS string into { r, g, b }.
 */
export function cssRgbToRgb(cssString) {
  const match = cssString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
}

/**
 * Parse any CSS color string (hex, rgb, rgba) into { r, g, b }.
 * Returns null if the format is not supported.
 */
export function parseCssColor(color) {
  if (!color || typeof color !== 'string') return null;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) return hexToRgb(trimmed);
  if (/^rgba?/i.test(trimmed)) return cssRgbToRgb(trimmed);
  return null;
}

// ─── Total Ink Coverage ───────────────────────────────────────────────────────

/**
 * Total Ink Coverage (TIC) = C + M + Y + K (sum of all CMYK channels, 0–400).
 * Most commercial printers cap at 280–320%.
 * Above 300% is risky for coated paper. Above 320% is unsafe for any paper.
 */
export function totalInkCoverage(cmyk) {
  return cmyk.c + cmyk.m + cmyk.y + cmyk.k;
}

const TIC_CAUTION_THRESHOLD = 280;
const TIC_WARNING_THRESHOLD = 300;
const TIC_DANGER_THRESHOLD = 320;

export function ticSeverity(tic) {
  if (tic >= TIC_DANGER_THRESHOLD) return SEVERITY.DANGER;
  if (tic >= TIC_WARNING_THRESHOLD) return SEVERITY.WARNING;
  if (tic >= TIC_CAUTION_THRESHOLD) return SEVERITY.CAUTION;
  return SEVERITY.SAFE;
}

// ─── Gamut loss ───────────────────────────────────────────────────────────────

/**
 * Convert RGB → CMYK → RGB and measure how far the recovered color
 * drifts from the original. A large delta indicates out-of-gamut.
 * Returns Euclidean distance in RGB space (0–100+).
 */
export function gamutLoss({ r, g, b }) {
  const cmyk = rgbToCmyk({ r, g, b });
  const recovered = cmykToRgb(cmyk);
  const dr = r - recovered.r;
  const dg = g - recovered.g;
  const db = b - recovered.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ─── HSL zone matching ────────────────────────────────────────────────────────

function matchesZone(hsl, zone) {
  const { h, s, l } = hsl;
  const hInZone = h >= zone.hueMin && h <= zone.hueMax;
  const sInZone = s >= zone.satMin && s <= zone.satMax;
  const lInZone = l >= zone.lightMin && l <= zone.lightMax;
  return hInZone && sInZone && lInZone;
}

// ─── Core: checkColor ─────────────────────────────────────────────────────────

/**
 * Check a single color for print safety.
 *
 * @param {string} color   — Any CSS color: "#39FF14", "rgb(57,255,20)", etc.
 * @param {string} [label] — Optional human-readable label for the color.
 *
 * @returns {{
 *   color: string,
 *   label: string,
 *   rgb: {r:number, g:number, b:number} | null,
 *   cmyk: {c:number, m:number, y:number, k:number} | null,
 *   tic: number | null,
 *   gamutLoss: number | null,
 *   severity: string,
 *   isSafe: boolean,
 *   warnings: string[],
 *   suggestions: string[]
 * }}
 */
export function checkColor(color, label) {
  const rgb = parseCssColor(color);

  if (!rgb) {
    return {
      color,
      label: label || color,
      rgb: null,
      cmyk: null,
      tic: null,
      gamutLoss: null,
      severity: SEVERITY.WARNING,
      isSafe: false,
      warnings: [`Could not parse color "${color}". Only #hex and rgb() formats are supported.`],
      suggestions: ['Use a #hex or rgb() color value.'],
    };
  }

  const cmyk = rgbToCmyk(rgb);
  const tic = totalInkCoverage(cmyk);
  const loss = gamutLoss(rgb);
  const hsl = rgbToHsl(rgb);

  const warnings = [];
  const suggestions = [];
  let highestSeverity = SEVERITY.SAFE;

  const severityOrder = [SEVERITY.SAFE, SEVERITY.CAUTION, SEVERITY.WARNING, SEVERITY.DANGER];
  const escalate = (s) => {
    if (severityOrder.indexOf(s) > severityOrder.indexOf(highestSeverity)) {
      highestSeverity = s;
    }
  };

  // 1. Check known out-of-gamut hue zones
  for (const zone of OUT_OF_GAMUT_ZONES) {
    if (matchesZone(hsl, zone)) {
      escalate(zone.severity);
      warnings.push(`[${zone.name}] ${zone.description}`);
      if (zone.suggestion) suggestions.push(zone.suggestion);
      break;
    }
  }

  // 2. Check Total Ink Coverage
  const ticS = ticSeverity(tic);
  if (ticS !== SEVERITY.SAFE) {
    escalate(ticS);
    const ticMessages = {
      [SEVERITY.CAUTION]: `Total Ink Coverage is ${tic}% (caution threshold: ${TIC_CAUTION_THRESHOLD}%). Ink pooling risk on uncoated paper.`,
      [SEVERITY.WARNING]: `Total Ink Coverage is ${tic}% (warning threshold: ${TIC_WARNING_THRESHOLD}%). Expect ink smearing on most paper types.`,
      [SEVERITY.DANGER]: `Total Ink Coverage is ${tic}% (danger threshold: ${TIC_DANGER_THRESHOLD}%). High risk of ink bleeding, smearing, and slow drying.`,
    };
    warnings.push(ticMessages[ticS]);
    suggestions.push('Reduce the K (black) channel or lighten the color to lower total ink coverage.');
  }

  // 3. Round-trip gamut loss check
  if (loss > 30) {
    escalate(SEVERITY.DANGER);
    warnings.push(
      `Gamut loss is high (Δ${loss.toFixed(1)} RGB). This color cannot be reproduced accurately in CMYK — it will look significantly different in print.`
    );
    suggestions.push('Desaturate or darken the color to bring it into the printable CMYK gamut.');
  } else if (loss > 15) {
    escalate(SEVERITY.WARNING);
    warnings.push(`Gamut loss detected (Δ${loss.toFixed(1)} RGB). This color will shift noticeably in print.`);
  } else if (loss > 5) {
    escalate(SEVERITY.CAUTION);
    warnings.push(`Minor gamut loss (Δ${loss.toFixed(1)} RGB). Very slight shift may occur — usually acceptable.`);
  }

  return {
    color,
    label: label || color,
    rgb,
    cmyk,
    tic,
    gamutLoss: loss,
    severity: highestSeverity,
    isSafe: highestSeverity === SEVERITY.SAFE,
    warnings,
    suggestions,
  };
}

// ─── Batch check ─────────────────────────────────────────────────────────────

/**
 * Check multiple colors at once.
 *
 * @param {Array<string | { color: string, label: string }>} colors
 * @returns {ReturnType<typeof checkColor>[]}
 *
 * @example
 * checkColors(['#39FF14', '#1a1a2e', { color: '#FF6B6B', label: 'Accent Red' }])
 */
export function checkColors(colors) {
  return colors.map((entry) => {
    if (typeof entry === 'string') return checkColor(entry);
    return checkColor(entry.color, entry.label);
  });
}

// ─── Summarize results ────────────────────────────────────────────────────────

/**
 * Summarize a batch of checkColor results.
 *
 * @param {ReturnType<typeof checkColor>[]} results
 * @returns {{ safe: number, caution: number, warning: number, danger: number, total: number, allSafe: boolean }}
 */
export function summarizeResults(results) {
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  for (const r of results) {
    counts[r.severity] = (counts[r.severity] || 0) + 1;
  }
  return {
    ...counts,
    total: results.length,
    allSafe: counts.caution === 0 && counts.warning === 0 && counts.danger === 0,
  };
}

// ─── Suggest print-safe alternative ──────────────────────────────────────────

/**
 * Heuristically correct an unsafe color to be CMYK print-safe by:
 *  1. Reducing saturation until gamut loss is acceptable.
 *  2. Darkening near-white colors so they don't wash out.
 *  3. Capping Total Ink Coverage by reducing the K channel.
 *
 * This is a heuristic — always verify against a physical proof or soft proof.
 *
 * @param {string} color
 * @returns {{ corrected: string, cmyk: {c,m,y,k}, tic: number }}
 */
export function suggestPrintSafe(color) {
  const rgb = parseCssColor(color);
  if (!rgb) return { corrected: color, cmyk: null, tic: null };

  let { r, g, b } = rgb;

  // Step 1: Desaturate iteratively until gamut loss is small
  let loss = gamutLoss({ r, g, b });
  let iterations = 0;
  while (loss > 12 && iterations < 20) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = r + (gray - r) * 0.1;
    g = g + (gray - g) * 0.1;
    b = b + (gray - b) * 0.1;
    loss = gamutLoss({ r: Math.round(r), g: Math.round(g), b: Math.round(b) });
    iterations++;
  }
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);

  // Step 2: Darken near-whites
  const hsl = rgbToHsl({ r, g, b });
  if (hsl.l > 0.9) {
    const factor = 0.88 / hsl.l;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  }

  // Step 3: Cap Total Ink Coverage
  let cmyk = rgbToCmyk({ r, g, b });
  let tic = totalInkCoverage(cmyk);
  if (tic > TIC_WARNING_THRESHOLD) {
    const excess = tic - TIC_WARNING_THRESHOLD;
    cmyk.k = Math.max(0, cmyk.k - excess);
    const correctedRgb = cmykToRgb(cmyk);
    r = correctedRgb.r;
    g = correctedRgb.g;
    b = correctedRgb.b;
    cmyk = rgbToCmyk({ r, g, b });
    tic = totalInkCoverage(cmyk);
  }

  return {
    corrected: rgbToHex({ r, g, b }),
    cmyk,
    tic,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

/**
 * Format a CMYK object as a human-readable string.
 * e.g. "C:45 M:12 Y:0 K:30"
 */
export function formatCmyk({ c, m, y, k }) {
  return `C:${c} M:${m} Y:${y} K:${k}`;
}

/**
 * Format a checkColor result as a compact string for console logging.
 */
export function formatResult(result) {
  const icon = {
    [SEVERITY.SAFE]: '✅',
    [SEVERITY.CAUTION]: '🟡',
    [SEVERITY.WARNING]: '🟠',
    [SEVERITY.DANGER]: '🔴',
  }[result.severity];

  const cmykStr = result.cmyk ? `CMYK(${formatCmyk(result.cmyk)})` : 'CMYK(?)';
  const ticStr = result.tic !== null ? ` TIC:${result.tic}%` : '';
  const lossStr = result.gamutLoss !== null ? ` Δ${result.gamutLoss.toFixed(1)}` : '';

  let out = `${icon} [${result.severity.toUpperCase()}] ${result.label} ${result.color} → ${cmykStr}${ticStr}${lossStr}`;
  if (result.warnings.length) {
    out += '\n' + result.warnings.map((w) => `   ⚠ ${w}`).join('\n');
  }
  if (result.suggestions.length) {
    out += '\n' + result.suggestions.map((s) => `   💡 ${s}`).join('\n');
  }
  return out;
}

/**
 * Log a batch audit of colors to the console.
 * Use this during development to audit your full design system palette.
 *
 * @param {Array<string | { color: string, label: string }>} colors
 * @returns {ReturnType<typeof checkColor>[]}
 *
 * @example
 * import { auditColors } from './utils/cmyk';
 *
 * auditColors([
 *   { color: '#39FF14', label: 'Neon Green Accent' },
 *   { color: '#1a1a2e', label: 'Page Background' },
 *   { color: '#C62828', label: 'Header Red' },
 * ]);
 */
export function auditColors(colors) {
  const results = checkColors(colors);
  const summary = summarizeResults(results);

  console.group('🖨️  CMYK Print Safety Audit');
  for (const result of results) {
    console.log(formatResult(result));
  }
  console.groupEnd();

  console.log(
    `Summary: ${summary.total} colors — ` +
      `✅ ${summary.safe} safe  🟡 ${summary.caution} caution  ` +
      `🟠 ${summary.warning} warning  🔴 ${summary.danger} danger`
  );

  return results;
}

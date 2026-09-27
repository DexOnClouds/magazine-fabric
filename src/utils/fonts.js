export const HEADING_FONTS = [
  { id: 'Rogient Block', name: 'Rogient Block', family: 'Rogient Block', category: 'Heavy Zine' },
  { id: 'Frogie', name: 'Frogie Funky', family: 'Frogie', category: 'Playful Retro' },
  { id: 'Painless', name: 'Painless Comic', family: 'Painless', category: 'Comic Display' },
  { id: 'Bryson', name: 'Bryson Retro', family: 'Bryson', category: 'Custom Serif' },
  { id: 'Gelato', name: 'Gelato Display', family: 'Gelato', category: 'Custom Pop' },
  { id: 'Pearl Jean', name: 'Pearl Jean', family: 'Pearl Jean', category: 'Custom Retro' },
  { id: 'Manrope', name: 'Manrope Modern', family: 'Manrope', category: 'Custom Sans' },
  { id: 'Impact', name: 'Impact Heavy', family: 'Impact', category: 'System' },
  { id: 'Georgia', name: 'Georgia Editorial', family: 'Georgia', category: 'System' },
  { id: 'Courier New', name: 'Courier Typewriter', family: 'Courier New', category: 'System' },
  { id: 'Arial Black', name: 'Arial Black Poster', family: 'Arial Black', category: 'System' },
];

export const BODY_FONTS = [
  { id: 'Poppins', name: 'Poppins', family: 'Poppins', category: 'Google Sans (Modern)' },
  { id: 'Broclen', name: 'Broclen', family: 'Broclen', category: 'Vintage Serif' },
  { id: 'Gendy', name: 'Gendy', family: 'Gendy', category: 'Modern Headline' },
  { id: 'Mochiy Pop One', name: 'Mochiy Pop One', family: 'Mochiy Pop One', category: 'Pop Rounded' },
  { id: 'Otomanopee One', name: 'Otomanopee One', family: 'Otomanopee One', category: 'Japanese Sans' },
  { id: 'Rokey', name: 'Rokey', family: 'Rokey', category: 'Editorial Clean' },
  { id: 'Shine Typewriter', name: 'Shine Typewriter', family: 'Shine Typewriter', category: 'Vintage Typewriter' },
  { id: 'Geist Pixel', name: 'Geist Pixel', family: 'Geist Pixel', category: 'Pixel Sans' },
  { id: 'Inter', name: 'Inter', family: 'Inter', category: 'Google Sans (Neutral)' },
  { id: 'Playfair Display', name: 'Playfair Display', family: 'Playfair Display', category: 'Google Serif' },
  { id: 'Lora', name: 'Lora', family: 'Lora', category: 'Google Editorial Serif' },
];

export const AVAILABLE_FONTS = [
  ...HEADING_FONTS,
  ...BODY_FONTS.filter(b => !HEADING_FONTS.some(h => h.family === b.family)),
];

export const ensureFontLoaded = async (fontFamily) => {
  try {
    if (document.fonts && document.fonts.load) {
      await document.fonts.load(`48px "${fontFamily}"`);
    }
  } catch (err) {
    console.warn(`Could not preload font ${fontFamily}:`, err);
  }
};

export const preloadAllFonts = async () => {
  try {
    if (document.fonts) {
      await Promise.all(
        AVAILABLE_FONTS.map(f => document.fonts.load(`48px "${f.family}"`).catch(() => {}))
      );
      await document.fonts.ready;
    }
  } catch (e) {
    console.warn('Preloading fonts error:', e);
  }
};

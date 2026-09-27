/**
 * Checks if the user currently has a highlighted range of text in edit mode
 */
export function hasTextSelection(textbox) {
  if (!textbox) return false;
  return Boolean(
    textbox.isEditing &&
    typeof textbox.selectionStart === 'number' &&
    typeof textbox.selectionEnd === 'number' &&
    textbox.selectionStart !== textbox.selectionEnd
  );
}

/**
 * Refreshes textbox dimensions, line wraps, and character bounds caches
 * Crucial when text gets styled (e.g. italic/bold) because slanted/wider glyphs
 * take more space and must re-wrap properly without overflowing or glitching the selection.
 *
 * We temporarily hide isEditing from initDimensions so it doesn't trigger
 * initDelayedCursor → clearContextTop, which would wipe the visual selection
 * highlight and make the next operation think nothing is selected.
 */
function refreshTextboxLayout(fabricCanvas, textbox) {
  textbox.dirty = true;
  if (typeof textbox.initDimensions === 'function') {
    const wasEditing = textbox.isEditing;
    // Hide editing state so initDimensions doesn't call initDelayedCursor
    // (which calls abortCursorAnimation → clearContextTop → erases selection)
    if (wasEditing) textbox.isEditing = false;
    textbox.initDimensions();
    if (wasEditing) textbox.isEditing = true;
  }
  if (textbox.cursorOffsetCache) {
    textbox.cursorOffsetCache = {};
  }
  textbox.setCoords();
  fabricCanvas.requestRenderAll();
  // Re-draw the cursor/selection highlight that we preserved
  if (textbox.isEditing && typeof textbox.renderCursorOrSelection === 'function') {
    textbox.renderCursorOrSelection();
  }
}

/**
 * Applies a text property (fontFamily, fontSize, fill, etc.)
 * Either to the active highlighted text range or to the whole object
 */
export function applyTextStyle(fabricCanvas, textbox, prop, val) {
  if (!fabricCanvas || !textbox) return;

  if (hasTextSelection(textbox)) {
    textbox.setSelectionStyles({ [prop]: val });
  } else {
    textbox.set(prop, val);
  }

  refreshTextboxLayout(fabricCanvas, textbox);
}

/**
 * Toggles bold for selection if highlighted, otherwise for whole textbox
 */
export function toggleBold(fabricCanvas, textbox) {
  if (!fabricCanvas || !textbox) return;

  if (hasTextSelection(textbox)) {
    const styles = textbox.getSelectionStyles() || [];
    const isAlreadyBold = styles.every((s) => s.fontWeight === 'bold' || s.fontWeight === 700);
    const nextWeight = isAlreadyBold ? 'normal' : 'bold';
    textbox.setSelectionStyles({ fontWeight: nextWeight });
  } else {
    const isAlreadyBold = textbox.fontWeight === 'bold' || textbox.fontWeight === 700;
    textbox.set('fontWeight', isAlreadyBold ? 'normal' : 'bold');
  }

  refreshTextboxLayout(fabricCanvas, textbox);
}

/**
 * Toggles italic for selection if highlighted, otherwise for whole textbox
 */
export function toggleItalic(fabricCanvas, textbox) {
  if (!fabricCanvas || !textbox) return;

  if (hasTextSelection(textbox)) {
    const styles = textbox.getSelectionStyles() || [];
    const isAlreadyItalic = styles.every((s) => s.fontStyle === 'italic');
    const nextStyle = isAlreadyItalic ? 'normal' : 'italic';
    textbox.setSelectionStyles({ fontStyle: nextStyle });
  } else {
    const isAlreadyItalic = textbox.fontStyle === 'italic';
    textbox.set('fontStyle', isAlreadyItalic ? 'normal' : 'italic');
  }

  refreshTextboxLayout(fabricCanvas, textbox);
}

/**
 * Toggles underline for selection if highlighted, otherwise for whole textbox
 */
export function toggleUnderline(fabricCanvas, textbox) {
  if (!fabricCanvas || !textbox) return;

  if (hasTextSelection(textbox)) {
    const styles = textbox.getSelectionStyles() || [];
    const isAlreadyUnderlined = styles.every((s) => s.underline === true);
    textbox.setSelectionStyles({ underline: !isAlreadyUnderlined });
  } else {
    textbox.set('underline', !textbox.underline);
  }

  refreshTextboxLayout(fabricCanvas, textbox);
}

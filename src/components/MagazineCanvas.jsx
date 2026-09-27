import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { preloadAllFonts } from '../utils/fonts';
import Alignment from './Alignment';

const BASE_WIDTH = 595;
const BASE_HEIGHT = 842;

const MagazineCanvas = ({
  fabricCanvas,
  setFabricCanvas,
  activeObject,
  setActiveObject,
  pageColor,
  zoom,
  showSafeGuides,
}) => {
  const canvasElRef = useRef(null);

  // Initialize canvas
  useEffect(() => {
    preloadAllFonts();

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: BASE_WIDTH * zoom,
      height: BASE_HEIGHT * zoom,
      backgroundColor: pageColor || '#FDE9C9',
      preserveObjectStacking: true,
      selectionColor: 'rgba(244, 63, 94, 0.1)',
      selectionBorderColor: '#f43f5e',
      selectionLineWidth: 1.5,
    });

    canvas.setZoom(zoom);

    // Track active selection
    const handleSelection = () => {
      const active = canvas.getActiveObject();
      setActiveObject(active || null);
    };

    const handleClearSelection = () => {
      setActiveObject(null);
    };

    const handleObjectModified = () => {
      const active = canvas.getActiveObject();
      setActiveObject(active || null);
    };

    const syncHeadingControlPadding = (event) => {
      const obj = event.target;
      if (!obj?.headingStyleId) return;
      const scale = Math.min(Math.abs(obj.scaleX || 1), Math.abs(obj.scaleY || 1));
      const padding = (Number(obj.boxPadding) || 0) * scale;
      if (obj.padding !== padding) {
        obj.padding = padding;
        obj.setCoords();
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleClearSelection);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('text:changed', handleObjectModified);
    canvas.on('object:scaling', syncHeadingControlPadding);
    canvas.on('object:modified', syncHeadingControlPadding);

    // Keyboard shortcuts (Delete / Backspace to remove active text)
    const handleKeyDown = (e) => {
      // Don't delete if user is currently typing inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const active = canvas.getActiveObject();
      if (!active) return;

      // Don't delete if user is currently editing text inside the canvas textbox
      if (active.isEditing) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setActiveObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    setFabricCanvas(canvas);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update zoom when zoom prop changes
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.setDimensions({
      width: BASE_WIDTH * zoom,
      height: BASE_HEIGHT * zoom,
    });
    fabricCanvas.setZoom(zoom);
    fabricCanvas.requestRenderAll();
  }, [zoom, fabricCanvas]);

  // Update page background color
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.set('backgroundColor', pageColor);
    fabricCanvas.requestRenderAll();
  }, [pageColor, fabricCanvas]);

  return (
    <div className="relative select-none flex items-center justify-center p-6">
      {/* A4 Paper Frame with realistic print shadow */}
      <div
        className="relative bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-200"
        style={{
          width: BASE_WIDTH * zoom,
          height: BASE_HEIGHT * zoom,
        }}
      >
        <canvas ref={canvasElRef} />

        {/* Photoshop-style Magnetic Alignment & Smart Guides */}
        <Alignment fabricCanvas={fabricCanvas} />

        {/* Magazine Print Safe Margins Overlay */}
        {showSafeGuides && (
          <div
            className="absolute inset-0 pointer-events-none border border-dashed border-rose-400/40"
            style={{
              margin: `${36 * zoom}px`, // ~12mm margin guide
            }}
          >
            <div className="absolute top-1 left-1.5 text-[9px] font-mono text-rose-500/70 select-none">
              PRINT SAFE MARGIN
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagazineCanvas;

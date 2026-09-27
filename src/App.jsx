import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import MagazineCanvas from './components/MagazineCanvas';
import { preloadAllFonts } from './utils/fonts';
import { createCanvasHistory } from './utils/history';

function App() {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeObject, setActiveObject] = useState(null);
  const [pageColor, setPageColor] = useState('#FDE9C9'); // Butter Yellow
  const [zoom, setZoom] = useState(0.80); // 80% zoom — full A4 visible without cropping
  const [showSafeGuides, setShowSafeGuides] = useState(true);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const historyRef = useRef(null);

  // Multi-page management
  const [pages, setPages] = useState([
    { id: 'page-1', name: 'Page 1 (Cover / Feature)', backgroundColor: '#FDE9C9', canvasData: null },
  ]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const switchingPageRef = useRef(false);



  useEffect(() => {
    if (!fabricCanvas) return;
    const history = createCanvasHistory(setHistoryState);
    historyRef.current = history;
    history.setPage(pages[activePageIndex]?.id || 'page-1', fabricCanvas);
    return () => {
      history.dispose();
      historyRef.current = null;
    };
  }, [fabricCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return undefined;
    const handleHistoryShortcut = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
      if (fabricCanvas.getActiveObject()?.isEditing) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) historyRef.current?.redo();
        else historyRef.current?.undo();
      } else if (key === 'y') {
        event.preventDefault();
        historyRef.current?.redo();
      }
    };
    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [fabricCanvas]);

  // Preload fonts on initial mount
  useEffect(() => {
    preloadAllFonts();
  }, []);

  // Save current canvas state to pages array before switching
  const saveCurrentPageState = () => {
    if (!fabricCanvas || switchingPageRef.current) return;
    const json = fabricCanvas.toJSON();
    setPages((prevPages) => {
      const copy = [...prevPages];
      if (copy[activePageIndex]) {
        copy[activePageIndex] = {
          ...copy[activePageIndex],
          backgroundColor: pageColor,
          canvasData: json,
        };
      }
      return copy;
    });
  };

  // Switch to page
  const handleSelectPage = (newIndex) => {
    if (newIndex === activePageIndex || !fabricCanvas) return;
    historyRef.current?.pause();
    saveCurrentPageState();

    switchingPageRef.current = true;
    setActivePageIndex(newIndex);
    const targetPage = pages[newIndex];
    setPageColor(targetPage.backgroundColor || '#F7F2E7');

    if (targetPage.canvasData) {
      fabricCanvas.loadFromJSON(targetPage.canvasData).then(() => {
        fabricCanvas.set('backgroundColor', targetPage.backgroundColor || '#F7F2E7');
        fabricCanvas.requestRenderAll();
        historyRef.current?.setPage(targetPage.id, fabricCanvas);
        historyRef.current?.resume();
        setActiveObject(null);
        switchingPageRef.current = false;
      });
    } else {
      fabricCanvas.clear();
      fabricCanvas.set('backgroundColor', targetPage.backgroundColor || '#F7F2E7');
      fabricCanvas.requestRenderAll();
      historyRef.current?.setPage(targetPage.id, fabricCanvas);
      historyRef.current?.resume();
      setActiveObject(null);
      switchingPageRef.current = false;
    }
  };

  // Add new page
  const handleAddPage = () => {
    saveCurrentPageState();
    const newPageId = `page-${Date.now()}`;
    const newPage = {
      id: newPageId,
      name: `Page ${pages.length + 1}`,
      backgroundColor: '#F7F2E7',
      canvasData: null,
    };
    const newPages = [...pages, newPage];
    setPages(newPages);
    handleSelectPage(newPages.length - 1);
  };

  // Delete page
  const handleDeletePage = (indexToDelete) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, idx) => idx !== indexToDelete);
    setPages(newPages);
    const newIndex = Math.min(activePageIndex, newPages.length - 1);
    handleSelectPage(newIndex);
  };

  // Duplicate page
  const handleDuplicatePage = (indexToDuplicate) => {
    saveCurrentPageState();
    if (!fabricCanvas) return;
    const currentJSON = fabricCanvas.toJSON();
    const sourcePage = pages[indexToDuplicate];
    const duplicatedPage = {
      id: `page-${Date.now()}`,
      name: `${sourcePage.name} (Copy)`,
      backgroundColor: sourcePage.backgroundColor || pageColor,
      canvasData: currentJSON,
    };
    const newPages = [...pages, duplicatedPage];
    setPages(newPages);
    handleSelectPage(newPages.length - 1);
  };

  // Clear current page
  const handleClearPage = () => {
    if (!fabricCanvas) return;
    if (window.confirm('Clear all titles and content on this page?')) {
      historyRef.current?.pause();
      fabricCanvas.clear();
      fabricCanvas.set('backgroundColor', pageColor);
      fabricCanvas.requestRenderAll();
      setActiveObject(null);
      historyRef.current?.clearPage();
      historyRef.current?.resume();
    }
  };

  // High-Resolution Export
  const handleExport = async (format = 'png', qualitySetting = 'ultra') => {
    if (!fabricCanvas) return;

    // Deselect active object so selection handles are not exported
    const active = fabricCanvas.getActiveObject();
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();

    // Multiplier calculation for maximum clarity:
    // Base dimensions: 595 x 842 pt
    // Ultra 300 DPI multiplier is ~4.168 -> 2480 x 3508 px
    let targetMultiplier = 4.168 / zoom;
    if (qualitySetting === 'hd') {
      targetMultiplier = 2 / zoom;
    } else if (qualitySetting === 'std') {
      targetMultiplier = 1 / zoom;
    }

    try {
      const dataURL = fabricCanvas.toDataURL({
        format: format === 'jpeg' ? 'jpeg' : 'png',
        multiplier: targetMultiplier,
        quality: 1.0,
      });

      const link = document.createElement('a');
      link.download = `magazine-page-${activePageIndex + 1}-${qualitySetting}-300dpi.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Could not export image. Please try again.');
    } finally {
      // Restore selection if there was one
      if (active) {
        fabricCanvas.setActiveObject(active);
        fabricCanvas.requestRenderAll();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Studio Navbar */}
      <Navbar
        zoom={zoom}
        setZoom={setZoom}
        onExport={handleExport}
        onClearPage={handleClearPage}
        activePage={activePageIndex + 1}
        pageCount={pages.length}
        onAddPage={handleAddPage}
        onPrevPage={() => handleSelectPage(Math.max(0, activePageIndex - 1))}
        onNextPage={() => handleSelectPage(Math.min(pages.length - 1, activePageIndex + 1))}
      />

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Tools Sidebar */}
        <LeftSidebar
          fabricCanvas={fabricCanvas}
          pageColor={pageColor}
          setPageColor={setPageColor}
          showSafeGuides={showSafeGuides}
          setShowSafeGuides={setShowSafeGuides}
          pages={pages}
          activePageIndex={activePageIndex}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onDuplicatePage={handleDuplicatePage}
          activeObject={activeObject}
          setActiveObject={setActiveObject}
        />

        {/* Central Canvas Viewport */}
        <main className="flex-1 flex items-center justify-center overflow-auto bg-[#0b0f19] relative p-8">
          {/* Subtle background grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <MagazineCanvas
            fabricCanvas={fabricCanvas}
            setFabricCanvas={setFabricCanvas}
            activeObject={activeObject}
            setActiveObject={setActiveObject}
            pageColor={pageColor}
            zoom={zoom}
            showSafeGuides={showSafeGuides}
          />
        </main>

        {/* Right Inspector Sidebar - Dedicated strictly to Layer Properties */}
        <RightSidebar
          fabricCanvas={fabricCanvas}
          activeObject={activeObject}
          setActiveObject={setActiveObject}
          historyState={historyState}
          onUndo={() => historyRef.current?.undo()}
          onRedo={() => historyRef.current?.redo()}
        />
      </div>
    </div>
  );
}

export default App;

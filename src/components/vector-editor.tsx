'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/header';
import { Toolbar } from '@/components/toolbar';
import { Canvas } from '@/components/canvas';
import { RightSidebar } from '@/components/right-sidebar';
import { type Shape, type Tool, type InteractionState, type CanvasView, ImageShape, SVGShape } from '@/lib/types';
import { exportToSvg, exportToJpeg } from '@/lib/export';
import { ContextMenu } from './context-menu';
import { useEditorState } from '@/hooks/use-editor-state';
import { useKeyboardAndClipboard } from '@/hooks/use-keyboard-and-clipboard';
import { nanoid } from 'nanoid';

export function VectorEditor() {
  const {
    shapes,
    selectedShapeIds,
    addShape,
    addShapes,
    updateShapes,
    commit,
    setSelectedShapeIds,
    deleteShapesByIds,
    bringToFront,
    sendToBack,
    applyBooleanOperation,
    duplicateShapes,
    reorderShapes,
    renameShape,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorState();
  
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [interactionState, setInteractionState] = useState<InteractionState>({ type: 'none' });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string } | null>(null);
  
  const [canvasView, setCanvasView] = useState<CanvasView>({
    background: 'grid',
    gridSize: 20,
    snapToGrid: true,
    snapToObjects: true,
    scale: 1,
    pan: { x: 0, y: 0 },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'svg' | null>(null);


  const handleViewChange = useCallback((viewUpdate: Partial<CanvasView>) => {
    setCanvasView(prev => ({ ...prev, ...viewUpdate }));
  }, []);

  const deleteSelectedShapes = useCallback(() => {
    deleteShapesByIds(selectedShapeIds);
  }, [deleteShapesByIds, selectedShapeIds]);

  const duplicateSelectedShapes = useCallback(() => {
    duplicateShapes(selectedShapeIds);
  }, [duplicateShapes, selectedShapeIds]);
  
  const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));

  const { clipboard, handleCopy, handlePaste } = useKeyboardAndClipboard({
    selectedShapes,
    canvasView,
    addShapes,
    deleteSelectedShapes,
    activeTool,
    setActiveTool,
    setInteractionState,
    undo,
    redo
  });

  const handleExport = (format: 'svg' | 'jpeg') => {
    const canvasEl = document.getElementById('vector-canvas');
    if (!canvasEl) return;
    const { width, height } = canvasEl.getBoundingClientRect();

    if (format === 'svg') {
      exportToSvg(shapes, width, height, canvasView);
    } else {
      exportToJpeg(shapes, width, height, canvasView);
    }
  };

  const handleSelectShapeInLayerPanel = (id: string, shiftKey: boolean) => {
    if (shiftKey) {
      setSelectedShapeIds(prevIds => 
        prevIds.includes(id) 
          ? prevIds.filter(i => i !== id) 
          : [...prevIds, id]
      );
    } else {
      setSelectedShapeIds([id]);
    }
  };
  
  const handleShapesUpdate = useCallback((updatedShapes: Shape[], shouldCommit: boolean = false) => {
    updateShapes(updatedShapes);
    if (shouldCommit) {
      commit();
    }
  }, [updateShapes, commit]);

  const getCanvasCenter = () => {
    const canvasEl = document.getElementById('vector-canvas');
    if (!canvasEl) return { x: 0, y: 0 };
    const rect = canvasEl.getBoundingClientRect();
    const centerX = (rect.width / 2 - canvasView.pan.x) / canvasView.scale;
    const centerY = (rect.height / 2 - canvasView.pan.y) / canvasView.scale;
    return { x: centerX, y: centerY };
  }

  const handleImageUpload = () => {
    setUploadType('image');
    if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*';
        fileInputRef.current.click();
    }
  };

  const handleSvgUpload = () => {
      setUploadType('svg');
      if (fileInputRef.current) {
          fileInputRef.current.accept = '.svg, image/svg+xml';
          fileInputRef.current.click();
      }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const center = getCanvasCenter();
    const reader = new FileReader();

    if (uploadType === 'image') {
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
                const newShape: ImageShape = {
                    id: nanoid(),
                    type: 'image',
                    name: file.name,
                    href: dataUrl,
                    x: center.x - img.naturalWidth / 2,
                    y: center.y - img.naturalHeight / 2,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    rotation: 0,
                    opacity: 1,
                };
                addShape(newShape);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    } else if (uploadType === 'svg') {
        reader.onload = (event) => {
            const svgString = event.target?.result as string;
            const width = 200, height = 200;
            const newShape: SVGShape = {
                id: nanoid(),
                type: 'svg',
                name: file.name,
                svgString,
                x: center.x - width / 2,
                y: center.y - height / 2,
                width,
                height,
                rotation: 0,
                opacity: 1,
            };
            addShape(newShape);
        };
        reader.readAsText(file);
    }
    
    if (e.target) e.target.value = '';
  };


  return (
    <div className="flex flex-col h-screen bg-muted/40 font-sans">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelected} />
      <AppHeader onExport={handleExport} canvasView={canvasView} onViewChange={handleViewChange} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar 
          activeTool={activeTool} 
          onToolSelect={setActiveTool} 
          onBooleanOperation={applyBooleanOperation} 
          disabled={selectedShapes.length < 2} 
          onAddImage={handleImageUpload}
          onAddSvg={handleSvgUpload}
        />
        <main className="flex-1 relative bg-background shadow-inner">
          <Canvas
            shapes={shapes}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            selectedShapeIds={selectedShapeIds}
            setSelectedShapeIds={setSelectedShapeIds}
            addShape={addShape}
            updateShapes={updateShapes}
            commitUpdate={commit}
            interactionState={interactionState}
            setInteractionState={setInteractionState}
            setContextMenu={setContextMenu}
            canvasView={canvasView}
            onViewChange={handleViewChange}
          />
        </main>
        <RightSidebar
          shapes={shapes}
          selectedShapeIds={selectedShapeIds}
          onShapesUpdate={handleShapesUpdate}
          onCommit={commit}
          onSelectShape={handleSelectShapeInLayerPanel}
          onDelete={deleteSelectedShapes}
          onDuplicate={duplicateSelectedShapes}
          onReorder={reorderShapes}
          onRename={renameShape}
        />
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={handleCopy}
          onPaste={handlePaste}
          canPaste={clipboard.length > 0}
          onDelete={deleteSelectedShapes}
          onBringToFront={() => bringToFront(selectedShapeIds)}
          onSendToBack={() => sendToBack(selectedShapeIds)}
        />
      )}
    </div>
  );
}

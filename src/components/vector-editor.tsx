'use client';

import React, { useState, useCallback, useRef } from 'react';
import { AppHeader } from '@/components/header';
import { Toolbar } from '@/components/toolbar';
import { Canvas } from '@/components/canvas';
import { RightSidebar } from '@/components/right-sidebar';
import { type Shape, type Tool, type InteractionState, type CanvasView, ImageShape, SVGShape } from '@/lib/types';
import { exportToSvg, exportToJpeg, exportSelectionToSvg, exportSelectionToJpeg } from '@/lib/export';
import { ContextMenu } from './context-menu';
import { useEditorState } from '@/hooks/use-editor-state';
import { useKeyboardAndClipboard } from '@/hooks/use-keyboard-and-clipboard';
import { CropDialog } from './crop-dialog';

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
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  
  const [canvasView, setCanvasView] = useState<CanvasView>({
    background: 'grid',
    gridSize: 20,
    snapToGrid: true,
    snapToObjects: true,
    scale: 1,
    pan: { x: 0, y: 0 },
  });

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
  const croppingShape = shapes.find(s => s.id === croppingImageId) as ImageShape | undefined;

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
  
  const handleExportSelection = (format: 'svg' | 'jpeg') => {
    if (selectedShapes.length === 0) return;

    if (format === 'svg') {
        exportSelectionToSvg(selectedShapes);
    } else {
        exportSelectionToJpeg(selectedShapes);
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

  const handleCropSave = (crop: { x: number; y: number; width: number; height: number; }) => {
    if (!croppingShape) return;

    const newAspectRatio = crop.width / crop.height;
    const newHeight = croppingShape.width / newAspectRatio;
    
    const updatedShape: ImageShape = {
        ...croppingShape,
        height: newHeight,
        crop: crop
    };
    
    updateShapes([updatedShape]);
    commit();
    setCroppingImageId(null);
  };

  const isSingleImageSelected = selectedShapes.length === 1 && selectedShapes[0].type === 'image';

  return (
    <div className="flex flex-col h-screen bg-muted/40 font-sans">
      <AppHeader onExport={handleExport} canvasView={canvasView} onViewChange={handleViewChange} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar 
          activeTool={activeTool} 
          onToolSelect={setActiveTool} 
          onBooleanOperation={applyBooleanOperation} 
          disabled={selectedShapes.length < 2}
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
          onExportSelection={handleExportSelection}
          onRename={renameShape}
          setInteractionState={setInteractionState}
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
          canCrop={isSingleImageSelected}
          onCrop={() => setCroppingImageId(selectedShapeIds[0])}
        />
      )}
      {croppingShape && (
        <CropDialog
            shape={croppingShape}
            onClose={() => setCroppingImageId(null)}
            onSave={handleCropSave}
        />
      )}
    </div>
  );
}

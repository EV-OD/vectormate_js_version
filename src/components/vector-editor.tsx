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
import { PromptBar } from './prompt-bar';

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
    createClippingMask,
    releaseClippingMask,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorState();
  
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [interactionState, setInteractionState] = useState<InteractionState>({ type: 'none' });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeId: string } | null>(null);
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const [isolationMode, setIsolationMode] = useState<string | null>(null);
  
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

  const handleSelectShape = useCallback((id: string, shiftKey: boolean) => {
    const clickedShape = shapes.find(s => s.id === id);
    if (!clickedShape) return;

    if (isolationMode) {
        if (clickedShape.groupId !== isolationMode) return;

        setSelectedShapeIds(prevIds => 
            shiftKey 
                ? (prevIds.includes(id) ? prevIds.filter(i => i !== id) : [...prevIds, id])
                : [id]
        );
        return;
    }

    const groupId = clickedShape.groupId;
    const idsToSelect = groupId ? shapes.filter(s => s.groupId === groupId).map(s => s.id) : [id];

    setSelectedShapeIds(prevIds => {
        if (!shiftKey) {
            return idsToSelect;
        }
        const isGroupSelected = idsToSelect.every(id => prevIds.includes(id));
        if (isGroupSelected) {
            return prevIds.filter(prevId => !idsToSelect.includes(prevId));
        } else {
            return [...new Set([...prevIds, ...idsToSelect])];
        }
    });
  }, [shapes, isolationMode, setSelectedShapeIds]);
  
  const handleShapesUpdate = useCallback((updatedShapes: Shape[], shouldCommit: boolean = false) => {
    updateShapes(updatedShapes);
    if (shouldCommit) {
      commit();
    }
  }, [updateShapes, commit]);

  const handleCropSave = (crop: { x: number; y: number; width: number; height: number; }) => {
    if (!croppingShape) return;

    const imageSrc = croppingShape.originalHref || croppingShape.href;
    if (!imageSrc) return;

    const img = new window.Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
        const newHref = canvas.toDataURL(img.src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');
        
        const previewCanvas = document.createElement('canvas');
        const PREVIEW_WIDTH = 50;
        const aspectRatio = crop.width > 0 ? crop.height / crop.width : 1;
        previewCanvas.width = PREVIEW_WIDTH;
        previewCanvas.height = PREVIEW_WIDTH * aspectRatio;
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx?.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        const lowQualityHref = previewCanvas.toDataURL('image/jpeg', 0.2);

        const updatedShape: ImageShape = {
            ...croppingShape,
            href: newHref,
            lowQualityHref,
            width: crop.width,
            height: crop.height,
            originalHref: croppingShape.originalHref || croppingShape.href,
            originalWidth: croppingShape.originalWidth,
            originalHeight: croppingShape.originalHeight,
        };
        
        updateShapes([updatedShape]);
        commit();
        setCroppingImageId(null);
    };
    img.onerror = () => {
        console.error("Failed to load image for cropping.");
        setCroppingImageId(null);
    }
    img.src = imageSrc;
  };

  const isSingleImageSelected = selectedShapes.length === 1 && selectedShapes[0].type === 'image';
  const canCreateClippingMask = selectedShapeIds.length === 2 && !selectedShapes.some(s => s.groupId);
  const canReleaseMask = selectedShapes.length > 0 && !!selectedShapes[0].groupId;


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
            isolationMode={isolationMode}
            setIsolationMode={setIsolationMode}
          />
          <PromptBar />
        </main>
        <RightSidebar
          shapes={shapes}
          selectedShapeIds={selectedShapeIds}
          onShapesUpdate={handleShapesUpdate}
          onCommit={commit}
          onSelectShape={handleSelectShape}
          onDelete={deleteSelectedShapes}
          onDuplicate={duplicateSelectedShapes}
          onReorder={reorderShapes}
          onExportSelection={handleExportSelection}
          onRename={renameShape}
          setInteractionState={setInteractionState}
          isolationMode={isolationMode}
          setIsolationMode={setIsolationMode}
          onReleaseMask={releaseClippingMask}
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
          canCreateClippingMask={canCreateClippingMask}
          onCreateClippingMask={createClippingMask}
          canReleaseMask={canReleaseMask}
          onReleaseMask={() => releaseClippingMask(selectedShapes[0]?.id)}
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

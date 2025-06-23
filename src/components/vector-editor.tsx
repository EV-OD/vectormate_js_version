'use client';

import React, { useState, useCallback } from 'react';
import { AppHeader } from '@/components/header';
import { Toolbar } from '@/components/toolbar';
import { Canvas } from '@/components/canvas';
import { RightSidebar } from '@/components/right-sidebar';
import { type Shape, type Tool, type InteractionState, PolygonShape, type CanvasView } from '@/lib/types';
import { exportToSvg, exportToJpeg } from '@/lib/export';
import { ContextMenu } from './context-menu';
import { useEditorState } from '@/hooks/use-editor-state';
import { useKeyboardAndClipboard } from '@/hooks/use-keyboard-and-clipboard';
import { getHexagonPoints } from '@/lib/geometry';
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
    background: 'solid',
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

  const { clipboard, handleCopy, handlePaste } = useKeyboardAndClipboard({
    selectedShapes,
    canvasViewScale: canvasView.scale,
    addShapes,
    deleteSelectedShapes,
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const propType = e.dataTransfer.getData("application/vectormate-prop");
    const canvasEl = document.getElementById('vector-canvas');
    if (!canvasEl) return;

    const canvasRect = canvasEl.getBoundingClientRect();
    let CTM = (canvasEl as unknown as SVGSVGElement).getScreenCTM();
    if (!CTM) return;
    CTM = CTM.inverse();

    let point = (canvasEl as unknown as SVGSVGElement).createSVGPoint();
    point.x = e.clientX - canvasRect.left;
    point.y = e.clientY - canvasRect.top;
    let { x, y } = point.matrixTransform(CTM);

    x = (x - canvasView.pan.x) / canvasView.scale;
    y = (y - canvasView.pan.y) / canvasView.scale;
    
    const addProp = (propShape: Omit<PolygonShape, 'id'>) => {
        addShape({ id: nanoid(), ...propShape });
    }

    if (propType === 'star') {
        addProp({
            name: 'Star',
            type: 'polygon',
            x: x - 50, y: y - 50, width: 100, height: 100, rotation: 0,
            fill: '#FFD700', opacity: 1, strokeWidth: 0,
            points: "50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"
        });
    } else if (propType === 'heart') {
        addProp({
            name: 'Heart',
            type: 'polygon',
            x: x - 50, y: y - 50, width: 100, height: 90, rotation: 0,
            fill: '#E31B23', opacity: 1, strokeWidth: 0,
            points: "50,90 20,60 0,35 15,10 40,0 50,15 60,0 85,10 100,35 80,60"
        });
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

  return (
    <div className="flex flex-col h-screen bg-muted/40 font-sans" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <AppHeader onExport={handleExport} canvasView={canvasView} onViewChange={handleViewChange} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} onBooleanOperation={applyBooleanOperation} disabled={selectedShapes.length < 2} />
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

'use client';

import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { AppHeader } from '@/components/header';
import { Toolbar } from '@/components/toolbar';
import { Canvas } from '@/components/canvas';
import { PropertiesPanel } from '@/components/properties-panel';
import { type Shape, type Tool, type InteractionState, PolygonShape } from '@/lib/types';
import { exportToSvg, exportToJpeg } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

type EditorState = {
  shapes: Shape[];
  selectedShapeIds: string[];
};

type Action =
  | { type: 'ADD_SHAPE'; payload: Shape }
  | { type: 'UPDATE_SHAPES'; payload: Shape[] }
  | { type: 'DELETE_SHAPES'; payload: string[] }
  | { type: 'SET_SELECTED_SHAPES'; payload: string[] }
  | { type: 'APPLY_BOOLEAN'; payload: { operation: string; shapes: Shape[] } };

function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'ADD_SHAPE':
      return { ...state, shapes: [...state.shapes, action.payload] };
    case 'UPDATE_SHAPES':
        return {
            ...state,
            shapes: state.shapes.map(s => {
                const updated = action.payload.find(us => us.id === s.id);
                return updated ? updated : s;
            }),
        };
    case 'DELETE_SHAPES':
      return {
        ...state,
        shapes: state.shapes.filter(s => !action.payload.includes(s.id)),
        selectedShapeIds: state.selectedShapeIds.filter(id => !action.payload.includes(id)),
      };
    case 'SET_SELECTED_SHAPES':
      return { ...state, selectedShapeIds: action.payload };
    case 'APPLY_BOOLEAN': {
      const { shapes, operation } = action.payload;
      const otherShapes = state.shapes.filter(s => !shapes.map(ss => ss.id).includes(s.id));
      // Placeholder logic for boolean ops.
      if (shapes.length < 2) return state;
      const [shape1] = shapes;
      
      return {
        ...state,
        shapes: [...otherShapes, shape1],
        selectedShapeIds: [shape1.id],
      }
    }
    default:
      return state;
  }
}


const initialState: EditorState = {
  shapes: [],
  selectedShapeIds: [],
};

export function VectorEditor() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [interactionState, setInteractionState] = useState<InteractionState>({ type: 'none' });
  const { toast } = useToast();

  const handleExport = (format: 'svg' | 'jpeg') => {
    const canvasEl = document.getElementById('vector-canvas');
    if (!canvasEl) return;
    const { width, height } = canvasEl.getBoundingClientRect();

    if (format === 'svg') {
      exportToSvg(state.shapes, width, height);
    } else {
      exportToJpeg(state.shapes, width, height);
    }
  };
  
  const addShape = (shape: Shape) => dispatch({ type: 'ADD_SHAPE', payload: shape });
  
  const updateShapes = (updatedShapes: Shape[]) => dispatch({ type: 'UPDATE_SHAPES', payload: updatedShapes });

  const deleteSelectedShapes = useCallback(() => {
    if (state.selectedShapeIds.length > 0) {
      dispatch({ type: 'DELETE_SHAPES', payload: state.selectedShapeIds });
    }
  }, [state.selectedShapeIds]);

  const setSelectedShapeIds = (ids: string[]) => dispatch({ type: 'SET_SELECTED_SHAPES', payload: ids });

  const applyBooleanOperation = (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => {
    if (state.selectedShapeIds.length < 2) {
      toast({
        title: "Selection Error",
        description: "Please select at least two shapes to perform a boolean operation.",
        variant: "destructive",
      });
      return;
    }
    const selectedShapes = state.shapes.filter(s => state.selectedShapeIds.includes(s.id));
    // Placeholder logic for boolean operation
    dispatch({ type: 'APPLY_BOOLEAN', payload: { operation, shapes: selectedShapes } });
    toast({
      title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Applied`,
      description: "This is a placeholder for a real boolean operation.",
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const propType = e.dataTransfer.getData("application/vectormate-prop");
    const canvasEl = document.getElementById('vector-canvas');
    if (!canvasEl) return;

    const canvasRect = canvasEl.getBoundingClientRect();
    const CTM = (canvasEl as unknown as SVGSVGElement).getScreenCTM();

    let x = e.clientX - canvasRect.left;
    let y = e.clientY - canvasRect.top;

    if (CTM) {
        x = (e.clientX - CTM.e) / CTM.a;
        y = (e.clientY - CTM.f) / CTM.d;
    }
    
    const addProp = (propShape: Omit<PolygonShape, 'id'>) => {
        addShape({ id: nanoid(), ...propShape });
    }

    if (propType === 'star') {
        addProp({
            type: 'polygon',
            x: x - 50, y: y - 50, width: 100, height: 100, rotation: 0,
            fill: '#FFD700', opacity: 1,
            points: "50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"
        });
    } else if (propType === 'heart') {
        addProp({
            type: 'polygon',
            x: x - 50, y: y - 50, width: 100, height: 90, rotation: 0,
            fill: '#E31B23', opacity: 1,
            points: "50,90 20,60 0,35 15,10 40,0 50,15 60,0 85,10 100,35 80,60"
        });
    }
  };

  const selectedShapes = state.shapes.filter(s => state.selectedShapeIds.includes(s.id));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) {
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete')) {
        deleteSelectedShapes();
      } else if (e.key === 'Escape') {
        setSelectedShapeIds([]);
        setActiveTool('select');
        setInteractionState({ type: 'none' });
      } else {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'o': setActiveTool('circle'); break;
          case 'p': setActiveTool('polygon'); break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedShapes]);

  return (
    <div className="flex flex-col h-screen bg-muted/40 font-sans" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <AppHeader onExport={handleExport} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar activeTool={activeTool} onToolSelect={setActiveTool} onBooleanOperation={applyBooleanOperation} disabled={selectedShapes.length < 2} />
        <main className="flex-1 relative bg-background shadow-inner">
          <Canvas
            shapes={state.shapes}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            selectedShapeIds={state.selectedShapeIds}
            setSelectedShapeIds={setSelectedShapeIds}
            addShape={addShape}
            updateShapes={updateShapes}
            interactionState={interactionState}
            setInteractionState={setInteractionState}
          />
        </main>
        <PropertiesPanel
          selectedShapes={selectedShapes}
          onShapesUpdate={updateShapes}
          onDelete={deleteSelectedShapes}
        />
      </div>
    </div>
  );
}

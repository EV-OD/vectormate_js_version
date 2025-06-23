'use client';

import { useReducer, useCallback } from 'react';
import { type Shape } from '@/lib/types';
import { useToast } from './use-toast';
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
  | { type: 'APPLY_BOOLEAN'; payload: { operation: string; shapes: Shape[] } }
  | { type: 'BRING_TO_FRONT'; payload: string[] }
  | { type: 'SEND_TO_BACK'; payload: string[] }
  | { type: 'DUPLICATE_SHAPES'; payload: string[] }
  | { type: 'REORDER_SHAPES'; payload: { fromId: string; toId: string } };

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
      const { shapes } = action.payload;
      const otherShapes = state.shapes.filter(s => !shapes.map(ss => ss.id).includes(s.id));
      if (shapes.length < 2) return state;
      const [shape1] = shapes;
      
      return {
        ...state,
        shapes: [...otherShapes, shape1],
        selectedShapeIds: [shape1.id],
      }
    }
    case 'BRING_TO_FRONT': {
      const toMove = state.shapes.filter(s => action.payload.includes(s.id));
      const others = state.shapes.filter(s => !action.payload.includes(s.id));
      return { ...state, shapes: [...others, ...toMove] };
    }
    case 'SEND_TO_BACK': {
      const toMove = state.shapes.filter(s => action.payload.includes(s.id));
      const others = state.shapes.filter(s => !action.payload.includes(s.id));
      return { ...state, shapes: [...toMove, ...others] };
    }
    case 'DUPLICATE_SHAPES': {
      const shapesToDuplicate = state.shapes.filter(s => action.payload.includes(s.id));
      if (shapesToDuplicate.length === 0) return state;

      const newShapes = shapesToDuplicate.map(shape => ({
        ...shape,
        id: nanoid(),
        x: shape.x + 10,
        y: shape.y + 10,
      }));

      return {
        ...state,
        shapes: [...state.shapes, ...newShapes],
        selectedShapeIds: newShapes.map(s => s.id),
      };
    }
    case 'REORDER_SHAPES': {
      const { fromId, toId } = action.payload;
      const shapes = [...state.shapes];
      const fromIndex = shapes.findIndex(s => s.id === fromId);
      const toIndex = shapes.findIndex(s => s.id === toId);

      if (fromIndex === -1 || toIndex === -1) return state;
      
      const [movedItem] = shapes.splice(fromIndex, 1);
      shapes.splice(toIndex, 0, movedItem);

      return { ...state, shapes };
    }
    default:
      return state;
  }
}

const initialState: EditorState = {
  shapes: [],
  selectedShapeIds: [],
};


export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { toast } = useToast();

  const addShape = useCallback((shape: Shape) => dispatch({ type: 'ADD_SHAPE', payload: shape }), []);
  const updateShapes = useCallback((updatedShapes: Shape[]) => dispatch({ type: 'UPDATE_SHAPES', payload: updatedShapes }), []);
  const setSelectedShapeIds = useCallback((ids: string[]) => dispatch({ type: 'SET_SELECTED_SHAPES', payload: ids }), []);
  const deleteShapesByIds = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      dispatch({ type: 'DELETE_SHAPES', payload: ids });
    }
  }, []);

  const bringToFront = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          dispatch({ type: 'BRING_TO_FRONT', payload: ids });
      }
  }, []);

  const sendToBack = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          dispatch({ type: 'SEND_TO_BACK', payload: ids });
      }
  }, []);
  
  const duplicateShapes = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      dispatch({ type: 'DUPLICATE_SHAPES', payload: ids });
    }
  }, []);
  
  const reorderShapes = useCallback((fromId: string, toId: string) => {
    dispatch({ type: 'REORDER_SHAPES', payload: { fromId, toId } });
  }, []);

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
    dispatch({ type: 'APPLY_BOOLEAN', payload: { operation, shapes: selectedShapes } });
    toast({
      title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Applied`,
      description: "This is a placeholder for a real boolean operation.",
    });
  };
  
  return {
    shapes: state.shapes,
    selectedShapeIds: state.selectedShapeIds,
    addShape,
    updateShapes,
    setSelectedShapeIds,
    deleteShapesByIds,
    bringToFront,
    sendToBack,
    applyBooleanOperation,
    duplicateShapes,
    reorderShapes
  };
}

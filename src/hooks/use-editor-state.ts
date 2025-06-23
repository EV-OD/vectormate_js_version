'use client';

import { useReducer, useCallback } from 'react';
import { type Shape } from '@/lib/types';
import { useToast } from './use-toast';
import { nanoid } from 'nanoid';

const HISTORY_LIMIT = 20;

type HistoryData = {
  shapes: Shape[];
  selectedShapeIds: string[];
};

type EditorState = {
  past: HistoryData[];
  present: HistoryData;
  future: HistoryData[];
};

type Action =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_SHAPE'; payload: Shape }
  | { type: 'UPDATE_SHAPES'; payload: Shape[] }
  | { type: 'DELETE_SHAPES'; payload: string[] }
  | { type: 'SET_SELECTED_SHAPES'; payload: string[] }
  | { type: 'APPLY_BOOLEAN'; payload: { operation: string; shapes: Shape[] } }
  | { type: 'BRING_TO_FRONT'; payload: string[] }
  | { type: 'SEND_TO_BACK'; payload: string[] }
  | { type: 'DUPLICATE_SHAPES'; payload: string[] }
  | { type: 'REORDER_SHAPES'; payload: { fromId: string; toId: string; position: 'top' | 'bottom' } }
  | { type: 'RENAME_SHAPE'; payload: { id: string; name: string } };

const initialState: EditorState = {
  past: [],
  present: {
    shapes: [],
    selectedShapeIds: [],
  },
  future: [],
};

function editorReducer(state: EditorState, action: Action): EditorState {
  const { past, present, future } = state;

  switch (action.type) {
    case 'SET_SELECTED_SHAPES':
      return {
        ...state,
        present: { ...present, selectedShapeIds: action.payload },
      };
    case 'UNDO': {
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    }
    case 'REDO': {
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    }
  }

  const newPresent = ((): HistoryData => {
    switch (action.type) {
      case 'ADD_SHAPE': {
        const shape = action.payload;
        if (!shape.name) {
          shape.name = shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
        }
        return { ...present, shapes: [...present.shapes, shape], selectedShapeIds: [shape.id] };
      }
      case 'UPDATE_SHAPES':
        return {
          ...present,
          shapes: present.shapes.map(s => {
            const updated = action.payload.find(us => us.id === s.id);
            return updated ? updated : s;
          }),
        };
      case 'DELETE_SHAPES':
        return {
          shapes: present.shapes.filter(s => !action.payload.includes(s.id)),
          selectedShapeIds: [],
        };
      case 'APPLY_BOOLEAN': {
        const { shapes } = action.payload;
        const otherShapes = present.shapes.filter(s => !shapes.map(ss => ss.id).includes(s.id));
        if (shapes.length < 2) return present;
        const [shape1] = shapes;
        return {
          shapes: [...otherShapes, shape1],
          selectedShapeIds: [shape1.id],
        };
      }
      case 'BRING_TO_FRONT': {
        const toMove = present.shapes.filter(s => action.payload.includes(s.id));
        const others = present.shapes.filter(s => !action.payload.includes(s.id));
        return { ...present, shapes: [...others, ...toMove] };
      }
      case 'SEND_TO_BACK': {
        const toMove = present.shapes.filter(s => action.payload.includes(s.id));
        const others = present.shapes.filter(s => !action.payload.includes(s.id));
        return { ...present, shapes: [...toMove, ...others] };
      }
      case 'DUPLICATE_SHAPES': {
        const shapesToDuplicate = present.shapes.filter(s => action.payload.includes(s.id));
        if (shapesToDuplicate.length === 0) return present;
        const newShapes = shapesToDuplicate.map(shape => ({
          ...shape,
          id: nanoid(),
          name: `${shape.name || shape.type} copy`,
          x: shape.x + 10,
          y: shape.y + 10,
        }));
        return {
          shapes: [...present.shapes, ...newShapes],
          selectedShapeIds: newShapes.map(s => s.id),
        };
      }
      case 'REORDER_SHAPES': {
        const { fromId, toId, position } = action.payload;
        const reversedShapes = [...present.shapes].reverse();
        const fromIndex = reversedShapes.findIndex(s => s.id === fromId);
        let toIndex = reversedShapes.findIndex(s => s.id === toId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return present;
        const [movedItem] = reversedShapes.splice(fromIndex, 1);
        if (fromIndex < toIndex) { toIndex--; }
        if (position === 'top') {
          reversedShapes.splice(toIndex, 0, movedItem);
        } else {
          reversedShapes.splice(toIndex + 1, 0, movedItem);
        }
        return { ...present, shapes: reversedShapes.reverse() };
      }
      case 'RENAME_SHAPE':
        return {
          ...present,
          shapes: present.shapes.map(s =>
            s.id === action.payload.id
              ? { ...s, name: action.payload.name }
              : s
          ),
        };
      default:
        return present;
    }
  })();

  if (newPresent === present) {
    return state;
  }
  
  const newPast = [...past, present].slice(-HISTORY_LIMIT);
  
  return {
    past: newPast,
    present: newPresent,
    future: [],
  };
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { toast } = useToast();

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => { if (canUndo) { dispatch({ type: 'UNDO' }) } }, [canUndo]);
  const redo = useCallback(() => { if (canRedo) { dispatch({ type: 'REDO' }) } }, [canRedo]);

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
  
  const reorderShapes = useCallback((fromId: string, toId: string, position: 'top' | 'bottom') => {
    dispatch({ type: 'REORDER_SHAPES', payload: { fromId, toId, position } });
  }, []);
  
  const renameShape = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME_SHAPE', payload: { id, name } });
  }, []);

  const applyBooleanOperation = (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => {
    if (state.present.selectedShapeIds.length < 2) {
      toast({
        title: "Selection Error",
        description: "Please select at least two shapes to perform a boolean operation.",
        variant: "destructive",
      });
      return;
    }
    const selectedShapes = state.present.shapes.filter(s => state.present.selectedShapeIds.includes(s.id));
    dispatch({ type: 'APPLY_BOOLEAN', payload: { operation, shapes: selectedShapes } });
    toast({
      title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Applied`,
      description: "This is a placeholder for a real boolean operation.",
    });
  };
  
  return {
    shapes: state.present.shapes,
    selectedShapeIds: state.present.selectedShapeIds,
    addShape,
    updateShapes,
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
  };
}


'use client';

import { useReducer, useCallback } from 'react';
import { type Shape, PolygonShape } from '@/lib/types';
import { useToast } from './use-toast';
import { nanoid } from 'nanoid';
import { union, subtract, intersect, exclude } from '@/lib/boolean-operations';

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
  | { type: 'SET_STATE'; payload: { data: HistoryData, commit: boolean } }
  | { type: 'COMMIT' };


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
    case 'SET_STATE': {
      const { data, commit } = action.payload;
      if (!commit) {
        return { ...state, present: data };
      }
      
      if (past.length > 0 && JSON.stringify(past[past.length - 1]) === JSON.stringify(data)) {
        return { ...state, present: data };
      }

      const newPast = [...past, present].slice(-HISTORY_LIMIT);
      return {
        past: newPast,
        present: data,
        future: [],
      };
    }
    case 'COMMIT': {
      if (past.length > 0 && JSON.stringify(past[past.length - 1]) === JSON.stringify(present)) {
        return state;
      }
      const newPast = [...past, present].slice(-HISTORY_LIMIT);
      return {
        past: newPast,
        present: present,
        future: [],
      };
    }
    default:
      return state;
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { toast } = useToast();

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => { if (canUndo) { dispatch({ type: 'UNDO' }) } }, [canUndo]);
  const redo = useCallback(() => { if (canRedo) { dispatch({ type: 'REDO' }) } }, [canRedo]);
  
  const commit = useCallback(() => dispatch({ type: 'COMMIT' }), []);
  
  const setState = useCallback((data: Partial<HistoryData>, commit: boolean) => {
    const newState = { ...state.present, ...data };
    dispatch({ type: 'SET_STATE', payload: { data: newState, commit } });
  }, [state.present]);

  const addShape = useCallback((shape: Shape) => {
    const newShape = { ...shape };
    if (!newShape.name) {
      newShape.name = newShape.type.charAt(0).toUpperCase() + newShape.type.slice(1);
    }
    setState({
      shapes: [...state.present.shapes, newShape],
      selectedShapeIds: [newShape.id],
    }, true);
  }, [state.present.shapes, setState]);

  const updateShapes = useCallback((updatedShapes: Shape[]) => {
    setState({ shapes: state.present.shapes.map(s => {
        const updated = updatedShapes.find(us => us.id === s.id);
        return updated ? updated : s;
      }) 
    }, false);
  }, [state.present.shapes, setState]);

  const setSelectedShapeIds = useCallback((ids: string[]) => {
    setState({ selectedShapeIds: ids }, false);
  }, [setState]);

  const deleteShapesByIds = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      setState({
        shapes: state.present.shapes.filter(s => !ids.includes(s.id)),
        selectedShapeIds: [],
      }, true);
    }
  }, [state.present.shapes, setState]);
  
  const bringToFront = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          const toMove = state.present.shapes.filter(s => ids.includes(s.id));
          const others = state.present.shapes.filter(s => !ids.includes(s.id));
          setState({ shapes: [...others, ...toMove] }, true);
      }
  }, [state.present.shapes, setState]);

  const sendToBack = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          const toMove = state.present.shapes.filter(s => ids.includes(s.id));
          const others = state.present.shapes.filter(s => !ids.includes(s.id));
          setState({ shapes: [...toMove, ...others] }, true);
      }
  }, [state.present.shapes, setState]);
  
  const duplicateShapes = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      const shapesToDuplicate = state.present.shapes.filter(s => ids.includes(s.id));
      if (shapesToDuplicate.length === 0) return;
      const newShapes = shapesToDuplicate.map(shape => ({
        ...shape,
        id: nanoid(),
        name: `${shape.name || shape.type} copy`,
        x: shape.x + 10,
        y: shape.y + 10,
      }));
      setState({
        shapes: [...state.present.shapes, ...newShapes],
        selectedShapeIds: newShapes.map(s => s.id),
      }, true);
    }
  }, [state.present.shapes, setState]);
  
  const reorderShapes = useCallback((fromId: string, toId: string, position: 'top' | 'bottom') => {
    const reversedShapes = [...state.present.shapes].reverse();
    const fromIndex = reversedShapes.findIndex(s => s.id === fromId);
    let toIndex = reversedShapes.findIndex(s => s.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [movedItem] = reversedShapes.splice(fromIndex, 1);
    if (fromIndex < toIndex) { toIndex--; }
    if (position === 'top') {
      reversedShapes.splice(toIndex, 0, movedItem);
    } else {
      reversedShapes.splice(toIndex + 1, 0, movedItem);
    }
    setState({ shapes: reversedShapes.reverse() }, true);
  }, [state.present.shapes, setState]);
  
  const renameShape = useCallback((id: string, name: string) => {
    setState({
      shapes: state.present.shapes.map(s =>
        s.id === id ? { ...s, name: name } : s
      ),
    }, true);
  }, [state.present.shapes, setState]);

  const applyBooleanOperation = (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => {
    if (state.present.selectedShapeIds.length < 2) {
      toast({
        title: "Selection Error",
        description: "Please select at least two shapes for a boolean operation.",
        variant: "destructive",
      });
      return;
    }

    const selectedShapes = state.present.shapes.filter(s => state.present.selectedShapeIds.includes(s.id));
    const compatibleShapes = selectedShapes.filter(s => s.type !== 'line');
    
    if (compatibleShapes.length < 2) {
        toast({
            title: "Compatibility Error",
            description: "Boolean operations require at least two compatible shapes (rectangles, circles, or polygons).",
            variant: "destructive",
        });
        return;
    }

    // Operations are performed on the two bottom-most (in z-order) selected shapes.
    // For subtract, shape2 (the one higher in the stack) will cut shape1.
    const [shape1, shape2] = compatibleShapes;

    let newShape: PolygonShape | null = null;
    switch (operation) {
        case 'union':
            newShape = union(shape1, shape2);
            break;
        case 'subtract':
            newShape = subtract(shape1, shape2);
            break;
        case 'intersect':
            newShape = intersect(shape1, shape2);
            break;
        case 'exclude':
            newShape = exclude(shape1, shape2);
            break;
    }
    
    if (newShape) {
        const idsToRemove = [shape1.id, shape2.id];
        const otherShapes = state.present.shapes.filter(s => !idsToRemove.includes(s.id));

        setState({
            shapes: [...otherShapes, newShape],
            selectedShapeIds: [newShape.id],
        }, true);

        toast({
            title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Applied`,
            description: "Shapes were successfully combined.",
        });
    } else {
         toast({
            title: "Operation Failed",
            description: "The boolean operation could not be completed. Make sure shapes are overlapping.",
            variant: "destructive"
        });
    }
  };
  
  return {
    shapes: state.present.shapes,
    selectedShapeIds: state.present.selectedShapeIds,
    addShape,
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
  };
}

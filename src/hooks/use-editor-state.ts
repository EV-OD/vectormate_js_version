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
  | { type: 'SET_STATE'; payload: { updater: (current: HistoryData) => Partial<HistoryData>, commit: boolean } }
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
      const { updater, commit } = action.payload;
      const newPresent = { ...present, ...updater(present) };

      if (!commit) {
        return { ...state, present: newPresent };
      }
      
      const pastDataToCompare = past.length > 0 ? past[past.length - 1] : null;
      if (pastDataToCompare && JSON.stringify(pastDataToCompare) === JSON.stringify(newPresent)) {
        return { ...state, present: newPresent };
      }

      const newPast = [...past, present].slice(-HISTORY_LIMIT);
      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    }
    case 'COMMIT': {
      const pastDataToCompare = past.length > 0 ? past[past.length - 1] : null;
      if (pastDataToCompare && JSON.stringify(pastDataToCompare) === JSON.stringify(present)) {
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
  
  const setState = useCallback((updater: (current: HistoryData) => Partial<HistoryData>, commit: boolean) => {
    dispatch({ type: 'SET_STATE', payload: { updater, commit } });
  }, []);

  const addShape = useCallback((shape: Shape, commit: boolean = true) => {
    const newShape = { ...shape };
    if (!newShape.name) {
      newShape.name = newShape.type.charAt(0).toUpperCase() + newShape.type.slice(1);
    }
    setState(current => ({
      shapes: [...current.shapes, newShape],
      selectedShapeIds: [newShape.id],
    }), commit);
  }, [setState]);

  const addShapes = useCallback((shapes: Shape[]) => {
    if (shapes.length === 0) return;
    const newShapesWithDefaults = shapes.map(s => ({
        ...s,
        name: s.name || (s.type.charAt(0).toUpperCase() + s.type.slice(1))
    }));
    setState(current => ({
        shapes: [...current.shapes, ...newShapesWithDefaults],
        selectedShapeIds: newShapesWithDefaults.map(s => s.id)
    }), true);
  }, [setState]);

  const updateShapes = useCallback((updatedShapes: Shape[]) => {
    setState(current => ({ 
        shapes: current.shapes.map(s => {
            const updated = updatedShapes.find(us => us.id === s.id);
            return updated ? updated : s;
        }) 
    }), false);
  }, [setState]);

  const setSelectedShapeIds = useCallback((ids: string[] | ((currentIds: string[]) => string[])) => {
    setState(current => ({ 
        selectedShapeIds: typeof ids === 'function' ? ids(current.selectedShapeIds) : ids
    }), false);
  }, [setState]);

  const deleteShapesByIds = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      setState(current => {
        let allIdsToDelete = [...ids];
        const groupIdsToDelete = new Set<string>();

        ids.forEach(id => {
            const shape = current.shapes.find(s => s.id === id);
            if (shape?.groupId) {
                groupIdsToDelete.add(shape.groupId);
            }
        });

        groupIdsToDelete.forEach(groupId => {
            current.shapes.forEach(shape => {
                if (shape.groupId === groupId) {
                    allIdsToDelete.push(shape.id);
                }
            });
        });
        
        const uniqueIdsToDelete = [...new Set(allIdsToDelete)];

        const shapesToDelete = current.shapes.filter(s => uniqueIdsToDelete.includes(s.id));
        const maskIdsToDelete = new Set(shapesToDelete.filter(s => s.isClippingMask).map(s => s.id));

        const newShapes = current.shapes
            .filter(s => !uniqueIdsToDelete.includes(s.id))
            .map(s => {
                if (s.clippedBy && maskIdsToDelete.has(s.clippedBy)) {
                    const { clippedBy, ...rest } = s;
                    return rest as Shape;
                }
                return s;
            });

        return {
            shapes: newShapes,
            selectedShapeIds: [],
        };
      }, true);
    }
  }, [setState]);
  
  const bringToFront = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          setState(current => {
            const toMove = current.shapes.filter(s => ids.includes(s.id));
            const others = current.shapes.filter(s => !ids.includes(s.id));
            return { shapes: [...others, ...toMove] };
          }, true);
      }
  }, [setState]);

  const sendToBack = useCallback((ids: string[]) => {
      if (ids.length > 0) {
          setState(current => {
            const toMove = current.shapes.filter(s => ids.includes(s.id));
            const others = current.shapes.filter(s => !ids.includes(s.id));
            return { shapes: [...toMove, ...others] };
          }, true);
      }
  }, [setState]);
  
  const duplicateShapes = useCallback((ids: string[]) => {
    if (ids.length > 0) {
        setState(current => {
            const shapesToDuplicate = current.shapes.filter(s => ids.includes(s.id));
            if (shapesToDuplicate.length === 0) return {};
            const newShapes = shapesToDuplicate.map(shape => ({
                ...shape,
                id: nanoid(),
                name: `${shape.name || shape.type} copy`,
                x: shape.x + 10,
                y: shape.y + 10,
            }));
            return {
                shapes: [...current.shapes, ...newShapes],
                selectedShapeIds: newShapes.map(s => s.id),
            };
        }, true);
    }
  }, [setState]);
  
  const reorderShapes = useCallback((fromId: string, toId: string, position: 'top' | 'bottom') => {
    setState(current => {
        const fromShape = current.shapes.find(s => s.id === fromId);
        if (fromShape?.groupId) {
             toast({ title: "Reorder Info", description: "Cannot reorder part of a clipping group.", variant: "default" });
            return {};
        }

        const reversedShapes = [...current.shapes].reverse();
        const fromIndex = reversedShapes.findIndex(s => s.id === fromId);
        let toIndex = reversedShapes.findIndex(s => s.id === toId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return {};
        
        const [movedItem] = reversedShapes.splice(fromIndex, 1);
        if (fromIndex < toIndex) { toIndex--; }
        
        if (position === 'top') {
            reversedShapes.splice(toIndex, 0, movedItem);
        } else {
            reversedShapes.splice(toIndex + 1, 0, movedItem);
        }
        return { shapes: reversedShapes.reverse() };
    }, true);
  }, [setState, toast]);
  
  const renameShape = useCallback((id: string, name: string) => {
    setState(current => ({
      shapes: current.shapes.map(s =>
        s.id === id ? { ...s, name: name } : s
      ),
    }), true);
  }, [setState]);

  const applyBooleanOperation = useCallback(async (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => {
    const { shapes, selectedShapeIds } = state.present;
    if (selectedShapeIds.length < 2) {
        toast({
            title: "Selection Error",
            description: "Please select at least two shapes for a boolean operation.",
            variant: "destructive",
        });
        return;
    }

    const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
    const compatibleShapes = selectedShapes.filter(s => !['line', 'image', 'svg', 'path', 'text'].includes(s.type));
    
    if (compatibleShapes.length < 2) {
        toast({
            title: "Compatibility Error",
            description: "Boolean operations require at least two compatible shapes (rectangles, circles, or polygons).",
            variant: "destructive",
        });
        return;
    }

    const [shape1, shape2] = compatibleShapes;

    let newShape: PolygonShape | null = null;
    switch (operation) {
        case 'union':
            newShape = await union(shape1, shape2);
            break;
        case 'subtract':
            newShape = await subtract(shape1, shape2);
            break;
        case 'intersect':
            newShape = await intersect(shape1, shape2);
            break;
        case 'exclude':
            newShape = await exclude(shape1, shape2);
            break;
    }
    
    if (newShape) {
        const idsToRemove = [shape1.id, shape2.id];
        
        setState(current => ({
            shapes: [...current.shapes.filter(s => !idsToRemove.includes(s.id)), newShape],
            selectedShapeIds: [newShape.id],
        }), true);

        toast({
            title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Applied`,
            description: "Shapes were successfully combined.",
        });

    } else {
         toast({
            title: "Operation Failed",
            description: "The boolean operation could not be completed. This is expected until the C++/WASM module is integrated.",
            variant: "destructive"
        });
    }
  }, [state.present, setState, toast]);

  const createClippingMask = useCallback(() => {
    setState(current => {
        if (current.selectedShapeIds.length !== 2) {
            toast({ title: "Selection Error", description: "Please select exactly two shapes.", variant: "destructive" });
            return current;
        }

        const indices = current.selectedShapeIds.map(id => current.shapes.findIndex(s => s.id === id));
        const topIndex = Math.max(...indices);
        const bottomIndex = Math.min(...indices);

        const maskShape = current.shapes[topIndex];
        const contentShape = current.shapes[bottomIndex];

        if (maskShape.isClippingMask || contentShape.clippedBy || maskShape.groupId || contentShape.groupId) {
            toast({ title: "Invalid Operation", description: "Cannot clip a mask, an already clipped shape, or a shape in a group.", variant: "destructive" });
            return current;
        }
        
        const groupId = nanoid();

        const updatedMask = {
            ...maskShape,
            isClippingMask: true,
            fill: 'none',
            stroke: 'hsl(var(--accent))',
            strokeWidth: 1,
            strokeDasharray: '4 4',
            opacity: 1,
            groupId,
        };

        const updatedContent = {
            ...contentShape,
            clippedBy: maskShape.id,
            groupId,
        };

        const newShapes = current.shapes.map(s => {
            if (s.id === maskShape.id) return updatedMask;
            if (s.id === contentShape.id) return updatedContent;
            return s;
        });

        return {
            shapes: newShapes,
            selectedShapeIds: [contentShape.id, maskShape.id],
        };
    }, true);
  }, [setState, toast]);

  const releaseClippingMask = useCallback((shapeId: string) => {
    setState(current => {
        const shape = current.shapes.find(s => s.id === shapeId);
        if (!shape || !shape.groupId) return current;

        const groupShapes = current.shapes.filter(s => s.groupId === shape.groupId);
        const maskShape = groupShapes.find(s => s.isClippingMask);
        
        const newShapes = current.shapes.map(s => {
            if (s.groupId === shape.groupId) {
                const { groupId, isClippingMask, clippedBy, strokeDasharray, ...rest } = s;
                if(maskShape && s.id === maskShape.id) {
                    return { ...rest, fill: maskShape.fill || '#cccccc', stroke: maskShape.stroke || 'none', strokeWidth: maskShape.strokeWidth || 0 } as Shape;
                }
                return rest as Shape;
            }
            return s;
        });
        
        const groupShapeIds = groupShapes.map(s => s.id);

        return {
            shapes: newShapes,
            selectedShapeIds: groupShapeIds,
        };
    }, true);
  }, [setState]);
  
  return {
    shapes: state.present.shapes,
    selectedShapeIds: state.present.selectedShapeIds,
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
  };
}

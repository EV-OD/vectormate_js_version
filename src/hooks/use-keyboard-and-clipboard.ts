'use client';
import { useEffect, useState, useCallback } from 'react';
import { type Shape, type Tool, type InteractionState } from '@/lib/types';
import { nanoid } from 'nanoid';
import { useToast } from './use-toast';

type useKeyboardAndClipboardProps = {
    selectedShapes: Shape[];
    canvasViewScale: number;
    addShape: (shape: Shape) => void;
    setSelectedShapeIds: (ids: string[]) => void;
    deleteSelectedShapes: () => void;
    setActiveTool: (tool: Tool) => void;
    setInteractionState: (state: InteractionState) => void;
    undo: () => void;
    redo: () => void;
}

export function useKeyboardAndClipboard({
  selectedShapes,
  canvasViewScale,
  addShape,
  setSelectedShapeIds,
  deleteSelectedShapes,
  setActiveTool,
  setInteractionState,
  undo,
  redo,
}: useKeyboardAndClipboardProps) {
    const [clipboard, setClipboard] = useState<Shape[]>([]);
    const { toast } = useToast();

    const handleCopy = useCallback(() => {
        if (selectedShapes.length > 0) {
            setClipboard(selectedShapes);
            toast({ title: `${selectedShapes.length} item(s) copied to clipboard.` });
        }
    }, [selectedShapes, toast]);
  
    const handlePaste = useCallback(() => {
        if (clipboard.length > 0) {
            const newShapes = clipboard.map(shape => ({
                ...shape,
                id: nanoid(),
                x: shape.x + 10 / canvasViewScale,
                y: shape.y + 10 / canvasViewScale,
            }));
            newShapes.forEach(addShape);
            setSelectedShapeIds(newShapes.map(s => s.id));
            setClipboard(newShapes);
        }
    }, [clipboard, addShape, setSelectedShapeIds, canvasViewScale]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) {
          return;
        }
        
        if (e.metaKey || e.ctrlKey) {
          if (e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            redo();
            return;
          }
          
          switch(e.key.toLowerCase()) {
            case 'c':
              e.preventDefault();
              handleCopy();
              return;
            case 'v':
              e.preventDefault();
              handlePaste();
              return;
            case 'z':
              e.preventDefault();
              undo();
              return;
            case 'y':
              e.preventDefault();
              redo();
              return;
          }
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
            case 'l': setActiveTool('line'); break;
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedShapes, handleCopy, handlePaste, setSelectedShapeIds, setActiveTool, setInteractionState, undo, redo]);
    
    return {
        clipboard,
        handleCopy,
        handlePaste
    };
}

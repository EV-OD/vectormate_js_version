'use client';
import { useEffect, useState, useCallback } from 'react';
import { type Shape, type Tool, type InteractionState, type CanvasView, ImageShape } from '@/lib/types';
import { nanoid } from 'nanoid';
import { useToast } from './use-toast';

type useKeyboardAndClipboardProps = {
    selectedShapes: Shape[];
    canvasView: CanvasView;
    addShapes: (shapes: Shape[]) => void;
    deleteSelectedShapes: () => void;
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    setInteractionState: (state: InteractionState) => void;
    undo: () => void;
    redo: () => void;
}

export function useKeyboardAndClipboard({
  selectedShapes,
  canvasView,
  addShapes,
  deleteSelectedShapes,
  activeTool,
  setActiveTool,
  setInteractionState,
  undo,
  redo,
}: useKeyboardAndClipboardProps) {
    const [clipboard, setClipboard] = useState<Shape[]>([]);
    const [previousTool, setPreviousTool] = useState<Tool | null>(null);
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
                x: shape.x + 10 / canvasView.scale,
                y: shape.y + 10 / canvasView.scale,
            }));
            addShapes(newShapes);
            setClipboard(newShapes);
        }
    }, [clipboard, addShapes, canvasView.scale]);

    useEffect(() => {
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ' && previousTool) {
          e.preventDefault();
          setActiveTool(previousTool);
          setPreviousTool(null);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) {
          return;
        }

        if (e.key === ' ' && !e.repeat && !previousTool) {
          e.preventDefault();
          setPreviousTool(activeTool);
          setActiveTool('pan');
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
          setActiveTool('select');
          setInteractionState({ type: 'none' });
        } else {
          switch (e.key.toLowerCase()) {
            case 'v': setActiveTool('select'); break;
            case 'r': setActiveTool('rectangle'); break;
            case 'o': setActiveTool('circle'); break;
            case 'p': setActiveTool('polygon'); break;
            case 'l': setActiveTool('line'); break;
            case 'b': setActiveTool('brush'); break;
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (previousTool) {
            setActiveTool(previousTool);
        }
      };
    }, [deleteSelectedShapes, handleCopy, setActiveTool, setInteractionState, undo, redo, activeTool, previousTool]);
    
    useEffect(() => {
      const handlePasteEvent = (event: ClipboardEvent) => {
        if ((event.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) {
          return;
        }
        
        const items = event.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              event.preventDefault();
              
              const reader = new FileReader();
              reader.onload = (readEvent) => {
                  const dataUrl = readEvent.target?.result as string;
                  const img = new window.Image();
                  img.onload = () => {
                      const center = {
                        x: -canvasView.pan.x / canvasView.scale,
                        y: -canvasView.pan.y / canvasView.scale
                      };

                      const newShape: ImageShape = {
                          id: nanoid(),
                          type: 'image',
                          name: 'Pasted Image',
                          href: dataUrl,
                          x: center.x,
                          y: center.y,
                          width: img.naturalWidth,
                          height: img.naturalHeight,
                          rotation: 0,
                          opacity: 1,
                      };
                      addShapes([newShape]);
                  };
                  img.src = dataUrl;
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
        
        if (clipboard.length > 0) {
          event.preventDefault();
          handlePaste();
        }
      };

      window.addEventListener('paste', handlePasteEvent);
      return () => {
        window.removeEventListener('paste', handlePasteEvent);
      }
    }, [clipboard, handlePaste, addShapes, canvasView]);

    return {
        clipboard,
        handleCopy,
        handlePaste
    };
}

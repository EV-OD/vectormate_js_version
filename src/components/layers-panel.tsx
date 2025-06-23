'use client';

import React, { useState } from 'react';
import { type Shape, ShapeType } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { CopyPlus, Trash2, Square, Circle, Hexagon, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type LayersPanelProps = {
  shapes: Shape[];
  selectedShapeIds: string[];
  onSelectShape: (id: string, shiftKey: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (fromId: string, toId: string) => void;
};

const ShapeIcon = ({ type }: { type: ShapeType }) => {
  switch (type) {
    case 'rectangle': return <Square className="w-4 h-4" />;
    case 'circle': return <Circle className="w-4 h-4" />;
    case 'polygon': return <Hexagon className="w-4 h-4" />;
    case 'line': return <Minus className="w-4 h-4" />;
    default: return null;
  }
};

export function LayersPanel({ shapes, selectedShapeIds, onSelectShape, onDelete, onDuplicate, onReorder }: LayersPanelProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== dropTargetId) {
      onReorder(draggedItemId, dropTargetId);
    }
    setDraggedItemId(null);
  };
  
  const reversedShapes = [...shapes].reverse();

  return (
    <div className="h-full flex flex-col bg-card">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {reversedShapes.map((shape) => (
            <div
              key={shape.id}
              onClick={(e) => onSelectShape(shape.id, e.shiftKey)}
              draggable
              onDragStart={(e) => handleDragStart(e, shape.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, shape.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                selectedShapeIds.includes(shape.id) && "bg-secondary",
                draggedItemId === shape.id && "opacity-50"
              )}
            >
              <ShapeIcon type={shape.type} />
              <span className="truncate text-sm">{shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center justify-center p-2 border-t gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onDuplicate}
          disabled={selectedShapeIds.length === 0}
        >
          <CopyPlus className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={selectedShapeIds.length === 0}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

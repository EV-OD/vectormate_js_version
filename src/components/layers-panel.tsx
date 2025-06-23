'use client';

import React, { useState, useMemo } from 'react';
import { type Shape, ShapeType } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { CopyPlus, Trash2, Square, Circle, Hexagon, Minus, Pencil, Type as TypeIcon, Image as ImageIcon, FileCode, Brush, Scissors, Eye, EyeOff, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

type LayerItem = Shape | { isGroup: true; groupId: string; mask: Shape; content: Shape[] };

type LayersPanelProps = {
  shapes: Shape[];
  selectedShapeIds: string[];
  onSelectShape: (id: string, shiftKey: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (fromId: string, toId: string, position: 'top' | 'bottom') => void;
  onRename: (id: string, name: string) => void;
  isolationMode: string | null;
  setIsolationMode: (id: string | null) => void;
  onReleaseMask: (shapeId: string) => void;
};

const ShapeIcon = ({ type }: { type: ShapeType }) => {
  switch (type) {
    case 'rectangle': return <Square className="w-4 h-4" />;
    case 'circle': return <Circle className="w-4 h-4" />;
    case 'polygon': return <Hexagon className="w-4 h-4" />;
    case 'line': return <Minus className="w-4 h-4" />;
    case 'text': return <TypeIcon className="w-4 h-4" />;
    case 'image': return <ImageIcon className="w-4 h-4" />;
    case 'svg': return <FileCode className="w-4 h-4" />;
    case 'path': return <Brush className="w-4 h-4" />;
    default: return <Square className="w-4 h-4" />;
  }
};

const Layer = ({
  item,
  selectedShapeIds,
  onSelectShape,
  editingId,
  handleRenameStart,
  handleDragStart
}: {
  item: Shape;
  selectedShapeIds: string[];
  onSelectShape: (id: string, shiftKey: boolean) => void;
  editingId: string | null;
  handleRenameStart: (shape: Shape) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
}) => {
    return (
        <div
            onClick={(e) => { if (editingId !== item.id) onSelectShape(item.id, e.shiftKey) }}
            draggable={!editingId}
            onDragStart={(e) => handleDragStart(e, item.id)}
            className={cn(
                "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors",
                selectedShapeIds.includes(item.id) && "bg-secondary",
            )}
        >
            <ShapeIcon type={item.type} />
            <span className="truncate text-sm flex-1" onDoubleClick={() => handleRenameStart(item)}>
                {item.name || item.type}
            </span>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation();
                    handleRenameStart(item);
                }}
            >
                <Pencil className="w-3 h-3" />
            </Button>
        </div>
    )
}

export function LayersPanel({ 
  shapes, 
  selectedShapeIds, 
  onSelectShape, 
  onDelete, 
  onDuplicate, 
  onReorder,
  onRename,
  isolationMode,
  setIsolationMode,
  onReleaseMask
}: LayersPanelProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ targetId: string; position: 'top' | 'bottom' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const layerItems = useMemo(() => {
    const items: LayerItem[] = [];
    const processedGroupIds = new Set<string>();

    shapes.forEach(shape => {
        if (shape.groupId && !processedGroupIds.has(shape.groupId)) {
            const groupShapes = shapes.filter(s => s.groupId === shape.groupId);
            const mask = groupShapes.find(s => s.isClippingMask);
            const content = groupShapes.filter(s => !s.isClippingMask);
            if (mask) {
                items.push({ isGroup: true, groupId: shape.groupId, mask, content });
                processedGroupIds.add(shape.groupId);
            }
        } else if (!shape.groupId) {
            items.push(shape);
        }
    });
    return items.reverse();
  }, [shapes]);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (draggedItemId && draggedItemId !== targetId) {
        const rect = e.currentTarget.getBoundingClientRect();
        const position = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
        setDropIndicator({ targetId, position });
    }
  };

  const handleDragLeave = () => {
    setDropIndicator(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItemId && dropIndicator) {
      onReorder(draggedItemId, dropIndicator.targetId, dropIndicator.position);
    }
    setDraggedItemId(null);
    setDropIndicator(null);
  };

  const handleRenameStart = (shape: Shape) => {
    setEditingId(shape.id);
    setEditedName(shape.name || '');
  };

  const handleRenameConfirm = () => {
    if (editingId && editedName.trim()) {
      onRename(editingId, editedName.trim());
    }
    setEditingId(null);
    setEditedName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditedName('');
    }
  };

  const renderItem = (item: LayerItem) => {
    const isGroup = 'isGroup' in item && item.isGroup;
    const itemId = isGroup ? item.mask.id : item.id;
    const isSelected = selectedShapeIds.includes(itemId);

     const itemClasses = cn(
        "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors",
        isSelected && "bg-secondary",
        draggedItemId === itemId && "opacity-50",
        dropIndicator?.targetId === itemId && dropIndicator.position === 'top' && 'border-t-2 border-primary',
        dropIndicator?.targetId === itemId && dropIndicator.position === 'bottom' && 'border-b-2 border-primary'
    );
    
    if (isGroup) {
        const isIsolated = isolationMode === item.groupId;
        return (
            <div key={item.groupId} className="bg-muted/30 rounded-md p-1 space-y-1">
                 <div
                    className={itemClasses}
                    onClick={(e) => onSelectShape(item.mask.id, e.shiftKey)}
                    draggable={!editingId}
                    onDragStart={(e) => handleDragStart(e, item.mask.id)}
                    onDragOver={(e) => handleDragOver(e, item.mask.id)}
                >
                    <Scissors className="w-4 h-4 text-accent" />
                     {editingId === item.mask.id ? (
                        <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} autoFocus className="h-7 text-sm" />
                    ) : (
                        <span className="truncate text-sm flex-1" onDoubleClick={() => handleRenameStart(item.mask)}>{item.mask.name || 'Clipping Mask'}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleRenameStart(item.mask); }}>
                        <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setIsolationMode(isIsolated ? null : item.groupId); }}>
                        {isIsolated ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onReleaseMask(item.mask.id); }}>
                        <Unlink className="w-4 h-4" />
                    </Button>
                </div>
                <div className="pl-6 space-y-1">
                    {item.content.map(contentItem => renderItem(contentItem))}
                </div>
            </div>
        )
    }
    
    // Normal shape rendering
    const shape = item;
     return (
        <div
            key={shape.id}
            className={itemClasses}
            onClick={(e) => { if (editingId !== shape.id) onSelectShape(shape.id, e.shiftKey) }}
            draggable={!editingId}
            onDragStart={(e) => handleDragStart(e, shape.id)}
            onDragOver={(e) => handleDragOver(e, shape.id)}
        >
            <ShapeIcon type={shape.type} />
            {editingId === shape.id ? (
                <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} onBlur={handleRenameConfirm} onKeyDown={handleRenameKeyDown} autoFocus className="h-7 text-sm" />
            ) : (
                <span className="truncate text-sm flex-1" onDoubleClick={() => handleRenameStart(shape)}>{shape.name || shape.type}</span>
            )}
             <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                    e.stopPropagation();
                    handleRenameStart(shape);
                }}
            >
                <Pencil className="w-3 h-3" />
            </Button>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card" onDrop={handleDrop} onDragLeave={handleDragLeave}>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
            {layerItems.map(item => renderItem(item))}
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

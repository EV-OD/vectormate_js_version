'use client';

import React, { useRef, useMemo } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

type CanvasProps = {
  shapes: Shape[];
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[]) => void;
  addShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  interactionState: InteractionState;
  setInteractionState: (state: InteractionState) => void;
  setContextMenu: (menu: { x: number; y: number; shapeId: string } | null) => void;
};

const SELECTION_COLOR = 'hsl(var(--primary))';
const HANDLE_SIZE = 8;

function getHexagonPoints(width: number, height: number): string {
    const cx = width / 2;
    const cy = height / 2;
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        points.push([
            cx + (width / 2) * Math.cos(angle),
            cy + (height / 2) * Math.sin(angle),
        ]);
    }
    return points.map(p => p.map(c => Math.round(c)).join(',')).join(' ');
}


export function Canvas({
  shapes,
  activeTool,
  setActiveTool,
  selectedShapeIds,
  setSelectedShapeIds,
  addShape,
  updateShapes,
  interactionState,
  setInteractionState,
  setContextMenu,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const getMousePosition = (e: React.MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
    }
    return { x: 0, y: 0 };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) {
      setContextMenu(null);
    }
    const { x, y } = getMousePosition(e);
    const target = e.target as SVGElement;
    const shapeId = target.dataset.shapeId;
    const handleName = target.dataset.handle as Handle;

    if (activeTool === 'select') {
        if (handleName && selectedShapeIds.length > 0) {
            e.stopPropagation();
            const initialShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
            setInteractionState({
              type: 'resizing',
              handle: handleName,
              startX: x,
              startY: y,
              initialShapes: initialShapes,
              aspectRatios: initialShapes.map(s => s.height === 0 ? 1 : s.width / s.height),
            });
          } else if (shapeId) {
            const isSelected = selectedShapeIds.includes(shapeId);
            if (e.shiftKey) {
              setSelectedShapeIds(
                isSelected ? selectedShapeIds.filter(id => id !== shapeId) : [...selectedShapeIds, shapeId]
              );
            } else if (!isSelected) {
              setSelectedShapeIds([shapeId]);
            }
            // Start moving only the selected shapes
            const affectedIds = e.shiftKey && !isSelected ? [...selectedShapeIds, shapeId] : (isSelected && e.shiftKey ? selectedShapeIds.filter(id => id !== shapeId) : [shapeId]);
            const initialShapes = shapes.filter(s => affectedIds.includes(s.id));
            setInteractionState({ type: 'moving', startX: x, startY: y, initialShapes });
        } else {
            setSelectedShapeIds([]);
            setInteractionState({ type: 'panning', startX: x, startY: y });
        }
    } else {
        const commonProps = { id: nanoid(), x, y, width: 0, height: 0, rotation: 0, fill: '#cccccc', opacity: 1 };
        let newShape: Shape;
        if(activeTool === 'polygon') {
            newShape = { ...commonProps, type: 'polygon', points: '' };
        } else {
            newShape = { ...commonProps, type: activeTool as Exclude<ShapeType, 'polygon'> };
        }
      addShape(newShape);
      setInteractionState({ type: 'drawing', shapeType: activeTool, startX: x, startY: y, currentShapeId: newShape.id });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interactionState.type === 'none') return;
    const { x, y } = getMousePosition(e);
    const dx = x - interactionState.startX;
    const dy = y - interactionState.startY;

    switch (interactionState.type) {
        case 'moving': {
            const updated = interactionState.initialShapes.map(s => ({ ...s, x: s.x + dx, y: s.y + dy }));
            updateShapes(updated);
            break;
        }
        case 'drawing': {
            const currentShape = shapes.find(s => s.id === interactionState.currentShapeId);
            if (!currentShape) return;
            const newWidth = Math.abs(dx);
            const newHeight = Math.abs(dy);
            const newX = dx > 0 ? interactionState.startX : x;
            const newY = dy > 0 ? interactionState.startY : y;

            let updatedProps: Partial<Shape> = { x: newX, y: newY, width: newWidth, height: newHeight };
            if (currentShape.type === 'polygon') {
                (updatedProps as PolygonShape).points = getHexagonPoints(newWidth, newHeight);
            }
            updateShapes([{ ...currentShape, ...updatedProps }]);
            break;
        }
        case 'resizing': {
            const { initialShapes, handle } = interactionState;
            const initialBounds = getBounds(initialShapes);

            let newBounds = { ...initialBounds };

            if (handle.includes('e')) newBounds.width = initialBounds.width + dx;
            if (handle.includes('w')) { newBounds.width = initialBounds.width - dx; newBounds.x = initialBounds.x + dx; }
            if (handle.includes('s')) newBounds.height = initialBounds.height + dy;
            if (handle.includes('n')) { newBounds.height = initialBounds.height - dy; newBounds.y = initialBounds.y + dy; }

            if (e.shiftKey) {
                const initialAspectRatio = initialBounds.height === 0 ? 1 : initialBounds.width / initialBounds.height;
                const newAspectRatio = newBounds.height === 0 ? 1 : newBounds.width / newBounds.height;

                if (handle.includes('w') || handle.includes('e')) {
                    newBounds.height = newBounds.width / initialAspectRatio;
                    if (handle.includes('n')) newBounds.y = initialBounds.y + initialBounds.height - newBounds.height;
                } else if (handle.includes('n') || handle.includes('s')) {
                    newBounds.width = newBounds.height * initialAspectRatio;
                    if (handle.includes('w')) newBounds.x = initialBounds.x + initialBounds.width - newBounds.width;
                } else { // corner handles
                    if (newAspectRatio > initialAspectRatio) {
                        newBounds.width = newBounds.height * initialAspectRatio;
                    } else {
                        newBounds.height = newBounds.width / initialAspectRatio;
                    }

                    if (handle.includes('n')) newBounds.y = initialBounds.y + initialBounds.height - newBounds.height;
                    if (handle.includes('w')) newBounds.x = initialBounds.x + initialBounds.width - newBounds.width;
                }
            }
            
            newBounds.width = Math.max(0, newBounds.width);
            newBounds.height = Math.max(0, newBounds.height);
            
            const scaleX = initialBounds.width > 0 ? newBounds.width / initialBounds.width : 0;
            const scaleY = initialBounds.height > 0 ? newBounds.height / initialBounds.height : 0;

            const updatedShapes = initialShapes.map(shape => {
                const newX = newBounds.x + (shape.x - initialBounds.x) * scaleX;
                const newY = newBounds.y + (shape.y - initialBounds.y) * scaleY;
                const newWidth = shape.width * scaleX;
                const newHeight = shape.height * scaleY;
                
                const updatedShape: Shape = {...shape, x: newX, y: newY, width: newWidth, height: newHeight};

                if (updatedShape.type === 'polygon') {
                  const originalShape = initialShapes.find(s => s.id === shape.id) as PolygonShape;
                  if (originalShape?.points) {
                    const scaledPoints = originalShape.points.split(' ').map(p_str => {
                        const [px, py] = p_str.split(',').map(Number);
                        return `${px * scaleX},${py * scaleY}`;
                    }).join(' ');
                    (updatedShape as PolygonShape).points = scaledPoints;
                  }
                }
                return updatedShape;
            });
            updateShapes(updatedShapes);
            break;
        }
    }
  };

  const handleMouseUp = () => {
    const lastDrawnShape = interactionState.type === 'drawing' ? shapes.find(s => s.id === interactionState.currentShapeId) : null;
    if (lastDrawnShape && (lastDrawnShape.width === 0 || lastDrawnShape.height === 0)) {
        const width = 50, height = 50;
        let updatedShape: Shape = {...lastDrawnShape, width: width, height: height, x: lastDrawnShape.x - 25, y: lastDrawnShape.y - 25}
        if (updatedShape.type === 'polygon') {
            updatedShape.points = getHexagonPoints(width, height);
        }
        updateShapes([updatedShape])
    }

    if (interactionState.type !== 'none') {
        setInteractionState({ type: 'none' });
    }
    if (activeTool !== 'select') {
        setActiveTool('select');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    const shapeId = target.dataset.shapeId;

    if (shapeId) {
        if (!selectedShapeIds.includes(shapeId)) {
            setSelectedShapeIds([shapeId]);
        }
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            shapeId: shapeId,
        });
    } else {
        setContextMenu(null);
    }
  };
  
  const selectionBox = useMemo(() => {
    if (selectedShapeIds.length === 0) return null;
    const selected = shapes.filter(s => selectedShapeIds.includes(s.id));
    if (selected.length === 0) return null;

    // Don't show resize handles for rotated objects for simplicity
    if (selected.some(s => s.rotation !== 0)) {
        return { ...getBounds(selected), resizable: false };
    }
    return { ...getBounds(selected), resizable: true };
  }, [shapes, selectedShapeIds]);

  return (
    <svg
      id="vector-canvas"
      ref={svgRef}
      className={cn("w-full h-full bg-background cursor-crosshair", {
        'cursor-grab': activeTool === 'select' && interactionState.type !== 'resizing',
        'cursor-grabbing': interactionState.type === 'moving' || interactionState.type === 'panning',
      })}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <g>
        {shapes.map(shape => {
          const commonProps = {
            'data-shape-id': shape.id,
            transform: `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`,
            fill: shape.fill,
            fillOpacity: shape.opacity,
            className: "transition-all duration-75"
          };
          const { transform: rotateTransform, ...restProps } = commonProps;

          switch (shape.type) {
            case 'rectangle':
              return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />;
            case 'circle':
              return <ellipse key={shape.id} cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} {...commonProps} />;
            case 'polygon': {
                return <polygon key={shape.id} points={shape.points} transform={`translate(${shape.x} ${shape.y}) ${rotateTransform}`} {...restProps} />;
              }
          }
        })}
      </g>
      <g>
        {selectionBox && (
          <SelectionBox bounds={selectionBox} resizable={selectionBox.resizable} onMouseDown={handleMouseDown} />
        )}
      </g>
    </svg>
  );
}

const getBounds = (shapes: Shape[]) => {
    if (shapes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const x1 = Math.min(...shapes.map(s => s.x));
    const y1 = Math.min(...shapes.map(s => s.y));
    const x2 = Math.max(...shapes.map(s => s.x + s.width));
    const y2 = Math.max(...shapes.map(s => s.y + s.height));
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};

const SelectionBox = ({
    bounds,
    resizable,
    onMouseDown,
}: {
    bounds: { x: number; y: number; width: number; height: number; };
    resizable: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
}) => {
    if (bounds.width === 0 && bounds.height === 0) return null;

    const handles: { name: Handle; cursor: string }[] = [
        { name: 'nw', cursor: 'nwse-resize' }, { name: 'n', cursor: 'ns-resize' }, { name: 'ne', cursor: 'nesw-resize' },
        { name: 'w', cursor: 'ew-resize' }, { name: 'e', cursor: 'ew-resize' },
        { name: 'sw', cursor: 'nesw-resize' }, { name: 's', cursor: 'ns-resize' }, { name: 'se', cursor: 'nwse-resize' },
    ];
    
    const getHandlePosition = (handle: Handle, box: typeof bounds) => {
        const { x, y, width, height } = box;
        const halfW = width / 2;
        const halfH = height / 2;
        switch (handle) {
            case 'nw': return { x: x, y: y };
            case 'n': return { x: x + halfW, y: y };
            case 'ne': return { x: x + width, y: y };
            case 'w': return { x: x, y: y + halfH };
            case 'e': return { x: x + width, y: y + halfH };
            case 'sw': return { x: x, y: y + height };
            case 's': return { x: x + halfW, y: y + height };
            case 'se': return { x: x + width, y: y + height };
        }
    };
    
    return (
        <g>
            <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="none"
                stroke={SELECTION_COLOR}
                strokeWidth="1"
                strokeDasharray="3 3"
                pointerEvents="none"
            />
            {resizable && handles.map(({ name, cursor }) => {
                const { x, y } = getHandlePosition(name, bounds);
                return (
                    <rect
                        key={name}
                        x={x - HANDLE_SIZE / 2}
                        y={y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                        fill={SELECTION_COLOR}
                        stroke="hsl(var(--background))"
                        strokeWidth="1"
                        className={`cursor-${cursor}`}
                        data-handle={name}
                        onMouseDown={onMouseDown}
                    />
                );
            })}
        </g>
    );
};

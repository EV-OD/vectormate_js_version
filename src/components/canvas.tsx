'use client';

import React, { useRef, useState, useMemo } from 'react';
import { type Shape, type Tool, type InteractionState, CircleShape, RectangleShape } from '@/lib/types';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

type CanvasProps = {
  shapes: Shape[];
  activeTool: Tool;
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[]) => void;
  addShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  interactionState: InteractionState;
  setInteractionState: (state: InteractionState) => void;
};

const SELECTION_COLOR = 'hsl(var(--primary))';

export function Canvas({
  shapes,
  activeTool,
  selectedShapeIds,
  setSelectedShapeIds,
  addShape,
  updateShapes,
  interactionState,
  setInteractionState,
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
    const { x, y } = getMousePosition(e);
    const target = e.target as SVGElement;
    const shapeId = target.dataset.shapeId;

    if (activeTool === 'select') {
      if (shapeId) {
        const isSelected = selectedShapeIds.includes(shapeId);
        if (e.shiftKey) {
          setSelectedShapeIds(
            isSelected ? selectedShapeIds.filter(id => id !== shapeId) : [...selectedShapeIds, shapeId]
          );
        } else if (!isSelected) {
          setSelectedShapeIds([shapeId]);
        }
        const initialShapes = shapes.filter(s => (e.shiftKey ? [...selectedShapeIds, shapeId] : [shapeId]).includes(s.id));
        setInteractionState({ type: 'moving', startX: x, startY: y, initialShapes });
      } else {
        setSelectedShapeIds([]);
        setInteractionState({ type: 'panning', startX: x, startY: y });
      }
    } else {
      const newShape: RectangleShape | CircleShape = {
        id: nanoid(), type: activeTool as 'rectangle' | 'circle',
        x, y, width: 0, height: 0, rotation: 0,
        fill: '#cccccc', opacity: 1,
      };
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
        updateShapes([{ ...currentShape, x: newX, y: newY, width: newWidth, height: newHeight }]);
        break;
      }
    }
  };

  const handleMouseUp = () => {
    const lastDrawnShape = interactionState.type === 'drawing' ? shapes.find(s => s.id === interactionState.currentShapeId) : null;
    if (lastDrawnShape && (lastDrawnShape.width === 0 || lastDrawnShape.height === 0)) {
        updateShapes([{...lastDrawnShape, width: 50, height: 50, x: lastDrawnShape.x - 25, y: lastDrawnShape.y - 25}])
    }

    if (interactionState.type !== 'none') {
        setInteractionState({ type: 'none' });
    }
    if (activeTool !== 'select') {
        setActiveTool('select');
    }
  };
  
  const selectedShapes = useMemo(() => shapes.filter(s => selectedShapeIds.includes(s.id)), [shapes, selectedShapeIds]);

  return (
    <svg
      id="vector-canvas"
      ref={svgRef}
      className={cn("w-full h-full cursor-crosshair", {
        'cursor-grab': activeTool === 'select',
        'cursor-grabbing': interactionState.type === 'moving' || interactionState.type === 'panning',
      })}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <g>
        {shapes.map(shape => {
          const commonProps = {
            'data-shape-id': shape.id,
            transform: `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`,
            fill: shape.fill,
            'fill-opacity': shape.opacity,
            className: "transition-all duration-75"
          };
          switch (shape.type) {
            case 'rectangle':
              return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />;
            case 'circle':
              return <ellipse key={shape.id} cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} {...commonProps} />;
            case 'polygon': {
                const { transform, ...restProps } = commonProps;
                return <polygon key={shape.id} points={shape.points} transform={`translate(${shape.x} ${shape.y}) ` + transform} {...restProps} />;
              }
          }
        })}
      </g>
      <g>
        {selectedShapes.map(shape => (
          <rect
            key={`selection-${shape.id}`}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke={SELECTION_COLOR}
            strokeWidth="2"
            strokeDasharray="5 5"
            pointerEvents="none"
          />
        ))}
      </g>
    </svg>
  );
}

// Dummy setActiveTool to satisfy TS during implementation
function setActiveTool(tool: Tool) {}

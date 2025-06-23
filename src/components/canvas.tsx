'use client';

import React, { useRef, useMemo, useState } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType, CanvasView } from '@/lib/types';
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
  canvasView: CanvasView;
};

const SELECTION_COLOR = 'hsl(var(--primary))';
const HANDLE_SIZE = 8;
const SNAP_THRESHOLD = 6;

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
  canvasView,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<{ vertical: number[], horizontal: number[] }>({ vertical: [], horizontal: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);

  const getMousePosition = (e: React.MouseEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
    }
    return { x: 0, y: 0 };
  };

  const getSnappedCoords = (x: number, y: number, ignoreIds: string[] = []) => {
    let snappedX = x;
    let snappedY = y;
    const newActiveSnapLines: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };

    if (canvasView.snapToObjects) {
        const staticShapes = shapes.filter(s => !ignoreIds.includes(s.id));
        const staticVLines = staticShapes.flatMap(s => [s.x, s.x + s.width / 2, s.x + s.width]);
        const staticHLines = staticShapes.flatMap(s => [s.y, s.y + s.height / 2, s.y + s.height]);

        let minVDelta = SNAP_THRESHOLD;
        staticVLines.forEach(staticLine => {
            const delta = Math.abs(x - staticLine);
            if (delta < minVDelta) {
                minVDelta = delta;
                snappedX = staticLine;
            }
        });
        if (minVDelta < SNAP_THRESHOLD) newActiveSnapLines.vertical.push(snappedX);

        let minHDelta = SNAP_THRESHOLD;
        staticHLines.forEach(staticLine => {
            const delta = Math.abs(y - staticLine);
            if (delta < minHDelta) {
                minHDelta = delta;
                snappedY = staticLine;
            }
        });
        if (minHDelta < SNAP_THRESHOLD) newActiveSnapLines.horizontal.push(snappedY);
    }
    
    if (canvasView.snapToGrid && canvasView.background !== 'solid') {
      const { gridSize } = canvasView;
      const gridSnappedX = Math.round(snappedX / gridSize) * gridSize;
      const gridSnappedY = Math.round(snappedY / gridSize) * gridSize;

      if (Math.abs(gridSnappedX - snappedX) < SNAP_THRESHOLD) {
          snappedX = gridSnappedX;
      }
      if (Math.abs(gridSnappedY - snappedY) < SNAP_THRESHOLD) {
          snappedY = gridSnappedY;
      }
    }
    
    return { x: snappedX, y: snappedY, snapLines: newActiveSnapLines };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) {
      setContextMenu(null);
    }
    const pos = getMousePosition(e);
    const target = e.target as SVGElement;
    const shapeId = target.dataset.shapeId;
    const handleName = target.dataset.handle as Handle;
    
    const { x, y } = pos;

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
        } else if (shapeId && shapeId !== 'background') {
            const isSelected = selectedShapeIds.includes(shapeId);
            const newSelectedIds = e.shiftKey
                ? (isSelected ? selectedShapeIds.filter(id => id !== shapeId) : [...selectedShapeIds, shapeId])
                : (!isSelected ? [shapeId] : selectedShapeIds);

            setSelectedShapeIds(newSelectedIds);
            const initialShapes = shapes.filter(s => newSelectedIds.includes(s.id));
            setInteractionState({ type: 'moving', startX: x, startY: y, initialShapes });
        } else { // Background click
            if (e.ctrlKey) {
                setInteractionState({ type: 'marquee', startX: x, startY: y });
            } else {
                if (!e.shiftKey) { // Don't deselect all if user is trying to shift-select and misses
                    setSelectedShapeIds([]);
                }
                setInteractionState({ type: 'panning', startX: x, startY: y });
            }
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
    
    const pos = getMousePosition(e);
    let { x, y } = pos;
    const newActiveSnapLines: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };
    
    const dx = x - interactionState.startX;
    const dy = y - interactionState.startY;

    switch (interactionState.type) {
        case 'moving': {
            let finalDx = dx;
            let finalDy = dy;
            const movingBounds = getBounds(interactionState.initialShapes);

            if (canvasView.snapToObjects) {
                const staticShapes = shapes.filter(s => !interactionState.initialShapes.some(is => is.id === s.id));
                const staticVLines = staticShapes.flatMap(s => [s.x, s.x + s.width / 2, s.x + s.width]);
                const staticHLines = staticShapes.flatMap(s => [s.y, s.y + s.height / 2, s.y + s.height]);
                
                const movingVLines = {
                    left: movingBounds.x + dx,
                    center: movingBounds.x + movingBounds.width / 2 + dx,
                    right: movingBounds.x + movingBounds.width + dx,
                };
                const movingHLines = {
                    top: movingBounds.y + dy,
                    center: movingBounds.y + movingBounds.height / 2 + dy,
                    bottom: movingBounds.y + movingBounds.height + dy,
                };

                let bestVSnap = { delta: SNAP_THRESHOLD, line: 0, newDx: finalDx };
                staticVLines.forEach(staticLine => {
                    Object.values(movingVLines).forEach(movingLine => {
                        const delta = Math.abs(movingLine - staticLine);
                        if (delta < bestVSnap.delta) {
                            bestVSnap = { delta, line: staticLine, newDx: finalDx + (staticLine - movingLine) };
                        }
                    });
                });
                if (bestVSnap.delta < SNAP_THRESHOLD) {
                    finalDx = bestVSnap.newDx;
                    newActiveSnapLines.vertical.push(bestVSnap.line);
                }

                let bestHSnap = { delta: SNAP_THRESHOLD, line: 0, newDy: finalDy };
                staticHLines.forEach(staticLine => {
                    Object.values(movingHLines).forEach(movingLine => {
                        const delta = Math.abs(movingLine - staticLine);
                        if (delta < bestHSnap.delta) {
                            bestHSnap = { delta, line: staticLine, newDy: finalDy + (staticLine - movingLine) };
                        }
                    });
                });
                if (bestHSnap.delta < SNAP_THRESHOLD) {
                    finalDy = bestHSnap.newDy;
                    newActiveSnapLines.horizontal.push(bestHSnap.line);
                }
            }

            if (canvasView.snapToGrid && canvasView.background !== 'solid') {
              const { gridSize } = canvasView;
              const currentX = movingBounds.x + finalDx;
              const currentY = movingBounds.y + finalDy;
              
              const snappedX = Math.round(currentX / gridSize) * gridSize;
              const snappedY = Math.round(currentY / gridSize) * gridSize;
              
              if (Math.abs(snappedX - currentX) < SNAP_THRESHOLD) {
                 finalDx += snappedX - currentX;
              }
              if (Math.abs(snappedY - currentY) < SNAP_THRESHOLD) {
                 finalDy += snappedY - currentY;
              }
            }

            const updated = interactionState.initialShapes.map(s => ({ ...s, x: s.x + finalDx, y: s.y + finalDy }));
            updateShapes(updated);
            break;
        }
        case 'drawing': {
            const ignoreIds = [interactionState.currentShapeId];
            const snapped = getSnappedCoords(x, y, ignoreIds);
            x = snapped.x;
            y = snapped.y;
            newActiveSnapLines.vertical.push(...snapped.snapLines.vertical);
            newActiveSnapLines.horizontal.push(...snapped.snapLines.horizontal);
            
            const currentShape = shapes.find(s => s.id === interactionState.currentShapeId);
            if (!currentShape) break;

            const newWidth = Math.abs(x - interactionState.startX);
            const newHeight = Math.abs(y - interactionState.startY);
            const newX = x > interactionState.startX ? interactionState.startX : x;
            const newY = y > interactionState.startY ? interactionState.startY : y;

            let updatedProps: Partial<Shape> = { x: newX, y: newY, width: newWidth, height: newHeight };
            if (currentShape.type === 'polygon') {
                (updatedProps as PolygonShape).points = getHexagonPoints(newWidth, newHeight);
            }
            updateShapes([{ ...currentShape, ...updatedProps }]);
            break;
        }
        case 'resizing': {
            const ignoreIds = interactionState.initialShapes.map(s => s.id);
            const snapped = getSnappedCoords(x, y, ignoreIds);
            x = snapped.x;
            y = snapped.y;
            newActiveSnapLines.vertical.push(...snapped.snapLines.vertical);
            newActiveSnapLines.horizontal.push(...snapped.snapLines.horizontal);

            const snappedDx = x - interactionState.startX;
            const snappedDy = y - interactionState.startY;

            const { initialShapes, handle } = interactionState;
            const initialBounds = getBounds(initialShapes);

            let newBounds = { ...initialBounds };

            if (handle.includes('e')) newBounds.width = initialBounds.width + snappedDx;
            if (handle.includes('w')) { newBounds.width = initialBounds.width - snappedDx; newBounds.x = initialBounds.x + snappedDx; }
            if (handle.includes('s')) newBounds.height = initialBounds.height + snappedDy;
            if (handle.includes('n')) { newBounds.height = initialBounds.height - snappedDy; newBounds.y = initialBounds.y + snappedDy; }

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
                        const scaledPoints = getHexagonPoints(newWidth, newHeight);
                        (updatedShape as PolygonShape).points = scaledPoints;
                    }
                }
                return updatedShape;
            });
            updateShapes(updatedShapes);
            break;
        }
        case 'marquee': {
            const newX = Math.min(interactionState.startX, x);
            const newY = Math.min(interactionState.startY, y);
            const width = Math.abs(x - interactionState.startX);
            const height = Math.abs(y - interactionState.startY);
            setMarquee({ x: newX, y: newY, width, height });
            break;
        }
    }
    setActiveSnapLines(newActiveSnapLines);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (interactionState.type === 'marquee' && marquee) {
        const isShapeInMarquee = (shape: Shape, marqueeBox: typeof marquee) => {
            const shapeRight = shape.x + shape.width;
            const shapeBottom = shape.y + shape.height;
            const marqueeRight = marqueeBox.x + marqueeBox.width;
            const marqueeBottom = marqueeBox.y + marqueeBox.height;
            return (
                shape.x < marqueeRight &&
                shapeRight > marqueeBox.x &&
                shape.y < marqueeBottom &&
                shapeBottom > marqueeBox.y
            );
        };
        const idsInMarquee = shapes.filter(s => isShapeInMarquee(s, marquee)).map(s => s.id);
        
        if (e.shiftKey) {
            const currentSelection = new Set(selectedShapeIds);
            idsInMarquee.forEach(id => currentSelection.add(id));
            setSelectedShapeIds(Array.from(currentSelection));
        } else {
            setSelectedShapeIds(idsInMarquee);
        }
    }
    setMarquee(null);
    setActiveSnapLines({ vertical: [], horizontal: [] });

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

    if (selected.some(s => s.rotation !== 0)) {
        return { ...getBounds(selected), resizable: false };
    }
    return { ...getBounds(selected), resizable: true };
  }, [shapes, selectedShapeIds]);

  return (
    <svg
      id="vector-canvas"
      ref={svgRef}
      className={cn("w-full h-full cursor-crosshair", {
        'cursor-grab': activeTool === 'select' && interactionState.type !== 'resizing' && interactionState.type !== 'marquee',
        'cursor-grabbing': interactionState.type === 'moving' || interactionState.type === 'panning',
      })}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
        <defs>
            {canvasView.background === 'grid' && (
              <pattern id="grid" width={canvasView.gridSize} height={canvasView.gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${canvasView.gridSize} 0 L 0 0 0 ${canvasView.gridSize}`} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5"/>
              </pattern>
            )}
            {canvasView.background === 'dots' && (
              <pattern id="dots" width={canvasView.gridSize} height={canvasView.gridSize} patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="hsl(var(--border))" />
              </pattern>
            )}
        </defs>
          
        <rect
            width="100%"
            height="100%"
            fill={
                canvasView.background === 'solid'
                ? 'hsl(var(--background))'
                : `url(#${canvasView.background})`
            }
            data-shape-id="background"
        />
      <g>
        {shapes.map(shape => {
          const commonProps = {
            'data-shape-id': shape.id,
            transform: `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`,
            fill: shape.fill,
            fillOpacity: shape.opacity,
            className: "transition-all duration-75"
          };

          switch (shape.type) {
            case 'rectangle':
              return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...commonProps} />;
            case 'circle':
              return <ellipse key={shape.id} cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} {...commonProps} />;
            case 'polygon': {
                const { transform, ...rest } = commonProps;
                return <polygon key={shape.id} points={shape.points} transform={`translate(${shape.x} ${shape.y}) ${transform}`} {...rest} />;
              }
          }
        })}
      </g>
      <g>
        {activeSnapLines.vertical.map((lineX, i) => (
            <line key={`v-${i}`} x1={lineX} y1="0" x2={lineX} y2="100%" stroke="hsl(var(--accent))" strokeWidth="0.5" strokeDasharray="3 3" />
        ))}
        {activeSnapLines.horizontal.map((lineY, i) => (
            <line key={`h-${i}`} x1="0" y1={lineY} x2="100%" y2={lineY} stroke="hsl(var(--accent))" strokeWidth="0.5" strokeDasharray="3 3" />
        ))}
      </g>
      <g>
        {selectionBox && (
          <SelectionBox bounds={selectionBox} resizable={selectionBox.resizable} onMouseDown={handleMouseDown} />
        )}
      </g>
      {marquee && (
          <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              strokeDasharray="2 2"
              pointerEvents="none"
          />
      )}
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

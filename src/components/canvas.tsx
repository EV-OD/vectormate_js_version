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
  onViewChange: (view: Partial<CanvasView>) => void;
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
  onViewChange,
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<{ vertical: number[], horizontal: number[] }>({ vertical: [], horizontal: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);

  const getScreenPosition = (e: React.MouseEvent | React.WheelEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
    }
    return { x: 0, y: 0 };
  };

  const getMousePosition = (e: React.MouseEvent): { x: number; y: number } => {
    const screenPos = getScreenPosition(e);
    return {
      x: (screenPos.x - canvasView.pan.x) / canvasView.scale,
      y: (screenPos.y - canvasView.pan.y) / canvasView.scale,
    };
  };

  const getSnappedCoords = (x: number, y: number, ignoreIds: string[] = []) => {
    let snappedX = x;
    let snappedY = y;
    const newActiveSnapLines: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };
    const snapThresholdWithZoom = SNAP_THRESHOLD / canvasView.scale;

    if (canvasView.snapToObjects) {
        const staticShapes = shapes.filter(s => !ignoreIds.includes(s.id));
        const staticVLines = staticShapes.flatMap(s => [s.x, s.x + s.width / 2, s.x + s.width]);
        const staticHLines = staticShapes.flatMap(s => [s.y, s.y + s.height / 2, s.y + s.height]);

        let minVDelta = snapThresholdWithZoom;
        staticVLines.forEach(staticLine => {
            const delta = Math.abs(x - staticLine);
            if (delta < minVDelta) {
                minVDelta = delta;
                snappedX = staticLine;
            }
        });
        if (minVDelta < snapThresholdWithZoom) newActiveSnapLines.vertical.push(snappedX);

        let minHDelta = snapThresholdWithZoom;
        staticHLines.forEach(staticLine => {
            const delta = Math.abs(y - staticLine);
            if (delta < minHDelta) {
                minHDelta = delta;
                snappedY = staticLine;
            }
        });
        if (minHDelta < snapThresholdWithZoom) newActiveSnapLines.horizontal.push(snappedY);
    }
    
    if (canvasView.snapToGrid && canvasView.background !== 'solid') {
      const { gridSize } = canvasView;
      const gridSnappedX = Math.round(x / gridSize) * gridSize;
      const gridSnappedY = Math.round(y / gridSize) * gridSize;

      if (Math.abs(gridSnappedX - x) < snapThresholdWithZoom) {
          snappedX = gridSnappedX;
      }
      if (Math.abs(gridSnappedY - y) < snapThresholdWithZoom) {
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
            if (e.ctrlKey || e.metaKey) {
                setInteractionState({ type: 'marquee', startX: x, startY: y });
            } else {
                if (!e.shiftKey) { // Don't deselect all if user is trying to shift-select and misses
                    setSelectedShapeIds([]);
                }
                const screenPos = getScreenPosition(e);
                setInteractionState({ type: 'panning', startX: screenPos.x, startY: screenPos.y, initialPan: canvasView.pan });
            }
        }
    } else {
        const commonProps = { id: nanoid(), x, y, width: 0, height: 0, rotation: 0 };
        let newShape: Shape;
        if(activeTool === 'polygon') {
            newShape = { ...commonProps, type: 'polygon', points: '', fill: '#cccccc', opacity: 1, strokeWidth: 0 };
        } else if (activeTool === 'line') {
            newShape = { ...commonProps, type: 'line', stroke: '#000000', strokeWidth: 2 };
        }
        else {
            newShape = { ...commonProps, type: activeTool as Exclude<ShapeType, 'polygon' | 'line'>, fill: '#cccccc', opacity: 1, strokeWidth: 0 };
        }
      addShape(newShape);
      setInteractionState({ type: 'drawing', shapeType: activeTool, startX: x, startY: y, currentShapeId: newShape.id });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (interactionState.type === 'none') return;
    
    const newActiveSnapLines: { vertical: number[]; horizontal: number[] } = { vertical: [], horizontal: [] };
    
    if (interactionState.type === 'panning') {
        const screenPos = getScreenPosition(e);
        const dx = screenPos.x - interactionState.startX;
        const dy = screenPos.y - interactionState.startY;
        const newPan = {
            x: interactionState.initialPan.x + dx,
            y: interactionState.initialPan.y + dy,
        };
        onViewChange({ pan: newPan });
        return;
    }

    let { x, y } = getMousePosition(e);
    const dx = x - interactionState.startX;
    const dy = y - interactionState.startY;

    switch (interactionState.type) {
        case 'moving': {
            let finalDx = dx;
            let finalDy = dy;
            const movingBounds = getBounds(interactionState.initialShapes);
            const snapThresholdWithZoom = SNAP_THRESHOLD / canvasView.scale;

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

                let bestVSnap = { delta: snapThresholdWithZoom, line: 0, newDx: finalDx };
                staticVLines.forEach(staticLine => {
                    Object.values(movingVLines).forEach(movingLine => {
                        const delta = Math.abs(movingLine - staticLine);
                        if (delta < bestVSnap.delta) {
                            bestVSnap = { delta, line: staticLine, newDx: finalDx + (staticLine - movingLine) };
                        }
                    });
                });
                if (bestVSnap.delta < snapThresholdWithZoom) {
                    finalDx = bestVSnap.newDx;
                    newActiveSnapLines.vertical.push(bestVSnap.line);
                }

                let bestHSnap = { delta: snapThresholdWithZoom, line: 0, newDy: finalDy };
                staticHLines.forEach(staticLine => {
                    Object.values(movingHLines).forEach(movingLine => {
                        const delta = Math.abs(movingLine - staticLine);
                        if (delta < bestHSnap.delta) {
                            bestHSnap = { delta, line: staticLine, newDy: finalDy + (staticLine - movingLine) };
                        }
                    });
                });
                if (bestHSnap.delta < snapThresholdWithZoom) {
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
              
              if (Math.abs(snappedX - currentX) < snapThresholdWithZoom) {
                 finalDx += snappedX - currentX;
              }
              if (Math.abs(snappedY - currentY) < snapThresholdWithZoom) {
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

            let newWidth = Math.abs(x - interactionState.startX);
            let newHeight = Math.abs(y - interactionState.startY);
            let newX = x > interactionState.startX ? interactionState.startX : x;
            let newY = y > interactionState.startY ? interactionState.startY : y;

            if (e.shiftKey && currentShape.type !== 'line') {
                const size = Math.max(newWidth, newHeight);
                newWidth = size;
                newHeight = size;
                if (x < interactionState.startX) {
                    newX = interactionState.startX - size;
                }
                if (y < interactionState.startY) {
                    newY = interactionState.startY - size;
                }
            }

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
            if (!marqueeBox) return false;
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
    if (lastDrawnShape && (lastDrawnShape.width === 0 && lastDrawnShape.height === 0)) {
        const width = 50, height = 50;
        let updatedShape: Shape = {...lastDrawnShape, width: width, height: height, x: lastDrawnShape.x - 25, y: lastDrawnShape.y - 25}
        if (updatedShape.type === 'polygon') {
            updatedShape.points = getHexagonPoints(width, height);
        } else if (updatedShape.type === 'line') {
            updatedShape.height = 0; // a point-click line should just be horizontal
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

    if (shapeId && shapeId !== 'background') {
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
  
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('aside, header')) {
        return;
    }
    e.preventDefault();
    const { scale, pan } = canvasView;
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));

    const screenPos = getScreenPosition(e);
    
    const newPan = {
        x: screenPos.x - (screenPos.x - pan.x) * (clampedScale / scale),
        y: screenPos.y - (screenPos.y - pan.y) * (clampedScale / scale),
    };

    onViewChange({ scale: clampedScale, pan: newPan });
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
        'cursor-grab': activeTool === 'select' && interactionState.type !== 'resizing' && interactionState.type !== 'marquee' && interactionState.type !== 'moving',
        'cursor-grabbing': interactionState.type === 'moving' || interactionState.type === 'panning',
        'cursor-nwse-resize': interactionState.type === 'resizing' && (interactionState.handle === 'nw' || interactionState.handle === 'se'),
        'cursor-nesw-resize': interactionState.type === 'resizing' && (interactionState.handle === 'ne' || interactionState.handle === 'sw'),
        'cursor-ns-resize': interactionState.type === 'resizing' && (interactionState.handle === 'n' || interactionState.handle === 's'),
        'cursor-ew-resize': interactionState.type === 'resizing' && (interactionState.handle === 'w' || interactionState.handle === 'e'),
      })}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
        <defs>
            {canvasView.background === 'grid' && (
              <pattern id="grid" width={canvasView.gridSize} height={canvasView.gridSize} patternUnits="userSpaceOnUse">
                <path d={`M ${canvasView.gridSize} 0 L 0 0 0 ${canvasView.gridSize}`} fill="none" stroke="hsl(var(--border))" strokeWidth={0.5 / canvasView.scale}/>
              </pattern>
            )}
            {canvasView.background === 'dots' && (
              <pattern id="dots" width={canvasView.gridSize} height={canvasView.gridSize} patternUnits="userSpaceOnUse">
                <circle cx={1 / canvasView.scale} cy={1 / canvasView.scale} r={1 / canvasView.scale} fill="hsl(var(--border))" />
              </pattern>
            )}
        </defs>

      <g transform={`translate(${canvasView.pan.x}, ${canvasView.pan.y}) scale(${canvasView.scale})`}>
        <rect
            x={-50000}
            y={-50000}
            width={100000}
            height={100000}
            fill={
                canvasView.background === 'solid'
                ? 'hsl(var(--background))'
                : `url(#${canvasView.background})`
            }
            data-shape-id="background"
        />
        <g>
          {shapes.map(shape => {
            const { ...rest } = shape;
            const commonProps: any = {
              'data-shape-id': rest.id,
              transform: `rotate(${rest.rotation} ${rest.x + rest.width / 2} ${rest.y + rest.height / 2})`,
              stroke: rest.stroke,
              strokeWidth: rest.strokeWidth,
              className: "transition-all duration-75"
            };
            
            if (rest.type !== 'line') {
              commonProps.fill = rest.fill;
              commonProps.fillOpacity = rest.opacity;
            } else {
              commonProps.fill = "none";
            }

            switch (rest.type) {
              case 'rectangle':
                return <rect key={rest.id} x={rest.x} y={rest.y} width={rest.width} height={rest.height} {...commonProps} />;
              case 'circle':
                return <ellipse key={rest.id} cx={rest.x + rest.width / 2} cy={rest.y + rest.height / 2} rx={rest.width / 2} ry={rest.height / 2} {...commonProps} />;
              case 'polygon': {
                  const { transform: polyTransform, ...polyProps } = commonProps;
                  return <polygon key={rest.id} points={rest.points} transform={`translate(${rest.x} ${rest.y}) ${polyTransform}`} {...polyProps} />;
              }
              case 'line': {
                  return <line key={rest.id} x1={rest.x} y1={rest.y} x2={rest.x + rest.width} y2={rest.y + rest.height} {...commonProps} />;
              }
            }
          })}
        </g>
        <g>
          {activeSnapLines.vertical.map((lineX, i) => (
              <line key={`v-${i}`} x1={lineX} y1="0" x2={lineX} y2="100%" stroke="hsl(var(--accent))" strokeWidth={0.5 / canvasView.scale} strokeDasharray={`${3 / canvasView.scale} ${3 / canvasView.scale}`} />
          ))}
          {activeSnapLines.horizontal.map((lineY, i) => (
              <line key={`h-${i}`} x1="0" y1={lineY} x2="100%" y2={lineY} stroke="hsl(var(--accent))" strokeWidth={0.5 / canvasView.scale} strokeDasharray={`${3 / canvasView.scale} ${3 / canvasView.scale}`} />
          ))}
        </g>
        <g>
          {selectionBox && (
            <SelectionBox bounds={selectionBox} resizable={selectionBox.resizable} onMouseDown={handleMouseDown} scale={canvasView.scale} />
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
                strokeWidth={1 / canvasView.scale}
                strokeDasharray={`${2 / canvasView.scale} ${2 / canvasView.scale}`}
                pointerEvents="none"
            />
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
    scale,
}: {
    bounds: { x: number; y: number; width: number; height: number; };
    resizable: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    scale: number;
}) => {
    if (bounds.width === 0 && bounds.height === 0) return null;

    const handles: { name: Handle; cursor: string }[] = [
        { name: 'nw', cursor: 'cursor-nwse-resize' }, { name: 'n', cursor: 'cursor-ns-resize' }, { name: 'ne', cursor: 'cursor-nesw-resize' },
        { name: 'w', cursor: 'cursor-ew-resize' }, { name: 'e', cursor: 'cursor-ew-resize' },
        { name: 'sw', cursor: 'cursor-nesw-resize' }, { name: 's', cursor: 'cursor-ns-resize' }, { name: 'se', cursor: 'cursor-nwse-resize' },
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
    
    const handleSize = HANDLE_SIZE / scale;

    return (
        <g>
            <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="none"
                stroke={SELECTION_COLOR}
                strokeWidth={1 / scale}
                strokeDasharray={`${3 / scale} ${3 / scale}`}
                pointerEvents="none"
            />
            {resizable && handles.map(({ name, cursor }) => {
                const { x, y } = getHandlePosition(name, bounds);
                return (
                    <rect
                        key={name}
                        x={x - handleSize / 2}
                        y={y - handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill={SELECTION_COLOR}
                        stroke="hsl(var(--background))"
                        strokeWidth={1 / scale}
                        className={cursor}
                        data-handle={name}
                        onMouseDown={onMouseDown}
                    />
                );
            })}
        </g>
    );
};
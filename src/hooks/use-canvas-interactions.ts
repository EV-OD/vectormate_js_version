'use client';

import React, { useRef, useState, useCallback } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType, CanvasView, ImageShape, SVGShape } from '@/lib/types';
import { nanoid } from 'nanoid';
import { getBounds, getHexagonPoints } from '@/lib/geometry';
import { SNAP_THRESHOLD } from '@/lib/constants';

type UseCanvasInteractionsProps = {
  shapes: Shape[];
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[]) => void;
  addShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  commitUpdate: () => void;
  interactionState: InteractionState;
  setInteractionState: (state: InteractionState) => void;
  setContextMenu: (menu: { x: number; y: number; shapeId: string } | null) => void;
  canvasView: CanvasView;
  onViewChange: (view: Partial<CanvasView>) => void;
};

export function useCanvasInteractions({
  shapes,
  activeTool,
  setActiveTool,
  selectedShapeIds,
  setSelectedShapeIds,
  addShape,
  updateShapes,
  commitUpdate,
  interactionState,
  setInteractionState,
  setContextMenu,
  canvasView,
  onViewChange,
}: UseCanvasInteractionsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<{ vertical: number[], horizontal: number[] }>({ vertical: [], horizontal: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);

  const getScreenPosition = useCallback((e: React.MouseEvent | React.WheelEvent): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (CTM) {
      return { x: (e.clientX - CTM.e) / CTM.a, y: (e.clientY - CTM.f) / CTM.d };
    }
    return { x: 0, y: 0 };
  }, []);

  const getMousePosition = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const screenPos = getScreenPosition(e);
    return {
      x: (screenPos.x - canvasView.pan.x) / canvasView.scale,
      y: (screenPos.y - canvasView.pan.y) / canvasView.scale,
    };
  }, [canvasView.pan, canvasView.scale, getScreenPosition]);

  const getSnappedCoords = useCallback((x: number, y: number, ignoreIds: string[] = []) => {
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
  }, [shapes, canvasView]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
            if (handleName === 'rotate') {
                const bounds = getBounds(initialShapes);
                setInteractionState({
                    type: 'rotating',
                    startX: x,
                    startY: y,
                    initialShapes: initialShapes,
                    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
                });
            } else {
                setInteractionState({
                  type: 'resizing',
                  handle: handleName,
                  startX: x,
                  startY: y,
                  initialShapes: initialShapes,
                  aspectRatios: initialShapes.map(s => s.height === 0 ? 1 : s.width / s.height),
                });
            }
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
                if (!e.shiftKey) { 
                    setSelectedShapeIds([]);
                }
                const screenPos = getScreenPosition(e);
                setInteractionState({ type: 'panning', startX: screenPos.x, startY: screenPos.y, initialPan: canvasView.pan });
            }
        }
    } else {
        const shapeName = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
        const commonProps = { id: nanoid(), name: shapeName, x, y, width: 0, height: 0, rotation: 0, opacity: 1 };
        let newShape: Shape;
        if(activeTool === 'polygon') {
            newShape = { ...commonProps, type: 'polygon', points: '', fill: '#cccccc', strokeWidth: 0 };
        } else if (activeTool === 'line') {
            newShape = { ...commonProps, type: 'line', stroke: '#000000', strokeWidth: 2 };
        } else if (activeTool === 'image') {
            newShape = { ...commonProps, type: 'image', href: 'https://placehold.co/200x200.png' };
        } else if (activeTool === 'svg') {
            newShape = { ...commonProps, type: 'svg', svgString: '<rect x="0" y="0" width="100" height="100" fill="cyan" />' };
        }
        else {
            newShape = { ...commonProps, type: activeTool as Exclude<ShapeType, 'polygon' | 'line' | 'image' | 'svg'>, fill: '#cccccc', strokeWidth: 0 };
        }
      addShape(newShape);
      setInteractionState({ type: 'drawing', shapeType: activeTool, startX: x, startY: y, currentShapeId: newShape.id });
    }
  }, [getMousePosition, activeTool, selectedShapeIds, shapes, setSelectedShapeIds, getScreenPosition, canvasView.pan, setContextMenu, setInteractionState, addShape]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
            const { initialShapes, handle } = interactionState;
            if (initialShapes.length !== 1) break; // Should not happen with new UI logic, but good practice
            
            const initialShape = initialShapes[0];

            if (initialShape.rotation === 0) {
                 // Standard logic for un-rotated shapes (supports aspect ratio lock)
                const { x: sx, y: sy } = getSnappedCoords(x, y, [initialShape.id]);
                const snappedDx = sx - interactionState.startX;
                const snappedDy = sy - interactionState.startY;

                let newBounds = { x: initialShape.x, y: initialShape.y, width: initialShape.width, height: initialShape.height };

                if (handle.includes('e')) newBounds.width = initialShape.width + snappedDx;
                if (handle.includes('w')) { newBounds.width = initialShape.width - snappedDx; newBounds.x = initialShape.x + snappedDx; }
                if (handle.includes('s')) newBounds.height = initialShape.height + snappedDy;
                if (handle.includes('n')) { newBounds.height = initialShape.height - snappedDy; newBounds.y = initialShape.y + snappedDy; }

                if (e.shiftKey) {
                    const aspectRatio = initialShape.height === 0 ? 1 : initialShape.width / initialShape.height;
                    const newAspectRatio = newBounds.height === 0 ? 1 : newBounds.width / newBounds.height;
                    
                    const changedWidth = newBounds.width !== initialShape.width;
                    const changedHeight = newBounds.height !== initialShape.height;

                    if (changedWidth && !changedHeight) { // e.g., 'e', 'w'
                        newBounds.height = newBounds.width / aspectRatio;
                    } else if (!changedWidth && changedHeight) { // e.g., 'n', 's'
                        newBounds.width = newBounds.height * aspectRatio;
                    } else { // Corner handles
                        if (newAspectRatio > aspectRatio) {
                            newBounds.width = newBounds.height * aspectRatio;
                        } else {
                            newBounds.height = newBounds.width / aspectRatio;
                        }
                    }

                    if (handle.includes('n')) newBounds.y = (initialShape.y + initialShape.height) - newBounds.height;
                    if (handle.includes('w')) newBounds.x = (initialShape.x + initialShape.width) - newBounds.width;
                }

                newBounds.width = Math.max(1, newBounds.width);
                newBounds.height = Math.max(1, newBounds.height);
                
                const updatedShape: Shape = { ...initialShape, ...newBounds };
                 if (updatedShape.type === 'polygon') {
                    updatedShape.points = getHexagonPoints(updatedShape.width, updatedShape.height);
                }
                updateShapes([updatedShape]);

            } else {
                // Special logic for rotated shapes
                const angleRad = initialShape.rotation * (Math.PI / 180);
                const cos = Math.cos(angleRad);
                const sin = Math.sin(angleRad);

                const localDx = dx * cos + dy * sin;
                const localDy = -dx * sin + dy * cos;

                let dWidth = 0, dHeight = 0;

                if (handle.includes('e')) dWidth = localDx;
                if (handle.includes('w')) dWidth = -localDx;
                if (handle.includes('s')) dHeight = localDy;
                if (handle.includes('n')) dHeight = -localDy;

                const newWidth = Math.max(1, initialShape.width + dWidth);
                const newHeight = Math.max(1, initialShape.height + dHeight);

                const actualDWidth = newWidth - initialShape.width;
                const actualDHeight = newHeight - initialShape.height;
                
                let dCenterX_local = 0, dCenterY_local = 0;
                if (handle.includes('e')) dCenterX_local = actualDWidth / 2;
                if (handle.includes('w')) dCenterX_local = -actualDWidth / 2;
                if (handle.includes('s')) dCenterY_local = actualDHeight / 2;
                if (handle.includes('n')) dCenterY_local = -actualDHeight / 2;

                const dCenterX_world = dCenterX_local * cos - dCenterY_local * sin;
                const dCenterY_world = dCenterX_local * sin + dCenterY_local * cos;

                const initialCenterX = initialShape.x + initialShape.width / 2;
                const initialCenterY = initialShape.y + initialShape.height / 2;

                const newCenterX = initialCenterX + dCenterX_world;
                const newCenterY = initialCenterY + dCenterY_world;

                const newX = newCenterX - newWidth / 2;
                const newY = newCenterY - newHeight / 2;
                
                const updatedShape: Shape = { ...initialShape, x: newX, y: newY, width: newWidth, height: newHeight };
                if (updatedShape.type === 'polygon') {
                    updatedShape.points = getHexagonPoints(newWidth, newHeight);
                }
                updateShapes([updatedShape]);
            }
            break;
        }
        case 'rotating': {
            const { initialShapes, center } = interactionState;
            const startAngle = Math.atan2(interactionState.startY - center.y, interactionState.startX - center.x);
            const currentAngle = Math.atan2(y - center.y, x - center.x);
            const angleDelta = currentAngle - startAngle;

            const updated = initialShapes.map(shape => {
                const initialShape = interactionState.initialShapes.find(s => s.id === shape.id)!;
                const newRotation = initialShape.rotation + angleDelta * (180 / Math.PI);
                
                const shapeInitialCenter = {
                    x: initialShape.x + initialShape.width / 2,
                    y: initialShape.y + initialShape.height / 2,
                };

                if (initialShapes.length > 1) {
                    const dxInitial = shapeInitialCenter.x - center.x;
                    const dyInitial = shapeInitialCenter.y - center.y;

                    const newDx = dxInitial * Math.cos(angleDelta) - dyInitial * Math.sin(angleDelta);
                    const newDy = dxInitial * Math.sin(angleDelta) + dyInitial * Math.cos(angleDelta);
                    
                    const newShapeCenter = {
                        x: center.x + newDx,
                        y: center.y + newDy,
                    };
                    
                    return {
                        ...shape,
                        rotation: newRotation,
                        x: newShapeCenter.x - shape.width / 2,
                        y: newShapeCenter.y - shape.height / 2,
                    };
                }

                return { ...shape, rotation: newRotation };
            });

            updateShapes(updated);
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
  }, [interactionState, getScreenPosition, onViewChange, getMousePosition, canvasView, shapes, updateShapes, getSnappedCoords, setMarquee, setActiveSnapLines]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
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

    if (['moving', 'resizing', 'rotating', 'drawing'].includes(interactionState.type)) {
        commitUpdate();
    }
    
    const lastDrawnShape = interactionState.type === 'drawing' ? shapes.find(s => s.id === interactionState.currentShapeId) : null;
    if (lastDrawnShape && (lastDrawnShape.width === 0 && lastDrawnShape.height === 0)) {
        const width = 50, height = 50;
        let updatedShape: Shape = {...lastDrawnShape, width: width, height: height, x: lastDrawnShape.x - 25, y: lastDrawnShape.y - 25}
        if (updatedShape.type === 'polygon') {
            updatedShape.points = getHexagonPoints(width, height);
        } else if (updatedShape.type === 'line') {
            updatedShape.height = 0;
        }
        updateShapes([updatedShape])
    }

    if (interactionState.type !== 'none') {
        setInteractionState({ type: 'none' });
    }
    if (activeTool !== 'select') {
        setActiveTool('select');
    }
  }, [interactionState, marquee, shapes, selectedShapeIds, setSelectedShapeIds, updateShapes, setInteractionState, activeTool, setActiveTool, commitUpdate]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
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
  }, [selectedShapeIds, setSelectedShapeIds, setContextMenu]);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
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
  }, [canvasView, getScreenPosition, onViewChange]);

  return {
    svgRef,
    activeSnapLines,
    marquee,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel
  };
}

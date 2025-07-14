'use client';

import React, { useRef, useState, useCallback } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType, CanvasView, ImageShape, SVGShape, PathShape, TextShape } from '@/lib/types';
import { nanoid } from 'nanoid';
import { getBounds, getHexagonPoints, scalePolygonPoints, scalePathData, getTextDimensions } from '@/lib/geometry';
import { SNAP_THRESHOLD } from '@/lib/constants';

type UseCanvasInteractionsProps = {
  shapes: Shape[];
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[]) => void;
  addShape: (shape: Shape, commit?: boolean) => void;
  updateShapes: (shapes: Shape[]) => void;
  commitUpdate: () => void;
  interactionState: InteractionState;
  setInteractionState: (state: InteractionState) => void;
  setContextMenu: (menu: { x: number; y: number; shapeId: string } | null) => void;
  canvasView: CanvasView;
  onViewChange: (view: Partial<CanvasView>) => void;
  isolationMode: string | null;
  setIsolationMode: (id: string | null) => void;
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
  isolationMode,
  setIsolationMode,
}: UseCanvasInteractionsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<{ vertical: number[], horizontal: number[] }>({ vertical: [], horizontal: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number; } | null>(null);
  const [draftShapes, setDraftShapes] = useState<Shape[]>([]);

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
    const allShapes = [...shapes, ...draftShapes];

    if (canvasView.snapToObjects) {
        const staticShapes = allShapes.filter(s => !ignoreIds.includes(s.id));
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
  }, [shapes, draftShapes, canvasView]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) {
      setContextMenu(null);
    }
    const pos = getMousePosition(e);
    const target = e.target as SVGElement;
    
    if (activeTool === 'pan' || (e.button === 1)) {
        e.stopPropagation();
        const screenPos = getScreenPosition(e);
        setInteractionState({ type: 'panning', startX: screenPos.x, startY: screenPos.y, initialPan: canvasView.pan });
        return;
    }
    
    const { x, y } = pos;

    if (activeTool === 'select') {
        if (e.ctrlKey) {
            e.stopPropagation(); 
            setInteractionState({ type: 'marquee', startX: x, startY: y });
            return;
        }

        const handleName = target.dataset.handle as Handle;
        const initialShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
        if (handleName && initialShapes.length > 0) {
            e.stopPropagation();
            setDraftShapes(initialShapes);
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
        } else {
            const shapeId = target.dataset.shapeId;
            if (shapeId && shapeId !== 'background') {
                const clickedShape = shapes.find(s => s.id === shapeId);
                if (!clickedShape) return;

                // If in isolation mode, and user clicks outside the isolated group, exit isolation mode.
                if (isolationMode && clickedShape.groupId !== isolationMode) {
                    setIsolationMode(null);
                    setSelectedShapeIds([]);
                    return;
                }
                
                const isIsolated = isolationMode === clickedShape.groupId;
                // A "selection unit" is either a single shape, or a whole group.
                const selectionUnitIds = (clickedShape.groupId && !isIsolated) 
                    ? shapes.filter(s => s.groupId === clickedShape.groupId).map(s => s.id)
                    : [shapeId];

                const isUnitSelected = selectionUnitIds.every(id => selectedShapeIds.includes(id));
                let newSelectedIds = [...selectedShapeIds];

                if (e.shiftKey) {
                    if (isUnitSelected) {
                        newSelectedIds = newSelectedIds.filter(id => !selectionUnitIds.includes(id));
                    } else {
                        newSelectedIds.push(...selectionUnitIds);
                    }
                } else if (!isUnitSelected) {
                    newSelectedIds = selectionUnitIds;
                }
                
                const finalIds = [...new Set(newSelectedIds)];
                setSelectedShapeIds(finalIds);

                const movingShapes = shapes.filter(s => finalIds.includes(s.id));
                setDraftShapes(movingShapes);
                setInteractionState({ type: 'moving', startX: x, startY: y, initialShapes: movingShapes });

            } else {
                if (!e.ctrlKey) {
                    setSelectedShapeIds([]);
                    if (isolationMode) {
                        setIsolationMode(null);
                    }
                }
            }
        }
    } else if (activeTool === 'brush') {
        const newShape: PathShape = {
            id: nanoid(),
            type: 'path',
            name: 'Path',
            x: x,
            y: y,
            width: 0,
            height: 0,
            rotation: 0,
            opacity: 1,
            stroke: '#ffffff',
            strokeWidth: 2,
            fill: 'none',
            fillOpacity: 1,
            strokeOpacity: 1,
            d: 'M 0 0',
        };
        setDraftShapes([newShape]);
        setInteractionState({ type: 'brushing', currentShapeId: newShape.id, points: [{ x, y }] });
    } else if (activeTool === 'text') {
        const defaultText = 'Text';
        const defaultFontSize = 48;
        const defaultFontFamily = 'Inter';
        const defaultFontWeight = 'normal';
    
        const { width, height } = getTextDimensions(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight);
    
        const newShape: TextShape = {
            id: nanoid(),
            type: 'text',
            name: 'Text',
            x: pos.x,
            y: pos.y,
            width,
            height,
            rotation: 0,
            opacity: 1,
            text: defaultText,
            fontSize: defaultFontSize,
            fontFamily: defaultFontFamily,
            fontWeight: defaultFontWeight,
            fill: '#ffffff',
        };
        addShape(newShape, true);
        setActiveTool('select');
    } else if (activeTool === 'image') {
        const newShape: ImageShape = {
            id: nanoid(),
            type: 'image',
            name: 'Image',
            x: pos.x - 100,
            y: pos.y - 100,
            width: 200,
            height: 200,
            rotation: 0,
            opacity: 1,
        };
        addShape(newShape, true);
        setActiveTool('select');
    } else if (activeTool === 'svg') {
        const defaultSvgString = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#cccccc" /><text x="50" y="55" font-family="sans-serif" font-size="16" text-anchor="middle" fill="white">SVG</text></svg>`;
        const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(defaultSvgString)))}`;
        const newShape: SVGShape = {
            id: nanoid(),
            type: 'svg',
            name: 'SVG',
            x: pos.x - 50,
            y: pos.y - 50,
            width: 100,
            height: 100,
            rotation: 0,
            opacity: 1,
            svgString: defaultSvgString,
            dataUrl: dataUrl,
        };
        addShape(newShape, true);
        setActiveTool('select');
    } else {
        const shapeName = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
        const commonProps = { id: nanoid(), name: shapeName, x, y, width: 0, height: 0, rotation: 0, opacity: 1, fillOpacity: 1, strokeOpacity: 1 };
        let newShape: Shape;
        
        if(activeTool === 'polygon') {
            newShape = { ...commonProps, type: 'polygon', points: '', fill: '#cccccc', strokeWidth: 0 };
        } else if (activeTool === 'line') {
            newShape = { ...commonProps, type: 'line', stroke: '#ffffff', strokeWidth: 2 };
        } else {
            newShape = { ...commonProps, type: activeTool as 'rectangle' | 'circle', fill: '#cccccc', strokeWidth: 0 };
        }
      setDraftShapes([newShape]);
      setInteractionState({ type: 'drawing', shapeType: activeTool, startX: x, startY: y, currentShapeId: newShape.id });
    }
  }, [getMousePosition, activeTool, shapes, selectedShapeIds, canvasView, getScreenPosition, setContextMenu, setInteractionState, setSelectedShapeIds, addShape, setActiveTool, isolationMode, setIsolationMode]);

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
            setDraftShapes(updated);
            break;
        }
        case 'drawing': {
            const ignoreIds = [interactionState.currentShapeId];
            const snapped = getSnappedCoords(x, y, ignoreIds);
            x = snapped.x;
            y = snapped.y;
            newActiveSnapLines.vertical.push(...snapped.snapLines.vertical);
            newActiveSnapLines.horizontal.push(...snapped.snapLines.horizontal);
            
            const currentShape = draftShapes.find(s => s.id === interactionState.currentShapeId);
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
            setDraftShapes([{ ...currentShape, ...updatedProps }]);
            break;
        }
        case 'resizing': {
            const { initialShapes, handle } = interactionState;
            if (initialShapes.length !== 1) break; 
            
            const initialShape = initialShapes[0];

            if (initialShape.type === 'text') {
                let { x: sx, y: sy } = getMousePosition(e);
                const snappedDx = sx - interactionState.startX;
                const oldWidth = initialShape.width;
                let newWidth = oldWidth + snappedDx;
                
                if (oldWidth > 0) {
                    const scaleFactor = newWidth / oldWidth;
                    const newFontSize = Math.max(8, initialShape.fontSize * scaleFactor);

                    const { width: finalWidth, height: finalHeight } = getTextDimensions(
                        initialShape.text, newFontSize, initialShape.fontFamily, initialShape.fontWeight
                    );
                    
                    const updatedShape: TextShape = {
                        ...initialShape,
                        fontSize: newFontSize,
                        width: finalWidth,
                        height: finalHeight,
                        x: initialShape.x + (oldWidth - finalWidth) / 2,
                        y: initialShape.y + (initialShape.height - finalHeight) / 2,
                    };
                    setDraftShapes([updatedShape]);
                }
                break;
            }

            if (initialShape.rotation === 0) {
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

                    if (changedWidth && !changedHeight) {
                        newBounds.height = newBounds.width / aspectRatio;
                    } else if (!changedWidth && changedHeight) {
                        newBounds.width = newBounds.height * aspectRatio;
                    } else {
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
                    updatedShape.points = scalePolygonPoints(
                        (initialShape as PolygonShape).points,
                        initialShape.width,
                        initialShape.height,
                        updatedShape.width,
                        updatedShape.height
                    );
                } else if (updatedShape.type === 'path') {
                    updatedShape.d = scalePathData(
                        (initialShape as PathShape).d,
                        initialShape.width,
                        initialShape.height,
                        updatedShape.width,
                        updatedShape.height
                    );
                }
                setDraftShapes([updatedShape]);

            } else {
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
                     updatedShape.points = scalePolygonPoints(
                        (initialShape as PolygonShape).points,
                        initialShape.width,
                        initialShape.height,
                        newWidth,
                        newHeight
                    );
                } else if (updatedShape.type === 'path') {
                    updatedShape.d = scalePathData(
                        (initialShape as PathShape).d,
                        initialShape.width,
                        initialShape.height,
                        newWidth,
                        newHeight
                    );
                }
                setDraftShapes([updatedShape]);
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

            setDraftShapes(updated);
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
        case 'brushing': {
            const currentShape = draftShapes.find(s => s.id === interactionState.currentShapeId);
            if (!currentShape || currentShape.type !== 'path') break;
            
            const relX = x - currentShape.x;
            const relY = y - currentShape.y;
            const updatedD = currentShape.d + ` L ${relX.toFixed(2)} ${relY.toFixed(2)}`;
            setDraftShapes([{ ...currentShape, d: updatedD }]);
            
            setInteractionState({
                ...interactionState,
                points: [...interactionState.points, { x, y }]
            });
            break;
        }
    }
    setActiveSnapLines(newActiveSnapLines);
  }, [interactionState, getScreenPosition, onViewChange, getMousePosition, canvasView, shapes, draftShapes, getSnappedCoords, setMarquee, setActiveSnapLines, setInteractionState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (interactionState.type === 'marquee' && marquee) {
        const isShapeInMarquee = (shape: Shape, marqueeBox: typeof marquee) => {
            if (!marqueeBox) return false;
            
            const shapeBounds = getBounds([shape]);
            const marqueeRight = marqueeBox.x + marqueeBox.width;
            const marqueeBottom = marqueeBox.y + marqueeBox.height;

            return (
                shapeBounds.x >= marqueeBox.x &&
                shapeBounds.y >= marqueeBox.y &&
                (shapeBounds.x + shapeBounds.width) <= marqueeRight &&
                (shapeBounds.y + shapeBounds.height) <= marqueeBottom
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

    if (['moving', 'resizing', 'rotating'].includes(interactionState.type)) {
      updateShapes(draftShapes);
      commitUpdate();
    } else if (interactionState.type === 'drawing') {
        const lastDrawnShape = draftShapes.find(s => s.id === interactionState.currentShapeId);
        if (lastDrawnShape) {
            if (lastDrawnShape.width < 1 && lastDrawnShape.height < 1) {
                const width = 50, height = 50;
                let updatedShape: Shape = {...lastDrawnShape, width: width, height: height, x: lastDrawnShape.x - 25, y: lastDrawnShape.y - 25}
                if (updatedShape.type === 'polygon') {
                    (updatedShape as PolygonShape).points = getHexagonPoints(width, height);
                } else if (updatedShape.type === 'line') {
                    updatedShape.height = 0;
                }
                addShape(updatedShape, true);
            } else {
                addShape(lastDrawnShape, true);
            }
        }
    } else if (interactionState.type === 'brushing') {
        const shape = draftShapes.find(s => s.id === interactionState.currentShapeId);
        const points = interactionState.points;
        if (shape && shape.type === 'path' && points.length > 1) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            
            const relativeD = points.map((p, i) => {
                const command = i === 0 ? 'M' : 'L';
                const relX = p.x - minX;
                const relY = p.y - minY;
                return `${command} ${relX.toFixed(2)} ${relY.toFixed(2)}`;
            }).join(' ');

            const finalShape: PathShape = {
                ...(shape as PathShape),
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                d: relativeD,
            };
            addShape(finalShape, true);
        }
    }

    setMarquee(null);
    setActiveSnapLines({ vertical: [], horizontal: [] });
    setDraftShapes([]);

    if (interactionState.type !== 'none' && interactionState.type !== 'panning') {
        setInteractionState({ type: 'none' });
    } else if(interactionState.type === 'panning' && e.button === 1) {
        setInteractionState({ type: 'none' });
    }
    
    if ((interactionState.type === 'drawing' || interactionState.type === 'brushing') && !e.shiftKey) {
        setActiveTool('select');
    }
  }, [
    interactionState,
    marquee,
    shapes,
    selectedShapeIds,
    setSelectedShapeIds,
    draftShapes,
    addShape,
    updateShapes,
    commitUpdate,
    setInteractionState,
    setActiveTool,
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as SVGElement;
    const shapeId = target.dataset.shapeId;

    if (shapeId && shapeId !== 'background') {
        const isAlreadySelected = selectedShapeIds.includes(shapeId);
        
        if (!isAlreadySelected) {
            const clickedShape = shapes.find(s => s.id === shapeId);
            if (clickedShape?.groupId && !isolationMode) {
                 setSelectedShapeIds(shapes.filter(s => s.groupId === clickedShape.groupId).map(s => s.id));
            } else {
                setSelectedShapeIds([shapeId]);
            }
        }
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            shapeId: shapeId,
        });
    } else {
        setContextMenu(null);
    }
  }, [shapes, selectedShapeIds, setSelectedShapeIds, setContextMenu, isolationMode]);
  
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
    draftShapes,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel
  };
}

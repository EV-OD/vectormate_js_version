'use client';

import React, { useMemo } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType, CanvasView, RectangleShape, ImageShape, SVGShape, PathShape } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getBounds, getHexagonPoints } from '@/lib/geometry';
import { useCanvasInteractions } from '@/hooks/use-canvas-interactions';
import { SelectionBox } from './canvas/selection-box';

type CanvasProps = {
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
};

export function Canvas(props: CanvasProps) {
  const { shapes, selectedShapeIds, interactionState, canvasView } = props;

  const {
    svgRef,
    activeSnapLines,
    marquee,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel
  } = useCanvasInteractions(props);

  const selectionBox = useMemo(() => {
    if (selectedShapeIds.length === 0) return null;
    const selected = shapes.filter(s => selectedShapeIds.includes(s.id));
    if (selected.length === 0) return null;
    
    const rotatable = selected.length > 0;

    if (selected.length === 1) {
        const shape = selected[0];
        const bounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
        return { bounds, resizable: true, rotatable, rotation: shape.rotation };
    } else {
        const bounds = getBounds(selected);
        // Resizing multiple objects, especially rotated ones, is complex. Disable for now.
        return { bounds, resizable: false, rotatable, rotation: 0 };
    }
  }, [shapes, selectedShapeIds]);

  return (
    <svg
      id="vector-canvas"
      ref={svgRef}
      className={cn("w-full h-full cursor-crosshair", {
        'cursor-grab': props.activeTool === 'select' && !['resizing', 'marquee', 'moving', 'rotating'].includes(interactionState.type),
        'cursor-grabbing': ['moving', 'panning', 'rotating'].includes(interactionState.type),
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
              className: "transition-all duration-75"
            };
            
            if (rest.type !== 'line') {
              commonProps.opacity = rest.opacity ?? 1;
            }

            if (rest.type === 'rectangle' || rest.type === 'circle' || rest.type === 'polygon') {
              commonProps.fill = rest.fill;
              commonProps.stroke = rest.stroke;
              commonProps.strokeWidth = rest.strokeWidth;
            } else if (rest.type === 'line') {
              commonProps.fill = "none";
              commonProps.stroke = rest.stroke;
              commonProps.strokeWidth = rest.strokeWidth;
            } else if (rest.type === 'path') {
                const pathShape = rest as PathShape;
                commonProps.fill = pathShape.fill;
                commonProps.stroke = pathShape.stroke;
                commonProps.strokeWidth = pathShape.strokeWidth;
            }


            switch (rest.type) {
              case 'rectangle':
                const rect = rest as RectangleShape;
                return <rect key={rect.id} x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={rect.borderRadius} {...commonProps} />;
              case 'circle':
                return <ellipse key={rest.id} cx={rest.x + rest.width / 2} cy={rest.y + rest.height / 2} rx={rest.width / 2} ry={rest.height / 2} {...commonProps} />;
              case 'polygon': {
                  const { transform: polyTransform, ...polyProps } = commonProps;
                  return <polygon key={rest.id} points={rest.points} transform={`translate(${rest.x} ${rest.y}) ${polyTransform}`} {...polyProps} />;
              }
              case 'line': {
                  return <line key={rest.id} x1={rest.x} y1={rest.y} x2={rest.x + rest.width} y2={rest.y + rest.height} {...commonProps} />;
              }
              case 'image': {
                const { href } = rest as ImageShape;
                return <image key={rest.id} href={href} x={rest.x} y={rest.y} width={rest.width} height={rest.height} {...commonProps} />;
              }
              case 'svg': {
                const { svgString } = rest as SVGShape;
                const svgHref = `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svgString))) : ''}`;
                return <image key={rest.id} href={svgHref} x={rest.x} y={rest.y} width={rest.width} height={rest.height} {...commonProps} />;
              }
              case 'path': {
                  const pathShape = rest as PathShape;
                  const { transform: pathTransform, ...pathProps } = commonProps;
                  pathProps.strokeLinecap = "round";
                  pathProps.strokeLinejoin = "round";
                  return (
                    <path
                        key={rest.id}
                        d={pathShape.d}
                        transform={`translate(${rest.x} ${rest.y}) ${pathTransform}`}
                        {...pathProps}
                    />
                  );
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
            <SelectionBox 
              bounds={selectionBox.bounds} 
              rotation={selectionBox.rotation}
              resizable={selectionBox.resizable} 
              rotatable={selectionBox.rotatable} 
              onMouseDown={handleMouseDown} 
              scale={canvasView.scale} 
            />
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

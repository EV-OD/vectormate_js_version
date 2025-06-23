'use client';

import React, { useMemo } from 'react';
import { type Shape, type Tool, type InteractionState, type Handle, PolygonShape, ShapeType, CanvasView, RectangleShape, ImageShape, SVGShape, PathShape, TextShape } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getBounds, getHexagonPoints } from '@/lib/geometry';
import { useCanvasInteractions } from '@/hooks/use-canvas-interactions';
import { SelectionBox } from './canvas/selection-box';
import { ImageIcon } from 'lucide-react';

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
  isolationMode: string | null;
};

export function Canvas(props: CanvasProps) {
  const { shapes, selectedShapeIds, interactionState, canvasView } = props;

  const {
    svgRef,
    activeSnapLines,
    marquee,
    draftShapes,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel
  } = useCanvasInteractions(props);

  const shapesToRender = useMemo(() => {
    const draftIds = new Set(draftShapes.map(d => d.id));
    const staticShapes = shapes.filter(s => !draftIds.has(s.id));
    return [...staticShapes, ...draftShapes];
  }, [shapes, draftShapes]);

  const selectionBox = useMemo(() => {
    const activeShapes = draftShapes.length > 0 ? draftShapes : shapes.filter(s => selectedShapeIds.includes(s.id));
    if (activeShapes.length === 0) return null;
    
    const rotatable = activeShapes.length > 0;

    if (activeShapes.length === 1) {
        const shape = activeShapes[0];
        const bounds = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
        return { bounds, resizable: true, rotatable, rotation: shape.rotation };
    } else {
        const bounds = getBounds(activeShapes);
        // Resizing multiple objects, especially rotated ones, is complex. Disable for now.
        return { bounds, resizable: false, rotatable, rotation: 0 };
    }
  }, [shapes, draftShapes, selectedShapeIds]);

  const clipPathDefs = useMemo(() => {
    return shapes
      .filter((shape) => shape.isClippingMask)
      .map((mask) => {
        const { ...rest } = mask;
        const transform = `rotate(${rest.rotation} ${rest.x + rest.width / 2} ${rest.y + rest.height / 2})`;
        let element;

        switch (rest.type) {
          case 'rectangle': {
            const rect = rest as RectangleShape;
            element = <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={rect.borderRadius} transform={transform} />;
            break;
          }
          case 'circle': {
            element = <ellipse cx={rest.x + rest.width / 2} cy={rest.y + rest.height / 2} rx={rest.width / 2} ry={rest.height / 2} transform={transform} />;
            break;
          }
          case 'polygon': {
            const polyTransform = `translate(${rest.x}, ${rest.y}) ${transform}`;
            element = <polygon points={(rest as PolygonShape).points} transform={polyTransform} />;
            break;
          }
          case 'path': {
            const pathTransform = `translate(${rest.x}, ${rest.y}) ${transform}`;
            element = <path d={(rest as PathShape).d} transform={pathTransform} />;
            break;
          }
          case 'text': {
            const textShape = rest as TextShape;
            element = (
              <text x={textShape.x} y={textShape.y} fontFamily={textShape.fontFamily} fontSize={textShape.fontSize} fontWeight={textShape.fontWeight} dominantBaseline="text-before-edge" transform={transform}>
                {textShape.text}
              </text>
            );
            break;
          }
          default:
            element = null;
        }

        if (!element) return null;

        return (
          <clipPath key={`clip-path-${mask.id}`} id={`clip-${mask.id}`}>
            {element}
          </clipPath>
        );
      });
  }, [shapes]);

  return (
    <svg
      id="vector-canvas"
      ref={svgRef}
      className={cn("w-full h-full cursor-crosshair", {
        'cursor-grab': props.activeTool === 'pan' || (props.activeTool === 'select' && !['resizing', 'marquee', 'moving', 'rotating', 'editing'].includes(interactionState.type)),
        'cursor-grabbing': ['moving', 'panning', 'rotating'].includes(interactionState.type),
        'cursor-nwse-resize': interactionState.type === 'resizing' && (interactionState.handle === 'nw' || interactionState.handle === 'se'),
        'cursor-nesw-resize': interactionState.type === 'resizing' && (interactionState.handle === 'ne' || interactionState.handle === 'sw'),
        'cursor-ns-resize': interactionState.type === 'resizing' && (interactionState.handle === 'n' || interactionState.handle === 's'),
        'cursor-ew-resize': interactionState.type === 'resizing' && (interactionState.handle === 'w' || interactionState.handle === 'e'),
        'cursor-text': props.activeTool === 'text',
      })}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
        <defs>
            {clipPathDefs}
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
          {shapesToRender.map(shape => {
            const { ...rest } = shape;
            const commonProps: any = {
              'data-shape-id': rest.id,
              transform: `rotate(${rest.rotation} ${rest.x + rest.width / 2} ${rest.y + rest.height / 2})`,
            };

            if (rest.clippedBy) {
                commonProps.clipPath = `url(#clip-${rest.clippedBy})`;
            }
            if (rest.strokeDasharray) {
                commonProps.strokeDasharray = rest.strokeDasharray;
            }
            
            if (rest.type !== 'line') {
              commonProps.opacity = rest.opacity ?? 1;
            }

            if (rest.type === 'rectangle' || rest.type === 'circle' || rest.type === 'polygon') {
              commonProps.fill = rest.fill;
              commonProps.fillOpacity = rest.fillOpacity ?? 1;
              commonProps.stroke = rest.stroke;
              commonProps.strokeOpacity = rest.strokeOpacity ?? 1;
              commonProps.strokeWidth = rest.strokeWidth;
            } else if (rest.type === 'line') {
              commonProps.fill = "none";
              commonProps.stroke = rest.stroke;
              commonProps.strokeOpacity = rest.strokeOpacity ?? 1;
              commonProps.strokeWidth = rest.strokeWidth;
            } else if (rest.type === 'path') {
                const pathShape = rest as PathShape;
                commonProps.fill = pathShape.fill;
                commonProps.fillOpacity = pathShape.fillOpacity ?? 1;
                commonProps.stroke = pathShape.stroke;
                commonProps.strokeOpacity = pathShape.strokeOpacity ?? 1;
                commonProps.strokeWidth = pathShape.strokeWidth;
            }

            const isInteracting = ['moving', 'resizing', 'rotating', 'editing'].includes(interactionState.type);
            const isSelectedForInteraction = isInteracting && selectedShapeIds.includes(rest.id);

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
                  const HIT_AREA_PADDING = 10;
                  return (
                      <g key={rest.id}>
                          {/* Visible line */}
                          <line x1={rest.x} y1={rest.y} x2={rest.x + rest.width} y2={rest.y + rest.height} {...commonProps} />
                          {/* Invisible hit area */}
                          <line
                              x1={rest.x} y1={rest.y}
                              x2={rest.x + rest.width} y2={rest.y + rest.height}
                              transform={commonProps.transform}
                              data-shape-id={rest.id}
                              stroke="transparent"
                              strokeWidth={(rest.strokeWidth || 0) + HIT_AREA_PADDING}
                              className="cursor-pointer"
                          />
                      </g>
                  );
              }
              case 'image': {
                const imageShape = rest as ImageShape;
                const href = (isSelectedForInteraction && imageShape.lowQualityHref) 
                    ? imageShape.lowQualityHref 
                    : imageShape.href;
                const imageRendering = (isSelectedForInteraction && imageShape.lowQualityHref) 
                    ? "pixelated" 
                    : "auto";

                if (!href) {
                  return (
                    <g key={imageShape.id} {...commonProps}>
                      <rect
                        x={imageShape.x}
                        y={imageShape.y}
                        width={imageShape.width}
                        height={imageShape.height}
                        fill="hsl(var(--muted))"
                        stroke="hsl(var(--border))"
                        strokeDasharray="4"
                        data-shape-id={imageShape.id}
                      />
                       <foreignObject 
                          x={imageShape.x} y={imageShape.y} 
                          width={imageShape.width} height={imageShape.height}
                          style={{ pointerEvents: 'none' }}
                        >
                          <div className="flex items-center justify-center h-full w-full">
                              <ImageIcon className="text-muted-foreground" size={Math.min(imageShape.width, imageShape.height) * 0.5}/>
                          </div>
                      </foreignObject>
                    </g>
                  );
                }

                return <image key={imageShape.id} href={href} x={imageShape.x} y={imageShape.y} width={imageShape.width} height={imageShape.height} {...commonProps} style={{ imageRendering }}/>;
              }
              case 'svg': {
                const { dataUrl } = rest as SVGShape;
                 if (isSelectedForInteraction) {
                    return <rect key={rest.id} x={rest.x} y={rest.y} width={rest.width} height={rest.height} fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeDasharray="4" strokeWidth={1 / canvasView.scale} {...commonProps} />;
                }
                return <image key={rest.id} href={dataUrl} x={rest.x} y={rest.y} width={rest.width} height={rest.height} {...commonProps} />;
              }
              case 'path': {
                  const pathShape = rest as PathShape;
                  const { transform: pathTransform, ...pathProps } = commonProps;
                  pathProps.strokeLinecap = "round";
                  pathProps.strokeLinejoin = "round";
                  const HIT_AREA_PADDING = 10;
                  const transform = `translate(${rest.x} ${rest.y}) ${pathTransform}`;
                  
                  return (
                      <g key={rest.id}>
                          <path
                              d={pathShape.d}
                              transform={transform}
                              {...pathProps}
                          />
                          <path
                              d={pathShape.d}
                              transform={transform}
                              data-shape-id={rest.id}
                              stroke="transparent"
                              fill="none"
                              strokeWidth={(pathShape.strokeWidth || 0) + HIT_AREA_PADDING}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="cursor-pointer"
                          />
                      </g>
                  );
              }
              case 'text': {
                const textShape = rest as TextShape;
                return (
                    <text
                        key={textShape.id}
                        x={textShape.x}
                        y={textShape.y}
                        fontFamily={textShape.fontFamily}
                        fontSize={textShape.fontSize}
                        fontWeight={textShape.fontWeight}
                        fill={textShape.fill}
                        stroke={textShape.stroke}
                        strokeWidth={textShape.strokeWidth}
                        dominantBaseline="text-before-edge"
                        style={{ userSelect: 'none' }}
                        {...commonProps}
                    >
                        {textShape.text}
                    </text>
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

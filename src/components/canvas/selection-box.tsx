'use client';

import React from 'react';
import { type Handle } from '@/lib/types';
import { SELECTION_COLOR, HANDLE_SIZE, ROTATE_HANDLE_OFFSET } from '@/lib/constants';

const getHandlePosition = (handle: Handle, box: { x: number; y: number; width: number; height: number; }, scale: number) => {
    const { x, y, width, height } = box;
    const halfW = width / 2;
    const halfH = height / 2;
    switch (handle) {
        case 'nw': return { x: 0, y: 0 };
        case 'n': return { x: halfW, y: 0 };
        case 'ne': return { x: width, y: 0 };
        case 'w': return { x: 0, y: halfH };
        case 'e': return { x: width, y: halfH };
        case 'sw': return { x: 0, y: height };
        case 's': return { x: halfW, y: height };
        case 'se': return { x: width, y: height };
        case 'rotate': return { x: halfW, y: -ROTATE_HANDLE_OFFSET / scale };
    }
};

export const SelectionBox = ({
    bounds,
    rotation,
    resizable,
    rotatable,
    onMouseDown,
    scale,
}: {
    bounds: { x: number; y: number; width: number; height: number; };
    rotation: number;
    resizable: boolean;
    rotatable: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    scale: number;
}) => {
    if (bounds.width === 0 && bounds.height === 0) return null;

    const handles: { name: Handle; cursor: string }[] = [
        { name: 'nw', cursor: 'cursor-nwse-resize' }, { name: 'n', cursor: 'cursor-ns-resize' }, { name: 'ne', cursor: 'cursor-nesw-resize' },
        { name: 'w', cursor: 'cursor-ew-resize' }, { name: 'e', cursor: 'cursor-ew-resize' },
        { name: 'sw', cursor: 'cursor-nesw-resize' }, { name: 's', cursor: 'cursor-ns-resize' }, { name: 'se', cursor: 'cursor-nwse-resize' },
    ];
    
    const handleSize = HANDLE_SIZE / scale;

    const boxCenter = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
    };

    return (
        <g transform={`rotate(${rotation || 0} ${boxCenter.x} ${boxCenter.y})`}>
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
                const pos = getHandlePosition(name, {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}, scale);
                return (
                    <rect
                        key={name}
                        x={pos.x - handleSize / 2}
                        y={pos.y - handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill={SELECTION_COLOR}
                        stroke="hsl(var(--background))"
                        strokeWidth={1 / scale}
                        className={cursor}
                        data-handle={name}
                        onMouseDown={onMouseDown}
                        transform={`translate(${bounds.x}, ${bounds.y})`}
                    />
                );
            })}
            {rotatable && (() => {
                const topCenter = getHandlePosition('n', {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}, scale);
                const rotHandlePos = getHandlePosition('rotate', {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height}, scale);
                return (
                    <g transform={`translate(${bounds.x}, ${bounds.y})`}>
                        <line x1={topCenter.x} y1={topCenter.y} x2={rotHandlePos.x} y2={rotHandlePos.y} stroke={SELECTION_COLOR} strokeWidth={1 / scale} />
                        <circle
                            cx={rotHandlePos.x}
                            cy={rotHandlePos.y}
                            r={handleSize / 1.5}
                            fill={SELECTION_COLOR}
                            stroke="hsl(var(--background))"
                            strokeWidth={1 / scale}
                            className="cursor-grabbing"
                            data-handle="rotate"
                            onMouseDown={onMouseDown}
                        />
                    </g>
                )
            })()}
        </g>
    );
};
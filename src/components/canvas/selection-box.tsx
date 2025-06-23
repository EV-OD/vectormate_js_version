'use client';

import React from 'react';
import { type Handle } from '@/lib/types';
import { SELECTION_COLOR, HANDLE_SIZE, ROTATE_HANDLE_OFFSET } from '@/lib/constants';

const getHandlePosition = (handle: Handle, box: { x: number; y: number; width: number; height: number; }, scale: number) => {
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
        case 'rotate': return { x: x + halfW, y: y - ROTATE_HANDLE_OFFSET / scale };
    }
};

export const SelectionBox = ({
    bounds,
    resizable,
    rotatable,
    onMouseDown,
    scale,
}: {
    bounds: { x: number; y: number; width: number; height: number; };
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
                const pos = getHandlePosition(name, bounds, scale);
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
                    />
                );
            })}
            {rotatable && (() => {
                const topCenter = getHandlePosition('n', bounds, scale);
                const rotHandlePos = getHandlePosition('rotate', bounds, scale);
                return (
                    <g>
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

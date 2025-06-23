'use client';

import React from 'react';
import { type Shape, RectangleShape, ImageShape, SVGShape, PolygonShape, PathShape } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Download, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayersPanel } from './layers-panel';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { scalePolygonPoints, scalePathData } from '@/lib/geometry';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RightSidebarProps = {
  shapes: Shape[];
  selectedShapeIds: string[];
  onShapesUpdate: (updatedShapes: Shape[], commit: boolean) => void;
  onCommit: () => void;
  onSelectShape: (id: string, shiftKey: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (fromId: string, toId: string, position: 'top' | 'bottom') => void;
  onRename: (id: string, name: string) => void;
  onExportSelection: (format: 'svg' | 'jpeg') => void;
};

export function RightSidebar({ 
  shapes, 
  selectedShapeIds, 
  onShapesUpdate, 
  onCommit,
  onSelectShape, 
  onDelete, 
  onDuplicate, 
  onReorder,
  onRename,
  onExportSelection,
}: RightSidebarProps) {
  
  const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
  const shape = selectedShapes[0];
  const multipleSelected = selectedShapes.length > 1;

  const isSingleRectangle = selectedShapes.length === 1 && shape?.type === 'rectangle';
  const isSingleImage = selectedShapes.length === 1 && shape?.type === 'image';
  const isSingleSvg = selectedShapes.length === 1 && shape?.type === 'svg';
  const isSinglePath = selectedShapes.length === 1 && shape?.type === 'path';
  
  const showFill = selectedShapes.every(s => !['line', 'image', 'svg'].includes(s.type));
  const showStroke = selectedShapes.every(s => !['image', 'svg'].includes(s.type));
  const showOpacity = selectedShapes.every(s => s.type !== 'line');


  const handlePropertyChange = (prop: keyof Shape | 'href' | 'svgString' | 'd', value: any, commit: boolean = false) => {
    const updated = selectedShapes.map(s => {
      const newShape = { ...s };

      if ((prop === 'fill' || prop === 'opacity') && newShape.type === 'line') {
        return s;
      }
      if (prop === 'borderRadius' && newShape.type !== 'rectangle') {
        return s;
      }
      
      const numericProps = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'fillOpacity', 'strokeOpacity', 'strokeWidth', 'borderRadius'];
      if(numericProps.includes(prop as string)) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            if ((prop === 'width' || prop === 'height')) {
                const oldWidth = newShape.width;
                const oldHeight = newShape.height;
                const newWidth = prop === 'width' ? numValue : oldWidth;
                const newHeight = prop === 'height' ? numValue : oldHeight;

                if (newShape.type === 'polygon') {
                    const originalPoints = (s as PolygonShape).points;
                    (newShape as PolygonShape).points = scalePolygonPoints(originalPoints, oldWidth, oldHeight, newWidth, newHeight);
                } else if (newShape.type === 'path') {
                    const originalD = (s as PathShape).d;
                    (newShape as PathShape).d = scalePathData(originalD, oldWidth, oldHeight, newWidth, newHeight);
                }
            }
            (newShape as any)[prop] = numValue;
        }
      } else {
        (newShape as any)[prop] = value;
      }
      
      return newShape;
    });

    onShapesUpdate(updated, commit);
  };
  
  const getCommonValue = (prop: keyof Shape | 'href' | 'svgString'): string | number => {
    if (!shape) return '';
    const firstValue = (shape as any)[prop];
    if (multipleSelected) {
        const allSame = selectedShapes.every(s => (s as any)[prop] === firstValue);
        if (!allSame) return 'Mixed';
    }
    if (typeof firstValue === 'number') return Math.round(firstValue);
    return firstValue ?? '';
  }

  const getSliderValue = (prop: keyof Shape, multiplier: number = 1, defaultValue: number = 0): number => {
      if (!shape) return defaultValue;
      const firstValue = (shape as any)[prop];
      if (typeof firstValue === 'number') {
        return firstValue * multiplier;
      }
      return defaultValue;
  }

  return (
    <aside className="w-64 border-l bg-card text-card-foreground flex flex-col">
      <Tabs defaultValue="properties" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b shrink-0">
          <TabsTrigger value="properties" className="rounded-none">Properties</TabsTrigger>
          <TabsTrigger value="layers" className="rounded-none">Layers</TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="flex-1 min-h-0">
           <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {selectedShapes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground text-center">Select an object to see its properties.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold font-headline">
                      {multipleSelected ? `${selectedShapes.length} items` : (shape.name || shape.type.charAt(0).toUpperCase() + shape.type.slice(1))}
                    </h2>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Download className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onExportSelection('svg')}>
                              Export as SVG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onExportSelection('jpeg')}>
                              Export as JPEG
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      <Button variant="ghost" size="icon" onClick={onDelete}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Accordion type="multiple" defaultValue={['transform', 'content', 'appearance']} className="w-full">
                    <AccordionItem value="transform">
                      <AccordionTrigger>Transform</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                          <div>
                            <Label htmlFor="pos-x">X</Label>
                            <Input id="pos-x" type="number" value={getCommonValue('x')} onChange={e => handlePropertyChange('x', e.target.value)} onBlur={onCommit} disabled={multipleSelected} />
                          </div>
                          <div>
                            <Label htmlFor="pos-y">Y</Label>
                            <Input id="pos-y" type="number" value={getCommonValue('y')} onChange={e => handlePropertyChange('y', e.target.value)} onBlur={onCommit} disabled={multipleSelected} />
                          </div>
                          <div>
                            <Label htmlFor="width">W</Label>
                            <Input id="width" type="number" value={getCommonValue('width')} onChange={e => handlePropertyChange('width', Math.max(0, Number(e.target.value)))} onBlur={onCommit} disabled={multipleSelected}/>
                          </div>
                          <div>
                            <Label htmlFor="height">H</Label>
                            <Input id="height" type="number" value={getCommonValue('height')} onChange={e => handlePropertyChange('height', Math.max(0, Number(e.target.value)))} onBlur={onCommit} disabled={multipleSelected}/>
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="rotation">Rotate</Label>
                            <Input id="rotation" type="number" value={getCommonValue('rotation')} onChange={e => handlePropertyChange('rotation', e.target.value)} onBlur={onCommit} disabled={multipleSelected}/>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    {(isSingleImage || isSingleSvg || isSinglePath) && (
                      <AccordionItem value="content">
                        <AccordionTrigger>Content</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4">
                                {isSingleImage && (
                                    <div>
                                        <Label htmlFor="image-href">Image URL</Label>
                                        <Input id="image-href" value={(shape as ImageShape).href || ''} onChange={e => handlePropertyChange('href', e.target.value)} onBlur={onCommit} />
                                    </div>
                                )}
                                {isSingleSvg && (
                                    <div>
                                        <Label htmlFor="svg-string">SVG Content</Label>
                                        <Textarea id="svg-string" value={(shape as SVGShape).svgString || ''} onChange={e => handlePropertyChange('svgString', e.target.value)} onBlur={onCommit} rows={6}/>
                                    </div>
                                )}
                                {isSinglePath && (
                                    <div>
                                        <Label htmlFor="path-d">Path Data</Label>
                                        <Textarea id="path-d" value={(shape as PathShape).d || ''} onChange={e => handlePropertyChange('d', e.target.value)} onBlur={onCommit} rows={6}/>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    <AccordionItem value="appearance">
                      <AccordionTrigger>Appearance</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {showFill && (
                            <>
                              <div>
                                <Label>Fill</Label>
                                <div className="flex items-center gap-2">
                                  <Input type="color" value={String(getCommonValue('fill') ?? '#cccccc')} onChange={e => handlePropertyChange('fill', e.target.value, true)} className="p-1 h-8 w-8" />
                                  <Input type="text" value={String(getCommonValue('fill') ?? '')} onChange={e => handlePropertyChange('fill', e.target.value)} onBlur={onCommit} placeholder={getCommonValue('fill') === 'Mixed' ? 'Mixed' : '#cccccc'} />
                                </div>
                              </div>
                              <div>
                                <Label>Fill Opacity</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[getSliderValue('fillOpacity', 100, 100)]}
                                    onValueChange={([val]) => handlePropertyChange('fillOpacity', val / 100)}
                                    onValueCommit={onCommit}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{getCommonValue('fillOpacity') === 'Mixed' ? 'Mixed' : `${Math.round(getSliderValue('fillOpacity', 100, 100))}%`}</span>
                                </div>
                              </div>
                              <Separator/>
                            </>
                          )}

                          {showOpacity && (
                             <div>
                                <Label>Object Opacity</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[getSliderValue('opacity', 100, 100)]}
                                    onValueChange={([val]) => handlePropertyChange('opacity', val / 100)}
                                    onValueCommit={onCommit}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{getCommonValue('opacity') === 'Mixed' ? 'Mixed' : `${Math.round(getSliderValue('opacity', 100, 100))}%`}</span>
                                </div>
                              </div>
                          )}

                          {isSingleRectangle && (
                            <>
                             <Separator/>
                              <div>
                                <Label>Border Radius</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[(shape as RectangleShape).borderRadius || 0]}
                                    onValueChange={([val]) => handlePropertyChange('borderRadius', val)}
                                    onValueCommit={onCommit}
                                    max={Math.min(shape.width, shape.height) / 2}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{Math.round((shape as RectangleShape).borderRadius || 0)}px</span>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {showStroke && (
                            <>
                              <Separator />
                              <div>
                                <Label>Stroke</Label>
                                <div className="flex items-center gap-2">
                                  <Input type="color" value={String(getCommonValue('stroke') ?? '#000000')} onChange={e => handlePropertyChange('stroke', e.target.value, true)} className="p-1 h-8 w-8" />
                                  <Input type="text" value={String(getCommonValue('stroke') ?? '')} onChange={e => handlePropertyChange('stroke', e.target.value)} onBlur={onCommit} placeholder={getCommonValue('stroke') === 'Mixed' ? 'Mixed' : '#000000'} />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="stroke-width">Stroke Width</Label>
                                <Input id="stroke-width" type="number" value={String(getCommonValue('strokeWidth') ?? '0')} min={0} onChange={e => handlePropertyChange('strokeWidth', e.target.value)} onBlur={onCommit} />
                              </div>
                              <div>
                                <Label>Stroke Opacity</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[getSliderValue('strokeOpacity', 100, 100)]}
                                    onValueChange={([val]) => handlePropertyChange('strokeOpacity', val / 100)}
                                    onValueCommit={onCommit}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{getCommonValue('strokeOpacity') === 'Mixed' ? 'Mixed' : `${Math.round(getSliderValue('strokeOpacity', 100, 100))}%`}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </>
              )}
            </div>
           </ScrollArea>
        </TabsContent>
        <TabsContent value="layers" className="flex-1 min-h-0">
          <LayersPanel 
            shapes={shapes}
            selectedShapeIds={selectedShapeIds}
            onSelectShape={onSelectShape}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onReorder={onReorder}
            onRename={onRename}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

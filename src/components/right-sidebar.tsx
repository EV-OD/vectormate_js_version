'use client';

import React from 'react';
import { type Shape, RectangleShape } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayersPanel } from './layers-panel';
import { ScrollArea } from './ui/scroll-area';

type RightSidebarProps = {
  shapes: Shape[];
  selectedShapeIds: string[];
  onShapesUpdate: (updatedShapes: Shape[]) => void;
  onSelectShape: (id: string, shiftKey: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (fromId: string, toId: string, position: 'top' | 'bottom') => void;
  onRename: (id: string, name: string) => void;
};

export function RightSidebar({ 
  shapes, 
  selectedShapeIds, 
  onShapesUpdate, 
  onSelectShape, 
  onDelete, 
  onDuplicate, 
  onReorder,
  onRename,
}: RightSidebarProps) {
  
  const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
  const shape = selectedShapes[0];
  const multipleSelected = selectedShapes.length > 1;

  const isSingleRectangle = selectedShapes.length === 1 && shape?.type === 'rectangle';
  const showFillAndOpacity = selectedShapes.some(s => s.type !== 'line');

  const handlePropertyChange = (prop: keyof Shape, value: any) => {
    const updated = selectedShapes.map(s => {
      const newShape = { ...s };

      if ((prop === 'fill' || prop === 'opacity') && newShape.type === 'line') {
        return s;
      }
      if (prop === 'borderRadius' && newShape.type !== 'rectangle') {
        return s;
      }
      
      const numericProps = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'strokeWidth', 'borderRadius'];
      if(numericProps.includes(prop as string)) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            (newShape as any)[prop] = numValue;
        }
      } else {
        (newShape as any)[prop] = value;
      }
      
      return newShape;
    });

    onShapesUpdate(updated);
  };
  
  const getCommonValue = (prop: keyof Shape): string | number => {
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
                    <Button variant="ghost" size="icon" onClick={onDelete}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Accordion type="multiple" defaultValue={['transform', 'appearance']} className="w-full">
                    <AccordionItem value="transform">
                      <AccordionTrigger>Transform</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                          <div>
                            <Label htmlFor="pos-x">X</Label>
                            <Input id="pos-x" type="number" value={getCommonValue('x')} onChange={e => handlePropertyChange('x', e.target.value)} disabled={multipleSelected} />
                          </div>
                          <div>
                            <Label htmlFor="pos-y">Y</Label>
                            <Input id="pos-y" type="number" value={getCommonValue('y')} onChange={e => handlePropertyChange('y', e.target.value)} disabled={multipleSelected} />
                          </div>
                          <div>
                            <Label htmlFor="width">W</Label>
                            <Input id="width" type="number" value={getCommonValue('width')} onChange={e => handlePropertyChange('width', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                          </div>
                          <div>
                            <Label htmlFor="height">H</Label>
                            <Input id="height" type="number" value={getCommonValue('height')} onChange={e => handlePropertyChange('height', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="rotation">Rotate</Label>
                            <Input id="rotation" type="number" value={getCommonValue('rotation')} onChange={e => handlePropertyChange('rotation', e.target.value)} disabled={multipleSelected}/>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="appearance">
                      <AccordionTrigger>Appearance</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          {showFillAndOpacity && (
                            <>
                              <div>
                                <Label>Fill</Label>
                                <div className="flex items-center gap-2">
                                  <Input type="color" value={String(getCommonValue('fill') ?? '#cccccc')} onChange={e => handlePropertyChange('fill', e.target.value)} className="p-1 h-8 w-8" />
                                  <Input type="text" value={String(getCommonValue('fill') ?? '')} onChange={e => handlePropertyChange('fill', e.target.value)} placeholder={getCommonValue('fill') === 'Mixed' ? 'Mixed' : '#cccccc'} />
                                </div>
                              </div>
                              <div>
                                <Label>Opacity</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[getSliderValue('opacity', 100, 100)]}
                                    onValueChange={([val]) => handlePropertyChange('opacity', val / 100)}
                                    max={100}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{getCommonValue('opacity') === 'Mixed' ? 'Mixed' : `${Math.round(getSliderValue('opacity', 100, 100))}%`}</span>
                                </div>
                              </div>
                              <Separator/>
                            </>
                          )}

                          {isSingleRectangle && (
                            <>
                              <div>
                                <Label>Border Radius</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[(shape as RectangleShape).borderRadius || 0]}
                                    onValueChange={([val]) => handlePropertyChange('borderRadius', val)}
                                    max={Math.min(shape.width, shape.height) / 2}
                                    step={1}
                                  />
                                  <span className="text-sm text-muted-foreground w-12 text-right">{Math.round((shape as RectangleShape).borderRadius || 0)}px</span>
                                </div>
                              </div>
                              <Separator />
                            </>
                          )}
                          
                          <div>
                            <Label>Stroke</Label>
                            <div className="flex items-center gap-2">
                              <Input type="color" value={String(getCommonValue('stroke') ?? '#000000')} onChange={e => handlePropertyChange('stroke', e.target.value)} className="p-1 h-8 w-8" />
                              <Input type="text" value={String(getCommonValue('stroke') ?? '')} onChange={e => handlePropertyChange('stroke', e.target.value)} placeholder={getCommonValue('stroke') === 'Mixed' ? 'Mixed' : '#000000'} />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="stroke-width">Stroke Width</Label>
                            <Input id="stroke-width" type="number" value={String(getCommonValue('strokeWidth') ?? '0')} min={0} onChange={e => handlePropertyChange('strokeWidth', e.target.value)} />
                          </div>
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

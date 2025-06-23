'use client';

import React from 'react';
import { type Shape, RectangleShape } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayersPanel } from './layers-panel';

type RightSidebarProps = {
  shapes: Shape[];
  selectedShapeIds: string[];
  onShapesUpdate: (updatedShapes: Shape[]) => void;
  onSelectShape: (id: string, shiftKey: boolean) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReorder: (fromId: string, toId: string) => void;
};

export function RightSidebar({ 
  shapes, 
  selectedShapeIds, 
  onShapesUpdate, 
  onSelectShape, 
  onDelete, 
  onDuplicate, 
  onReorder 
}: RightSidebarProps) {
  
  const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
  const shape = selectedShapes[0];
  const multipleSelected = selectedShapes.length > 1;
  const isSingleRectangle = selectedShapes.length === 1 && shape.type === 'rectangle';

  const handlePropertyChange = (prop: keyof Shape, value: any) => {
    let updatedShapes;
    if (prop === 'fill' || prop === 'opacity') {
        updatedShapes = selectedShapes
            .filter(s => s.type !== 'line')
            .map(s => ({...s, [prop]: value}));
    } else if (multipleSelected) {
        updatedShapes = selectedShapes.map(s => ({...s, [prop]: value}));
    } else {
        updatedShapes = [{ ...shape, [prop]: value }];
    }
    onShapesUpdate(updatedShapes);
  };
  
  const showFillAndOpacity = selectedShapes.every(s => s.type !== 'line');

  return (
    <aside className="w-64 border-l bg-card text-card-foreground flex flex-col">
      <Tabs defaultValue="properties" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
          <TabsTrigger value="properties" className="rounded-none">Properties</TabsTrigger>
          <TabsTrigger value="layers" className="rounded-none">Layers</TabsTrigger>
        </TabsList>
        <TabsContent value="properties" className="flex-1 overflow-auto">
           {selectedShapes.length === 0 ? (
            <div className="p-4 flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select an object to see its properties.</p>
            </div>
           ) : (
            <div className="p-4 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold font-headline">
                  {multipleSelected ? `${selectedShapes.length} items` : shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}
                </h2>
                <Button variant="ghost" size="icon" onClick={onDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Accordion type="multiple" defaultValue={['transform', 'appearance']} className="w-full">
                <AccordionItem value="transform">
                  <AccordionTrigger>Transform</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="pos-x">X</Label>
                        <Input id="pos-x" type="number" value={Math.round(shape.x)} onChange={e => handlePropertyChange('x', Number(e.target.value))} disabled={multipleSelected} />
                      </div>
                      <div>
                        <Label htmlFor="pos-y">Y</Label>
                        <Input id="pos-y" type="number" value={Math.round(shape.y)} onChange={e => handlePropertyChange('y', Number(e.target.value))} disabled={multipleSelected} />
                      </div>
                      <div>
                        <Label htmlFor="width">W</Label>
                        <Input id="width" type="number" value={Math.round(shape.width)} onChange={e => handlePropertyChange('width', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                      </div>
                      <div>
                        <Label htmlFor="height">H</Label>
                        <Input id="height" type="number" value={Math.round(shape.height)} onChange={e => handlePropertyChange('height', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="rotation">Rotate</Label>
                        <Input id="rotation" type="number" value={Math.round(shape.rotation)} onChange={e => handlePropertyChange('rotation', Number(e.target.value))} disabled={multipleSelected}/>
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
                              <Input type="color" value={shape.fill || '#cccccc'} onChange={e => handlePropertyChange('fill', e.target.value)} className="p-1 h-8 w-8" />
                              <Input type="text" value={shape.fill || '#cccccc'} onChange={e => handlePropertyChange('fill', e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <Label>Opacity</Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                value={[(shape.opacity || 1) * 100]}
                                onValueChange={([val]) => handlePropertyChange('opacity', val / 100)}
                                max={100}
                                step={1}
                              />
                              <span className="text-sm text-muted-foreground w-12 text-right">{Math.round((shape.opacity || 1) * 100)}%</span>
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
                          <Input type="color" value={shape.stroke || '#000000'} onChange={e => handlePropertyChange('stroke', e.target.value)} className="p-1 h-8 w-8" />
                          <Input type="text" value={shape.stroke || '#000000'} onChange={e => handlePropertyChange('stroke', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="stroke-width">Stroke Width</Label>
                        <Input id="stroke-width" type="number" value={Math.round(shape.strokeWidth || 0)} min={0} onChange={e => handlePropertyChange('strokeWidth', Math.max(0, Number(e.target.value)))} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
           )}
        </TabsContent>
        <TabsContent value="layers" className="flex-1">
          <LayersPanel 
            shapes={shapes}
            selectedShapeIds={selectedShapeIds}
            onSelectShape={onSelectShape}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onReorder={onReorder}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

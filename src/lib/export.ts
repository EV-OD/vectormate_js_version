import { type Shape, type CanvasView } from '@/lib/types';

function shapeToSvgElement(shape: Shape): string {
  const common_attrs = `transform="rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})" fill="${shape.fill}" fillOpacity="${shape.opacity}"`;
  switch (shape.type) {
    case 'rectangle':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ${common_attrs} />`;
    case 'circle':
      return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${common_attrs} />`;
    case 'polygon':
       const transform = `translate(${shape.x}, ${shape.y})`;
       return `<polygon points="${shape.points}" transform="${transform} rotate(${shape.rotation} ${shape.width / 2} ${shape.height / 2})" fill="${shape.fill}" fill-opacity="${shape.opacity}" />`;
  }
}

export function exportToSvg(shapes: Shape[], width: number, height: number, view: CanvasView) {
  const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="hsl(var(--background))" />
  <g transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})">
    ${shapes.map(shapeToSvgElement).join('\n  ')}
  </g>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'design.svg');
}

export function exportToJpeg(shapes: Shape[], width: number, height: number, view: CanvasView) {
  const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="hsl(var(--background))" />
  <g transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})">
    ${shapes.map(shapeToSvgElement).join('\n  ')}
  </g>
</svg>`;
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);
    const jpegUrl = canvas.toDataURL('image/jpeg');
    triggerDownload(jpegUrl, 'design.jpg');
  };
  img.onerror = (e) => {
    console.error("Failed to load SVG image for JPEG conversion", e);
    URL.revokeObjectURL(svgUrl);
  }
  img.src = svgUrl;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

# VectorMate: A Modern Vector Editor

Welcome to VectorMate! This is a powerful, web-based vector editor designed for creating and manipulating shapes with ease. This guide will walk you through the key features and controls.

## The Canvas

The canvas is your infinite workspace. You can navigate it using the Pan tool.

### Navigation
- **Pan:** Select the **Hand Tool** (`H`) from the toolbar or simply hold the **Spacebar** key. Click and drag on the canvas to move your view.
- **Zoom:** Use your mouse scroll wheel to zoom in and out. The canvas will zoom relative to your cursor's position.

### View Settings
In the top-right header, click the **View** button to customize your canvas:
- **Background:** Choose between a `Solid` color, a `Grid`, or `Dots`.
- **Snapping:** Enable `Snap to Grid` and `Snap to Objects` for precise alignment.

## Toolbar (Left Side)

The toolbar contains all your primary tools for creating and interacting with objects.

| Icon | Tool | Shortcut | Description |
| :--- | :--- | :--- | :--- |
| 🖐️ | **Select** | `V` | The main tool for selecting, moving, resizing, and rotating objects. |
| ✋ | **Pan** | `H` | Click and drag to move around the canvas. Hold **Spacebar** to use it temporarily. |
| ▭ | **Shape Tools** | `R`, `O`, `P`, `L` | Click the icon to see a dropdown of available shapes: Rectangle (`R`), Circle (`O`), Polygon (`P`), and Line (`L`). |
| 🖌️ | **Brush** | `B` | Draw freeform paths. |
| 🔳 | **Boolean Ops** | - | Combine two selected shapes with Union, Subtract, Intersect, or Exclude. |
| 🖼️ | **Add Image** | - | Upload a raster image (PNG, JPG) to the canvas. |
| ✨ | **Add SVG** | - | Upload an SVG file to the canvas. |

### Selection Deep Dive
- **Direct Selection:** Click on any object to select it. Hold `Shift` to add or remove objects from your selection.
- **Marquee Selection:** To select multiple objects at once, hold the **`Ctrl` key** and drag a box on the canvas. Only shapes that are **fully contained** within the box will be selected.
- **Deselection:** Click on any empty area of the canvas to deselect all objects.

## Right Sidebar (Properties & Layers)

When you have an object selected, the right sidebar comes to life, giving you full control over its properties.

### Properties Tab
- **Transform:** Precisely set the X/Y position, Width/Height, and Rotation of your selected object(s).
- **Appearance:**
    - **Fill & Stroke:** Change the color of the object's fill and stroke using a color picker.
    - **Opacity:** Control the opacity of the **Fill**, the **Stroke**, and the entire **Object** independently using sliders.
    - **Stroke Width & Border Radius:** Adjust the thickness of the stroke and round the corners of rectangles.
- **Content:** For special objects like Images, SVGs, or Paths, you can directly edit their source content (URL, SVG code, or Path data).

### Layers Tab
- **View All Shapes:** See a list of every shape on your canvas, from top to bottom.
- **Select:** Click any layer to select the corresponding shape on the canvas.
- **Rename:** Double-click a layer's name to rename it.
- **Reorder:** Drag and drop layers to change their stacking order (bring to front/send to back).
- **Duplicate & Delete:** Use the icons at the bottom of the panel to duplicate or delete selected shapes.

## Keyboard Shortcuts

Master these shortcuts to speed up your workflow.

| Action | Shortcut |
| :--- | :--- |
| **Undo** | `Ctrl` + `Z` |
| **Redo** | `Ctrl` + `Shift` + `Z` or `Ctrl` + `Y` |
| **Copy** | `Ctrl` + `C` |
| **Paste** | `Ctrl` + `V` (and native clipboard pasting) |
| **Delete Shape** | `Delete` or `Backspace` |
| **Activate Select Tool** | `V` |
| **Activate Pan Tool (Hold)**| `Spacebar` |
| **Activate Rectangle Tool** | `R` |
| **Activate Circle Tool** | `O` |
| **Activate Line Tool** | `L` |
| **Activate Polygon Tool** | `P` |
| **Activate Brush Tool** | `B` |
| **Cancel Action** | `Escape` |
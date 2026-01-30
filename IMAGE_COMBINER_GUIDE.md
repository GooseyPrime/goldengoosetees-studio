# Image Combiner Tool Guide

> **📚 Related Documentation**: [Documentation Library](./docs/README.md) | [README](./README.md)

## Overview
The Image Combiner tool allows users to upload multiple images and combine them into a single design for any print area on their product. This is perfect for creating collages, layered designs, or combining AI-generated designs with uploaded photos.

## Features

### 1. Multiple Image Upload
- Upload multiple images at once (up to 10MB per image)
- Supports common image formats (PNG, JPG, JPEG, GIF, WebP)
- Images are automatically sized to fit within the canvas

### 2. Layer Management
- **Visual Layer List**: See all uploaded images in a sidebar with thumbnails
- **Layer Ordering**: Move layers up or down to control which images appear on top
- **Visibility Toggle**: Show/hide individual layers without deleting them
- **Layer Selection**: Click any layer to select it for editing

### 3. Image Manipulation
Each selected image can be adjusted with:
- **Width**: Resize the image (maintains aspect ratio)
- **Rotation**: Rotate from -180° to 180°
- **Opacity**: Adjust transparency from 0% to 100%
- **Position**: Click and drag images directly on the canvas

### 4. Canvas Interaction
- **Click to Select**: Click any image on the canvas to select it
- **Drag to Move**: Click and drag selected images to reposition them
- **Visual Selection**: Selected images show a blue dashed border
- **Real-time Preview**: See all changes immediately on the canvas

### 5. Save & Export
- Combines all visible layers into a single high-resolution design
- Maintains proper DPI settings for print quality
- Respects the print area dimensions

## How to Use

### From Design Manager
1. Navigate to the Design Manager page (click "Manage Designs" button)
2. For any print area:
   - **New Design**: Click "Upload Images" button
   - **Existing Design**: Click "Combine" button to add more images
3. Upload your images
4. Arrange and adjust as needed
5. Click "Save Combined Design"

### Workflow Tips

#### Creating a Collage
1. Upload all your photos at once
2. Resize each to fit your desired layout
3. Position them by dragging on the canvas
4. Adjust opacity for overlay effects
5. Use layer ordering for proper stacking

#### Combining AI Design with Photos
1. Generate a design with AI first
2. Open the Image Combiner from Design Manager
3. Your existing design loads as the base layer
4. Upload additional photos
5. Layer them on top or beneath the AI design
6. Adjust opacity for blending effects

#### Adding Logos or Text Images
1. Upload your main design
2. Add logo/text image files
3. Resize the logo to appropriate size
4. Position in corner or desired location
5. Fine-tune with rotation if needed

## Technical Specifications

### Canvas Dimensions
- Automatically matches the selected print area dimensions
- Maintains proper DPI (typically 300 DPI for print quality)
- Example: Front print area might be 8" × 10" at 300 DPI = 2400 × 3000 pixels

### Image Requirements
- **Max File Size**: 10MB per image
- **Supported Formats**: PNG, JPG, JPEG, GIF, WebP, BMP
- **Recommended**: PNG files with transparent backgrounds for best layering results

### Layer System
- Each image becomes an independent layer
- Z-index determines stacking order (higher = on top)
- Layers are rendered in order from bottom to top
- Transformations are applied per-layer

## Best Practices

### For Print Quality
1. Upload high-resolution images (300 DPI or higher)
2. Avoid scaling images up too much (causes pixelation)
3. Use PNG format for designs with transparency
4. Test visibility of small details at actual print size

### For Design Composition
1. Start with the largest/background image first
2. Add smaller elements on top
3. Use the layer list to organize your work
4. Toggle visibility to check individual layers
5. Use opacity for subtle overlays and effects

### For Efficient Workflow
1. Prepare all images before uploading
2. Name files descriptively (shown in layer list)
3. Use the reset button on individual layers to start over
4. Preview frequently on the product mockup
5. Save often to avoid losing work

## Keyboard Shortcuts
- **Enter**: Not available (use buttons for save)
- **Esc**: Close dialog (prompts for confirmation if unsaved)
- **Click + Drag**: Move selected image

## Common Use Cases

### Wedding/Event T-Shirts
- Upload multiple photos from the event
- Arrange in a collage layout
- Add date/name text as separate image layer
- Combine with decorative borders or frames

### Sports Team Jerseys
- Upload team logo
- Add player number (as image)
- Combine with background patterns
- Layer sponsor logos

### Band/Tour Merchandise
- Upload band logo or artwork
- Add tour dates (as prepared image)
- Combine with photos from performances
- Layer city names or venue logos

### Personal Photo Gifts
- Upload family photos
- Add decorative elements
- Combine with text overlays
- Create unique personalized designs

## Troubleshooting

### Image Won't Upload
- Check file size (must be under 10MB)
- Verify it's a supported image format
- Try converting to PNG or JPG
- Ensure file isn't corrupted

### Can't See My Image
- Check if layer visibility is turned off (eye icon)
- Verify layer isn't behind another opaque layer
- Check if opacity is set too low
- Try moving the layer up in the stack

### Image Looks Blurry
- Original image resolution may be too low
- Avoid scaling up beyond original size
- Upload higher resolution source image
- Check that image wasn't compressed

### Can't Move Image
- Ensure the image layer is selected (blue border)
- Try clicking directly on the image on canvas
- Check that you're clicking inside the canvas area
- Verify dialog isn't blocking interaction

## Integration with Other Tools

### Works With AI Generation
- Generate base design with AI chat
- Export to Design Manager
- Open in Image Combiner
- Add photos or other elements

### Works With Image Editor
- Create combined design first
- Then open in advanced Image Editor
- Apply filters, adjustments, crops
- Add text, shapes, drawings

### Integrates with Checkout
- Combined designs are treated like any other design
- Must complete all required print areas
- Price updates automatically based on configuration
- Design is sent to Printful for production

## Future Enhancements (Roadmap)
- Alignment guides and snapping
- Pre-made templates and layouts
- Direct text addition (no image file needed)
- Filters and effects per layer
- Blend modes (multiply, screen, overlay)
- Group layers for easier management
- Duplicate layer functionality
- Copy/paste between print areas

import { NextRequest, NextResponse } from 'next/server';

interface TileParams {
  z: string; // zoom level
  x: string; // tile x coordinate
  y: string; // tile y coordinate
}

// Mock tile serving functionality - would be replaced with actual tile cache/proxy
const generateMockTile = (z: number, x: number, y: number): Uint8Array => {
  // Generate a simple 256x256 PNG tile with grid pattern
  // In production, this would serve cached OSM tiles or custom map tiles
  const width = 256;
  const height = 256;
  
  // Create a simple pattern based on tile coordinates
  const pattern = new Array(width * height * 4); // RGBA
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const index = (i * width + j) * 4;
      
      // Create a grid pattern with coordinates
      const isGridLine = (i % 32 === 0 || j % 32 === 0);
      const isEdge = (i < 2 || i >= height - 2 || j < 2 || j >= width - 2);
      
      if (isEdge) {
        // Border - red
        pattern[index] = 255;     // R
        pattern[index + 1] = 0;   // G
        pattern[index + 2] = 0;   // B
        pattern[index + 3] = 255; // A
      } else if (isGridLine) {
        // Grid lines - gray
        pattern[index] = 128;     // R
        pattern[index + 1] = 128; // G
        pattern[index + 2] = 128; // B
        pattern[index + 3] = 255; // A
      } else {
        // Background - light blue with coordinate-based variation
        const variation = ((x + y + z) % 50) / 50;
        pattern[index] = Math.floor(200 + variation * 55);     // R
        pattern[index + 1] = Math.floor(220 + variation * 35); // G
        pattern[index + 2] = Math.floor(240 + variation * 15); // B
        pattern[index + 3] = 255; // A
      }
    }
  }
  
  // Return as raw byte array - in production would return actual PNG
  return new Uint8Array(pattern);
};

// GET /api/v1/monitoring/map/tiles/{z}/{x}/{y} - Serve offline map tiles
export async function GET(
  request: NextRequest,
  { params }: { params: TileParams }
) {
  try {
    const z = parseInt(params.z);
    const x = parseInt(params.x);
    const y = parseInt(params.y);
    
    // Validate tile parameters
    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid tile parameters',
        message: 'Tile coordinates must be valid numbers',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    // Validate zoom level range
    if (z < 0 || z > 18) {
      return NextResponse.json({
        success: false,
        error: 'Invalid zoom level',
        message: 'Zoom level must be between 0 and 18',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    // In production, this would:
    // 1. Check local tile cache first
    // 2. Fetch from OSM or other tile provider if not cached
    // 3. Cache the tile for offline use
    // 4. Return the actual PNG tile data
    
    const tileData = generateMockTile(z, x, y);
    
    // Set appropriate headers for tile serving
    const headers = new Headers({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*',
      'X-Tile-Coordinates': `${z}/${x}/${y}`,
      'X-Data-Source': 'mock-tile-server',
    });
    
    return new NextResponse(tileData, { headers });
    
  } catch (error) {
    console.error('Failed to serve map tile:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to serve map tile',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import type { PriorityEvent } from '@/lib/services/PriorityEventLogger';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

/**
 * API endpoint for priority event logging
 * POST /api/v1/sync/priority/events - Log a priority event
 * GET /api/v1/sync/priority/events - Get priority events with filtering
 */

// In-memory storage for demo purposes
// In production, this would be stored in a database
let eventStorage: PriorityEvent[] = [];
const MAX_EVENTS = 10000; // Keep last 10k events

/**
 * POST /api/v1/sync/priority/events
 * Log a new priority event
 */
export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();

    // Validate required fields
    if (!eventData.id || !eventData.itemId || !eventData.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: id, itemId, eventType' },
        { status: 400 }
      );
    }

    // Create event with server timestamp
    const event: PriorityEvent = {
      ...eventData,
      timestamp: new Date(eventData.timestamp || new Date()),
    };

    // Add to storage
    eventStorage.push(event);

    // Keep only recent events
    if (eventStorage.length > MAX_EVENTS) {
      eventStorage = eventStorage.slice(-MAX_EVENTS);
    }

    return NextResponse.json({
      success: true,
      message: 'Priority event logged successfully',
      data: event,
    });

  } catch (error) {
    console.error('Error logging priority event:', error);
    return NextResponse.json(
      { error: 'Failed to log priority event' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/sync/priority/events
 * Get priority events with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const itemId = searchParams.get('itemId');
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let filteredEvents = [...eventStorage];

    // Apply filters
    if (itemId) {
      filteredEvents = filteredEvents.filter(event => event.itemId === itemId);
    }

    if (eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
    }

    if (userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === userId);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) <= end
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const totalEvents = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    // Calculate statistics
    const eventTypeStats: Record<string, number> = {};
    filteredEvents.forEach(event => {
      eventTypeStats[event.eventType] = (eventTypeStats[event.eventType] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          total: totalEvents,
          limit,
          offset,
          hasMore: offset + limit < totalEvents,
        },
        statistics: {
          totalEvents,
          eventTypeBreakdown: eventTypeStats,
          dateRange: {
            oldest: filteredEvents.length > 0 ? 
              filteredEvents[filteredEvents.length - 1].timestamp : null,
            newest: filteredEvents.length > 0 ? 
              filteredEvents[0].timestamp : null,
          },
        },
      },
    });

  } catch (error) {
    console.error('Error retrieving priority events:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve priority events' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sync/priority/events
 * Clear event log (admin only in production)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json(
        { error: 'Missing confirmation parameter' },
        { status: 400 }
      );
    }

    const eventCount = eventStorage.length;
    eventStorage = [];

    return NextResponse.json({
      success: true,
      message: `Cleared ${eventCount} priority events`,
      data: {
        clearedCount: eventCount,
        clearedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error clearing priority events:', error);
    return NextResponse.json(
      { error: 'Failed to clear priority events' },
      { status: 500 }
    );
  }
}
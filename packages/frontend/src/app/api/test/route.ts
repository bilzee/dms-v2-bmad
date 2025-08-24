import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API routing is working!' });
}

export async function PATCH() {
  return NextResponse.json({ message: 'PATCH method works!' });
}
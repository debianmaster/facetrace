import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await context.params;
        const filepath = path.join(process.cwd(), 'public', 'faces', filename);

        if (!fs.existsSync(filepath)) {
            return new NextResponse('Image not found', { status: 404 });
        }

        const imageBuffer = fs.readFileSync(filepath);

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

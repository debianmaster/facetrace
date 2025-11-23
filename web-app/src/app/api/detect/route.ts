import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/utils/ai-client';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await aiClient.detectFaces(buffer);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error detecting faces:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

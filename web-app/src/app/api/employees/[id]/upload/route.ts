import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/utils/ai-client';
import { PrismaClient } from '@prisma/client';
import { saveFaceImage } from '@/utils/image-storage';

const prisma = new PrismaClient();

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: employeeId } = await params;
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Detect faces
        const detectionResult = await aiClient.detectFaces(buffer);
        const faces = detectionResult.faces;

        if (faces.length === 0) {
            return NextResponse.json({ error: 'No face detected in image' }, { status: 400 });
        }

        // Use the first face
        const face = faces[0];

        // Create FaceEmbedding
        const embedding = await prisma.faceEmbedding.create({
            data: {
                employeeId,
                embedding: face.embedding,
                imageUrl: null // Will update
            }
        });

        // Save image
        const imageUrl = await saveFaceImage(buffer, face.bbox, embedding.id);

        // Update with image URL
        if (imageUrl) {
            await prisma.faceEmbedding.update({
                where: { id: embedding.id },
                data: { imageUrl }
            });
        }

        return NextResponse.json({ success: true, imageUrl });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

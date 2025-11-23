import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const includeImages = searchParams.get('includeImages') === 'true';

    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' },
            include: includeImages ? {
                embeddings: {
                    select: { id: true, imageUrl: true },
                    take: 5 // Limit to 5 images per employee
                }
            } : undefined
        });

        // If not including images, we might want to just return basic info
        if (!includeImages) {
            return NextResponse.json(employees.map(e => ({ id: e.id, name: e.name })));
        }

        return NextResponse.json(employees);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }
}

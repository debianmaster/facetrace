import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const logs = await prisma.attendanceLog.findMany({
            orderBy: { checkInTime: 'desc' },
            take: 100,
            include: {
                employee: {
                    select: { name: true, email: true }
                }
            }
        });
        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch attendance logs' }, { status: 500 });
    }
}

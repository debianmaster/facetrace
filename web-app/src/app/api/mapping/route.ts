import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const unassigned = await prisma.unassignedFace.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return NextResponse.json(unassigned);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch faces' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Assign faces to employee
    try {
        const { faceIds, employeeId, newEmployeeName } = await req.json();

        if (!faceIds || !Array.isArray(faceIds) || faceIds.length === 0) {
            return NextResponse.json({ error: 'No faces selected' }, { status: 400 });
        }

        let targetEmployeeId = employeeId;

        if (newEmployeeName) {
            // Create new employee
            const emp = await prisma.employee.create({
                data: {
                    name: newEmployeeName,
                    // email: `${newEmployeeName.toLowerCase().replace(/\s/g, '.')}@example.com`, // Dummy email - in real app, ask for email
                    // To avoid unique constraint errors for same names in demo, we could append random string, 
                    // but for now let's just use the name. 
                    // Actually, let's append a timestamp to be safe for the demo.
                    email: `${newEmployeeName.toLowerCase().replace(/\s/g, '.')}.${Date.now()}@example.com`,
                }
            });
            targetEmployeeId = emp.id;
        }

        if (!targetEmployeeId) {
            return NextResponse.json({ error: 'No target employee specified' }, { status: 400 });
        }

        // Process all faces
        // In a real app, use a transaction. For simplicity here, we'll loop.

        for (const faceId of faceIds) {
            const unassigned = await prisma.unassignedFace.findUnique({ where: { id: faceId } });
            if (!unassigned) continue; // Skip if not found

            // Move embedding to FaceEmbedding
            await prisma.faceEmbedding.create({
                data: {
                    employeeId: targetEmployeeId,
                    embedding: unassigned.embedding,
                    imageUrl: unassigned.imageUrl
                }
            });

            // Delete from Unassigned
            await prisma.unassignedFace.delete({ where: { id: faceId } });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { faceIds } = await req.json();

        if (!faceIds || !Array.isArray(faceIds) || faceIds.length === 0) {
            return NextResponse.json({ error: 'No faces selected' }, { status: 400 });
        }

        // Delete from Unassigned
        // In a real app, you might also want to delete the image file from disk.
        // The cleanup job handles orphaned files, so we can rely on that or add explicit deletion here.
        // For now, let's just delete the DB records.

        await prisma.unassignedFace.deleteMany({
            where: {
                id: { in: faceIds }
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

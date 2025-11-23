import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Configuration
const SIMILARITY_THRESHOLD = 0.7; // Higher threshold for duplicates
const TIME_WINDOW_MINUTES = 5; // Consider faces within 5 minutes as potential duplicates
const MIN_DETECTION_SCORE = 0.3; // Minimum acceptable detection quality

function dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

async function cleanupUnknownFaces() {
    console.log('Starting unknown faces cleanup...');

    try {
        // 1. Remove faces with missing images
        const allFaces = await prisma.unassignedFace.findMany();
        let deletedMissing = 0;

        for (const face of allFaces) {
            if (face.imageUrl) {
                const filename = face.imageUrl.split('/').pop();
                if (filename) {
                    const filepath = path.join(process.cwd(), 'public', 'faces', filename);

                    if (!fs.existsSync(filepath)) {
                        console.log(`Deleting face ${face.id} - image file missing`);
                        await prisma.unassignedFace.delete({ where: { id: face.id } });
                        deletedMissing++;
                    }
                }
            } else {
                // No image URL - delete
                console.log(`Deleting face ${face.id} - no image URL`);
                await prisma.unassignedFace.delete({ where: { id: face.id } });
                deletedMissing++;
            }
        }

        // 2. Remove duplicates within time windows
        const remainingFaces = await prisma.unassignedFace.findMany({
            orderBy: { createdAt: 'asc' }
        });

        const toDelete = new Set<string>();
        let deletedDuplicates = 0;

        for (let i = 0; i < remainingFaces.length; i++) {
            if (toDelete.has(remainingFaces[i].id)) continue;

            const face1 = remainingFaces[i];
            const face1Time = new Date(face1.createdAt).getTime();

            for (let j = i + 1; j < remainingFaces.length; j++) {
                if (toDelete.has(remainingFaces[j].id)) continue;

                const face2 = remainingFaces[j];
                const face2Time = new Date(face2.createdAt).getTime();

                // Check if within time window
                const timeDiffMinutes = Math.abs(face2Time - face1Time) / (1000 * 60);
                if (timeDiffMinutes > TIME_WINDOW_MINUTES) {
                    break; // Faces are sorted by time, so we can break here
                }

                // Check similarity
                const similarity = dotProduct(face1.embedding, face2.embedding);

                if (similarity > SIMILARITY_THRESHOLD) {
                    // Mark the newer one for deletion (keep the older one)
                    toDelete.add(face2.id);
                    console.log(`Marking face ${face2.id} as duplicate of ${face1.id} (similarity: ${similarity.toFixed(3)})`);
                }
            }
        }

        // Delete marked duplicates
        for (const faceId of toDelete) {
            const face = remainingFaces.find(f => f.id === faceId);
            if (face?.imageUrl) {
                const filename = face.imageUrl.split('/').pop();
                if (filename) {
                    const filepath = path.join(process.cwd(), 'public', 'faces', filename);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }
            }
            await prisma.unassignedFace.delete({ where: { id: faceId } });
            deletedDuplicates++;
        }

        console.log(`Cleanup complete:`);
        console.log(`  - Deleted ${deletedMissing} faces with missing images`);
        console.log(`  - Deleted ${deletedDuplicates} duplicate faces`);
        console.log(`  - Total remaining: ${remainingFaces.length - toDelete.size - deletedMissing}`);

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run cleanup
cleanupUnknownFaces();

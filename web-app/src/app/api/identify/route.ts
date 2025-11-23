import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/utils/ai-client';
import { PrismaClient } from '@prisma/client';
import { saveFaceImage } from '@/utils/image-storage';

const prisma = new PrismaClient();
const SIMILARITY_THRESHOLD = 0.5; // Adjust based on model (buffalo_l usually needs ~0.5-0.6)
const UNKNOWN_SIMILARITY_THRESHOLD = 0.6; // Higher threshold for matching unknown faces

import { calculatePHash, areImagesSimilar } from '@/utils/phash-utils';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const apiKey = request.headers.get('x-api-key');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // 1. Detect Faces
        const detectionResult = await aiClient.detectFaces(buffer);
        const faces = detectionResult.faces;

        const results = [];

        // 2. Fetch all known embeddings (Optimization: Cache this in production)
        const knownEmbeddings = await prisma.faceEmbedding.findMany({
            include: { employee: true }
        });

        // 3. Fetch all unassigned faces for deduplication
        const unassignedFaces = await prisma.unassignedFace.findMany();

        for (const face of faces) {
            let bestMatch = null;
            let maxSim = -1;

            // 4. Compare with known faces
            for (const known of knownEmbeddings) {
                const sim = dotProduct(face.embedding, known.embedding);
                if (sim > maxSim) {
                    maxSim = sim;
                    bestMatch = known;
                }
            }

            let identity = null;

            if (bestMatch && maxSim > SIMILARITY_THRESHOLD) {
                // MATCH FOUND - Known Employee
                identity = {
                    type: 'KNOWN',
                    name: bestMatch.employee.name,
                    employeeId: bestMatch.employee.id,
                    score: maxSim
                };

                // Log Attendance (Debounce logic should be here, skipping for simplicity)
                await prisma.attendanceLog.create({
                    data: {
                        employeeId: bestMatch.employee.id,
                        confidenceScore: maxSim,
                        snapshotUrl: null // TODO: Upload to MinIO
                    }
                });

            } else {
                // UNKNOWN - Check if matches existing unassigned face
                let matchedUnassigned = null;
                let maxUnknownSim = -1;

                for (const unassigned of unassignedFaces) {
                    const sim = dotProduct(face.embedding, unassigned.embedding);
                    if (sim > maxUnknownSim) {
                        maxUnknownSim = sim;
                        matchedUnassigned = unassigned;
                    }
                }

                if (matchedUnassigned && maxUnknownSim > UNKNOWN_SIMILARITY_THRESHOLD) {
                    // This unknown face matches an existing unassigned face - reuse it
                    identity = {
                        type: 'UNKNOWN',
                        id: matchedUnassigned.id,
                        score: maxUnknownSim
                    };
                } else {
                    // Check for duplicate images using pHash
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const currentPHash = await calculatePHash(buffer);

                    // Check recent faces (last 30 seconds) for similar images
                    const TIME_WINDOW_SECONDS = 30;
                    const timeThreshold = new Date(Date.now() - TIME_WINDOW_SECONDS * 1000);

                    const recentFaces = await prisma.unassignedFace.findMany({
                        where: {
                            createdAt: { gte: timeThreshold },
                            pHash: { not: null }
                        }
                    });

                    let isDuplicate = false;
                    for (const recentFace of recentFaces) {
                        if (recentFace.pHash && areImagesSimilar(currentPHash, recentFace.pHash)) {
                            console.log(`Skipping duplicate image (pHash match with ${recentFace.id})`);
                            isDuplicate = true;
                            // Reuse the existing face
                            identity = {
                                type: 'UNKNOWN',
                                id: recentFace.id,
                                score: maxSim
                            };
                            break;
                        }
                    }

                    if (!isDuplicate) {
                        // New unknown face - create entry
                        const unassigned = await prisma.unassignedFace.create({
                            data: {
                                embedding: face.embedding,
                                imageUrl: null, // Will update after saving image
                                pHash: currentPHash
                            }
                        });

                        // Save face image
                        const imageUrl = await saveFaceImage(buffer, face.bbox, unassigned.id);

                        // Update with image URL
                        if (imageUrl) {
                            await prisma.unassignedFace.update({
                                where: { id: unassigned.id },
                                data: { imageUrl }
                            });
                        }

                        // Add to our local cache for this request
                        unassignedFaces.push(unassigned);

                        identity = {
                            type: 'UNKNOWN',
                            id: unassigned.id,
                            score: maxSim
                        };
                    }
                }
            }

            results.push({
                bbox: face.bbox,
                identity
            });
        }

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Error identifying faces:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

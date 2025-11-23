import Jimp from 'jimp';
import crypto from 'crypto';

/**
 * Calculate perceptual hash (pHash) of an image using DCT
 * Returns a 64-character hex string representing the hash
 */
export async function calculatePHash(imageBuffer: Buffer): Promise<string> {
    try {
        // Read image with Jimp
        const image = await Jimp.read(imageBuffer);

        // Resize to 32x32 and convert to grayscale
        image.resize(32, 32).grayscale();

        // Convert to 2D array
        const pixels: number[][] = [];
        for (let i = 0; i < 32; i++) {
            pixels[i] = [];
            for (let j = 0; j < 32; j++) {
                // Get pixel color (grayscale, so R=G=B)
                const color = Jimp.intToRGBA(image.getPixelColor(j, i));
                pixels[i][j] = color.r;
            }
        }

        // Apply DCT (Discrete Cosine Transform)
        const dct = applyDCT(pixels);

        // Extract top-left 8x8 (excluding DC component)
        const hash: number[] = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (i === 0 && j === 0) continue; // Skip DC component
                hash.push(dct[i][j]);
            }
        }

        // Calculate median
        const sorted = [...hash].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        // Create binary hash (1 if above median, 0 otherwise)
        let binaryHash = '';
        for (const val of hash) {
            binaryHash += val > median ? '1' : '0';
        }

        // Convert binary to hex
        let hexHash = '';
        for (let i = 0; i < binaryHash.length; i += 4) {
            const chunk = binaryHash.substr(i, 4);
            hexHash += parseInt(chunk, 2).toString(16);
        }

        return hexHash;
    } catch (error) {
        console.error('Error calculating pHash:', error);
        // Fallback to simple hash if pHash fails
        return crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
    }
}

/**
 * Simple DCT implementation for 32x32 matrix
 */
function applyDCT(matrix: number[][]): number[][] {
    const N = matrix.length;
    const dct: number[][] = Array(N).fill(0).map(() => Array(N).fill(0));

    for (let u = 0; u < N; u++) {
        for (let v = 0; v < N; v++) {
            let sum = 0;
            for (let i = 0; i < N; i++) {
                for (let j = 0; j < N; j++) {
                    sum += matrix[i][j] *
                        Math.cos(((2 * i + 1) * u * Math.PI) / (2 * N)) *
                        Math.cos(((2 * j + 1) * v * Math.PI) / (2 * N));
                }
            }
            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
            dct[u][v] = (2 / N) * cu * cv * sum;
        }
    }

    return dct;
}

/**
 * Calculate Hamming distance between two hex hashes
 */
export function hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
        return Infinity;
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
        // Count set bits
        distance += xor.toString(2).split('1').length - 1;
    }

    return distance;
}

/**
 * Check if two images are similar based on pHash
 * @param hash1 First image hash
 * @param hash2 Second image hash
 * @param threshold Maximum Hamming distance for similarity (default: 10)
 */
export function areImagesSimilar(
    hash1: string,
    hash2: string,
    threshold: number = 10
): boolean {
    const distance = hammingDistance(hash1, hash2);
    return distance <= threshold;
}

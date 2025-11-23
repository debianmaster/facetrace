import Jimp from 'jimp';
import crypto from 'crypto';

// --- pHash Utils (Copied from src/utils/phash-utils.ts) ---

async function calculatePHash(imageBuffer: Buffer): Promise<string> {
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
        return crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 16);
    }
}

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

function hammingDistance(hash1: string, hash2: string): number {
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

function areImagesSimilar(
    hash1: string,
    hash2: string,
    threshold: number = 10
): boolean {
    const distance = hammingDistance(hash1, hash2);
    return distance <= threshold;
}

// --- Test Logic ---

async function testPHash() {
    console.log('Testing pHash implementation (Jimp)...');

    try {
        // Create a base random image
        const width = 200;
        const height = 200;
        const image1 = new Jimp(width, height);

        // Fill with random noise
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                image1.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }
        const buffer1 = await image1.getBufferAsync(Jimp.MIME_JPEG);

        // Create a similar image (copy of image1 with slight noise)
        const image2 = image1.clone();
        // Modify 5% of pixels
        for (let i = 0; i < (width * height * 0.05); i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const color = Jimp.intToRGBA(image2.getPixelColor(x, y));
            // Add slight noise
            const r = Math.min(255, Math.max(0, color.r + Math.floor(Math.random() * 20 - 10)));
            image2.setPixelColor(Jimp.rgbaToInt(r, color.g, color.b, 255), x, y);
        }
        const buffer2 = await image2.getBufferAsync(Jimp.MIME_JPEG);

        // Create a completely different random image
        const image3 = new Jimp(width, height);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                image3.setPixelColor(Jimp.rgbaToInt(r, g, b, 255), x, y);
            }
        }
        const buffer3 = await image3.getBufferAsync(Jimp.MIME_JPEG);

        console.log('Calculating hashes...');
        const hash1 = await calculatePHash(buffer1);
        const hash2 = await calculatePHash(buffer2);
        const hash3 = await calculatePHash(buffer3);

        console.log(`Hash 1 (Base):    ${hash1}`);
        console.log(`Hash 2 (Similar): ${hash2}`);
        console.log(`Hash 3 (Diff):    ${hash3}`);

        const dist12 = hammingDistance(hash1, hash2);
        const dist13 = hammingDistance(hash1, hash3);

        console.log(`Distance Base vs Similar: ${dist12}`);
        console.log(`Distance Base vs Diff:    ${dist13}`);

        console.log(`Similar Base vs Similar? ${areImagesSimilar(hash1, hash2)}`);
        console.log(`Similar Base vs Diff?    ${areImagesSimilar(hash1, hash3)}`);

        if (dist12 <= 10 && dist13 > 10) {
            console.log('SUCCESS: pHash logic is working correctly.');
        } else {
            console.error('FAILURE: pHash logic results are unexpected.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error running pHash test:', error);
        process.exit(1);
    }
}

testPHash();

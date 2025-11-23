import fs from 'fs';
import path from 'path';

export async function saveFaceImage(
    imageBuffer: Buffer,
    bbox: number[],
    faceId: string
): Promise<string> {
    try {
        // Just save the raw buffer without any processing
        // This bypasses sharp entirely
        const filename = `${faceId}.jpg`;
        const filepath = path.join(process.cwd(), 'public', 'faces', filename);

        fs.writeFileSync(filepath, imageBuffer);

        console.log(`Saved image to ${filepath}`);
        return `/api/faces/${filename}`;
    } catch (error) {
        console.error('Error saving face image:', error);
        return '';
    }
}

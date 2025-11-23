import axios from 'axios';

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://ai-engine:8000';

export interface FaceData {
    bbox: number[];
    kps: number[][];
    det_score: number;
    embedding: number[];
}

export interface DetectionResponse {
    faces: FaceData[];
}

export const aiClient = {
    async detectFaces(imageBuffer: Buffer): Promise<DetectionResponse> {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(imageBuffer)]);
        formData.append('file', blob, 'image.jpg');

        const response = await axios.post(`${AI_ENGINE_URL}/detect`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    async compareFaces(emb1: number[], emb2: number[]): Promise<number> {
        const response = await axios.post(`${AI_ENGINE_URL}/compare`, {
            embedding1: emb1,
            embedding2: emb2,
        });
        return response.data.similarity;
    }
};

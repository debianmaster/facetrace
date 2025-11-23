'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface FaceData {
    bbox: number[];
    det_score: number;
}

export default function Home() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [faces, setFaces] = useState<FaceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const imgRef = useRef<HTMLImageElement>(null);
    const [scale, setScale] = useState({ x: 1, y: 1 });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setFaces([]);
            // Reset scale
            setScale({ x: 1, y: 1 });
        }
    };

    const updateScale = () => {
        if (imgRef.current) {
            const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
            if (naturalWidth && naturalHeight) {
                setScale({
                    x: clientWidth / naturalWidth,
                    y: clientHeight / naturalHeight
                });
            }
        }
    };

    useEffect(() => {
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const handleImageLoad = () => {
        updateScale();
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post('/api/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setFaces(response.data.faces);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to detect faces');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">FaceTrace Admin Dashboard</h1>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Detect Faces</h2>
                    <div className="flex gap-4 items-center">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Detect'}
                        </button>
                    </div>
                </div>

                {previewUrl && (
                    <div className="relative inline-block">
                        <img
                            ref={imgRef}
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full h-auto rounded-lg"
                            onLoad={handleImageLoad}
                        />
                        {faces.map((face, index) => (
                            <div
                                key={index}
                                className="absolute border-2 border-green-500 bg-green-500/20"
                                style={{
                                    left: face.bbox[0] * scale.x,
                                    top: face.bbox[1] * scale.y,
                                    width: (face.bbox[2] - face.bbox[0]) * scale.x,
                                    height: (face.bbox[3] - face.bbox[1]) * scale.y,
                                }}
                            >
                                <span className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-1 rounded">
                                    {`Face ${index + 1} (${(face.det_score * 100).toFixed(1)}%)`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {faces.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Results</h3>
                        <p>Detected {faces.length} faces.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

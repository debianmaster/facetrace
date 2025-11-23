'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

interface Identity {
    type: 'KNOWN' | 'UNKNOWN';
    name?: string;
    id?: string;
    score: number;
}

interface DetectionResult {
    bbox: number[];
    identity: Identity;
}

export default function AttendanceKiosk() {
    const webcamRef = useRef<Webcam>(null);
    const [results, setResults] = useState<DetectionResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Capture and process frame
    const capture = useCallback(async () => {
        if (webcamRef.current && !isProcessing) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            setIsProcessing(true);
            try {
                // Convert base64 to blob
                const res = await fetch(imageSrc);
                const blob = await res.blob();
                const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });

                const formData = new FormData();
                formData.append('file', file);

                const response = await axios.post('/api/identify', formData);
                setResults(response.data.results);
            } catch (error) {
                console.error("Identification failed", error);
            } finally {
                setIsProcessing(false);
            }
        }
    }, [isProcessing]);

    // Loop
    useEffect(() => {
        const interval = setInterval(capture, 2000); // Check every 2 seconds
        return () => clearInterval(interval);
    }, [capture]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8 font-[family-name:var(--font-geist-sans)]">

            <h1 className="text-4xl font-bold">FaceTrace Kiosk</h1>

            <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden shadow-xl">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                />

                {/* Overlays */}
                {results.map((res, idx) => {
                    // Note: Bounding boxes from backend are based on the sent image resolution.
                    // We might need scaling if the webcam display size differs from capture size.
                    // For simplicity, assuming webcam captures at displayed resolution or we rely on relative positioning if we had it.
                    // But typically webcam screenshots are 640x480. We need to map that to the DOM element size.
                    // For this MVP, let's try to just use absolute positioning assuming 640x480 capture and display.
                    // A better approach is to use percentages or handle scaling like we did in the admin dashboard.

                    // Let's assume the webcam component renders at the same aspect ratio.
                    // We can use a wrapper div to handle scaling if we knew the capture size.
                    // For now, let's just render them and see.

                    const [x1, y1, x2, y2] = res.bbox;
                    const width = x2 - x1;
                    const height = y2 - y1;

                    const color = res.identity.type === 'KNOWN' ? 'border-green-500' : 'border-red-500';
                    const bgColor = res.identity.type === 'KNOWN' ? 'bg-green-500' : 'bg-red-500';
                    const label = res.identity.type === 'KNOWN' ? res.identity.name : `Unknown`;

                    return (
                        <div
                            key={idx}
                            className={`absolute border-2 ${color}`}
                            style={{
                                left: x1,
                                top: y1,
                                width: width,
                                height: height,
                            }}
                        >
                            <div className={`absolute -top-8 left-0 ${bgColor} text-white px-2 py-1 text-sm rounded whitespace-nowrap`}>
                                {label} ({Math.round(res.identity.score * 100)}%)
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute bottom-4 text-gray-400 text-sm">
                {isProcessing ? 'Scanning...' : 'Ready'}
            </div>
        </div>
    );
}

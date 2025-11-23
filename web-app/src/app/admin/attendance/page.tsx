'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface AttendanceLog {
    id: string;
    checkInTime: string;
    confidenceScore: number;
    snapshotUrl: string | null;
    employee: {
        name: string;
        email: string;
    };
}

export default function AttendancePage() {
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await axios.get('/api/attendance');
            setLogs(res.data);
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Attendance Logs</h1>

            {loading ? <p>Loading...</p> : (
                <div className="bg-white rounded shadow overflow-hidden border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Snapshot</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(log.checkInTime).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{log.employee.name}</div>
                                        <div className="text-sm text-gray-500">{log.employee.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(log.confidenceScore * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {log.snapshotUrl ? (
                                            <a href={log.snapshotUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                                View Image
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-sm">No Image</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length === 0 && <div className="p-6 text-center text-gray-500">No attendance logs found.</div>}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Employee {
    id: string;
    name: string;
    email: string;
    embeddings: {
        id: string;
        imageUrl: string | null;
    }[];
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('/api/employees?includeImages=true');
            setEmployees(res.data);
        } catch (e) {
            console.error("Failed to fetch employees", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (employeeId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post(`/api/employees/${employeeId}/upload`, formData);
            alert("Uploaded successfully!");
            fetchEmployees();
        } catch (e) {
            alert("Failed to upload");
            console.error(e);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Employees</h1>

            {loading ? <p>Loading...</p> : (
                <div className="grid gap-6">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white p-6 rounded shadow border">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold">{emp.name}</h2>
                                    <p className="text-gray-500">{emp.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {emp.embeddings.length} Faces
                                    </span>
                                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm border">
                                        Upload Photo
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleUpload(emp.id, e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {emp.embeddings.slice(0, 5).map(emb => (
                                    <div key={emb.id} className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden border">
                                        {emb.imageUrl ? (
                                            <img
                                                src={emb.imageUrl}
                                                alt="Face"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                                        )}
                                    </div>
                                ))}
                                {emp.embeddings.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">No face images mapped.</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {employees.length === 0 && <p>No employees found.</p>}
                </div>
            )}
        </div>
    );
}

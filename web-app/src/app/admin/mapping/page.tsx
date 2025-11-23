'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface UnassignedFace {
    id: string;
    createdAt: string;
    imageUrl: string | null;
}

export default function MappingPage() {
    const [faces, setFaces] = useState<UnassignedFace[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set());
    const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    useEffect(() => {
        fetchFaces();
        fetchEmployees();
    }, []);

    const fetchFaces = async () => {
        try {
            const res = await axios.get('/api/mapping');
            setFaces(res.data);
            setSelectedFaces(new Set()); // Clear selection on refresh
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('/api/employees');
            setEmployees(res.data);
        } catch (e) {
            console.error("Failed to fetch employees", e);
        }
    };

    const toggleFaceSelection = (id: string) => {
        const newSelection = new Set(selectedFaces);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedFaces(newSelection);
    };

    const handleBulkMap = async (isNew: boolean) => {
        if (selectedFaces.size === 0) return;

        let payload: any = {
            faceIds: Array.from(selectedFaces)
        };

        if (isNew) {
            const name = prompt("Enter new employee name:");
            if (!name) return;
            payload.newEmployeeName = name;
        } else {
            if (!selectedEmployeeId) {
                alert("Please select an existing employee.");
                return;
            }
            payload.employeeId = selectedEmployeeId;
        }

        try {
            await axios.post('/api/mapping', payload);
            alert("Mapped successfully!");
            fetchFaces();
            fetchEmployees(); // Refresh employee list if new one created
        } catch (e) {
            alert("Failed to map");
            console.error(e);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFaces.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedFaces.size} faces?`)) return;

        try {
            await axios.delete('/api/mapping', {
                data: { faceIds: Array.from(selectedFaces) }
            });
            alert("Deleted successfully!");
            fetchFaces();
        } catch (e) {
            alert("Failed to delete");
            console.error(e);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto pb-32">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Unknown Faces Mapping</h1>
                <button onClick={fetchFaces} className="text-blue-500 hover:underline">Refresh</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {faces.map(face => (
                        <div
                            key={face.id}
                            className={`bg-white p-4 rounded shadow border relative cursor-pointer ${selectedFaces.has(face.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                            onClick={() => toggleFaceSelection(face.id)}
                        >
                            <div className="absolute top-2 right-2 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedFaces.has(face.id)}
                                    onChange={() => { }} // Handled by div click
                                    className="w-5 h-5"
                                />
                            </div>
                            <div className="aspect-square bg-gray-200 mb-4 flex items-center justify-center text-gray-500 overflow-hidden">
                                {face.imageUrl ? (
                                    <img
                                        src={face.imageUrl}
                                        alt="Unknown face"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span>No Image</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">Seen: {new Date(face.createdAt).toLocaleString()}</p>
                        </div>
                    ))}

                    {faces.length === 0 && <p>No unknown faces found.</p>}
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedFaces.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex items-center justify-center gap-4 z-50">
                    <span className="font-bold">{selectedFaces.size} faces selected</span>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <button
                        onClick={() => handleBulkMap(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Map to New Person
                    </button>

                    <span className="text-gray-500">or</span>

                    <div className="flex items-center gap-2">
                        <select
                            className="border rounded p-2"
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">Select Existing Person...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleBulkMap(false)}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                            disabled={!selectedEmployeeId}
                        >
                            Map
                        </button>
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <button
                        onClick={handleBulkDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

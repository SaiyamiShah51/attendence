import React, { useState, useEffect, useCallback } from 'react';
import type { User, AttendanceRecord } from '../../types';
import { mockApiService } from '../../services/mockApiService';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Header from '../shared/Header';
import Modal from '../shared/Modal';
import TeacherForm from './TeacherForm';


interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

// Teacher Manager Component
const TeacherManager: React.FC = () => {
    const [teachers, setTeachers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<User | null>(null);

    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await mockApiService.getTeachers();
            setTeachers(data);
        } catch (error) {
            console.error("Failed to fetch teachers:", error);
            alert("Could not load teacher data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const handleOpenModalForAdd = () => {
        setEditingTeacher(null);
        setIsModalOpen(true);
    };
    
    const handleOpenModalForEdit = (teacher: User) => {
        setEditingTeacher(teacher);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (teacherData: User) => {
        if (editingTeacher) {
            // Edit existing teacher
            await mockApiService.updateTeacher({ ...editingTeacher, ...teacherData });
        } else {
            // Add new teacher
            await mockApiService.addTeacher(teacherData);
        }
        await fetchTeachers(); // Refresh list
    };

    const handleRemove = async (id: string) => {
        if(window.confirm('Are you sure you want to remove this teacher? This action cannot be undone.')) {
            await mockApiService.deleteTeacher(id);
            fetchTeachers();
        }
    }

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-lavender-deep">Teacher Management</h2>
                    <Button onClick={handleOpenModalForAdd}>Add Teacher</Button>
                </div>
                 {isLoading ? (
                    <div className="flex justify-center p-4"><Spinner /></div>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-lavender-light">
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Specialization</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-800">
                                {teachers.map(teacher => (
                                    <tr key={teacher.id} className="border-b">
                                        <td className="p-3">{teacher.name}</td>
                                        <td className="p-3">{teacher.email}</td>
                                        <td className="p-3">{teacher.specialization}</td>
                                        <td className="p-3 text-right">
                                            <Button onClick={() => handleOpenModalForEdit(teacher)} variant="secondary" className="mr-2 text-sm py-1 px-2">Edit</Button>
                                            <Button onClick={() => handleRemove(teacher.id)} variant="danger" className="text-sm py-1 px-2">Remove</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 )}
            </Card>
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
            >
                <TeacherForm 
                    initialData={editingTeacher} 
                    onSubmit={handleFormSubmit}
                    onClose={() => setIsModalOpen(false)}
                />
            </Modal>
        </>
    );
};


// Attendance Reports Component
const AttendanceReportsAdmin: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecords = async () => {
            setIsLoading(true);
            const data = await mockApiService.getAllAttendance();
            setRecords(data);
            setIsLoading(false);
        };
        fetchRecords();
    }, []);

    const exportToCSV = () => {
        const headers = "Student Name,Enrollment #,Timestamp,Session ID,Location\n";
        const csv = records.map(r => 
            `"${r.studentName}","${r.studentEnrollmentNumber}","${new Date(r.timestamp).toLocaleString()}","${r.sessionId}","${r.location ? `${r.location.latitude},${r.location.longitude}` : 'N/A'}"`
        ).join("\n");
        const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "attendance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) return <div className="flex justify-center p-4"><Spinner /></div>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-lavender-deep">Attendance Reports</h2>
              <Button onClick={exportToCSV} variant="secondary">Export to CSV</Button>
            </div>
            <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-lavender-light">
                        <tr>
                            <th className="p-3">Student</th>
                            <th className="p-3">Enrollment #</th>
                            <th className="p-3">Session</th>
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Location (Lat, Lng)</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-800">
                        {records.map(rec => (
                            <tr key={rec.id} className="border-b">
                                <td className="p-3">{rec.studentName}</td>
                                <td className="p-3 font-mono">{rec.studentEnrollmentNumber}</td>
                                <td className="p-3">{rec.sessionId}</td>
                                <td className="p-3">{new Date(rec.timestamp).toLocaleString()}</td>
                                <td className="p-3">{rec.location ? `${rec.location.latitude.toFixed(4)}, ${rec.location.longitude.toFixed(4)}` : 'Not Available'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  return (
    <div className="p-4 md:p-8">
      <Header user={user} onLogout={onLogout} title="Admin Dashboard" />
      <main className="space-y-8">
        <TeacherManager />
        <AttendanceReportsAdmin />
      </main>
    </div>
  );
};

export default AdminDashboard;
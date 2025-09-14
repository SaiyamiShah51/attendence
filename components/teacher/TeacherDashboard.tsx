import React, { useState, useEffect, useCallback } from 'react';
import QRCode from "react-qr-code";
import type { User, AttendanceRecord } from '../../types';
import { mockApiService } from '../../services/mockApiService';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Header from '../shared/Header';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

const TeacherProfile: React.FC<{ user: User }> = ({ user }) => {
    return (
        <Card>
            <h2 className="text-2xl font-bold text-lavender-deep mb-4">My Profile</h2>
            <div className="space-y-2">
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Specialization:</strong> {user.specialization}</p>
                <Button variant="secondary" className="mt-2">Edit Profile</Button>
            </div>
        </Card>
    );
};

const QRCodeGenerator: React.FC<{ sessionCode: string; onRegenerate: () => void }> = ({ sessionCode, onRegenerate }) => {
    return (
        <Card className="text-center">
            <h2 className="text-2xl font-bold text-lavender-deep mb-4">Session QR Code</h2>
            {sessionCode ? (
                <div className="bg-white p-4 inline-block rounded-lg">
                    <QRCode value={sessionCode} size={200} />
                </div>
            ) : (
                <div className="h-[232px] w-[232px] bg-slate-200 animate-pulse rounded-lg mx-auto"></div>
            )}
            <p className="text-slate-500 my-4">Session ID: <span className="font-mono bg-lavender-light p-1 rounded">{sessionCode}</span></p>
            <Button onClick={onRegenerate}>Regenerate Code</Button>
        </Card>
    )
}

const AttendanceTaker: React.FC<{ user: User, sessionCode: string }> = ({ user, sessionCode }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [enrollmentInput, setEnrollmentInput] = useState('');
    const [manualMarkMessage, setManualMarkMessage] = useState({ text: '', type: 'info' });

    useEffect(() => {
        const fetchStudents = async () => {
            const studentData = await mockApiService.getStudents();
            setAllStudents(studentData);
        };
        fetchStudents();
    }, [])

    const fetchAttendance = useCallback(async () => {
        if (!sessionCode) return;
        setIsLoading(true);
        const data = await mockApiService.getAttendanceForSession(sessionCode);
        setRecords(data);
        setIsLoading(false);
    }, [sessionCode]);

    useEffect(() => {
        fetchAttendance();
        
        const interval = setInterval(fetchAttendance, 5000); // Poll for new attendance
        return () => clearInterval(interval);

    }, [fetchAttendance]);
    
    const presentStudentIds = new Set(records.map(r => r.studentId));

    const handleManualMarkByEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!enrollmentInput) {
            setManualMarkMessage({ text: 'Please enter an enrollment number.', type: 'error' });
            return;
        }

        const studentToMark = allStudents.find(s => s.enrollmentNumber === enrollmentInput);

        if (!studentToMark) {
            setManualMarkMessage({ text: 'Student with that enrollment number not found.', type: 'error' });
            return;
        }

        if (presentStudentIds.has(studentToMark.id)) {
            setManualMarkMessage({ text: `${studentToMark.name} is already marked as present.`, type: 'info' });
            return;
        }

        try {
            await mockApiService.markAttendance({
                studentId: studentToMark.id,
                studentName: studentToMark.name,
                studentEnrollmentNumber: studentToMark.enrollmentNumber!,
                teacherId: user.id,
                sessionId: sessionCode,
                timestamp: new Date().toISOString(),
                location: null, // Manual entry
            });
            setManualMarkMessage({ text: `Successfully marked ${studentToMark.name} as present.`, type: 'success' });
            setEnrollmentInput('');
            await fetchAttendance(); // Refetch immediately for better UX
        } catch (error) {
            setManualMarkMessage({ text: 'Failed to mark attendance.', type: 'error' });
        }
    };

    const messageColor = {
        info: 'text-slate-500',
        success: 'text-green-600',
        error: 'text-red-600'
    };


    return (
        <Card>
            <h2 className="text-2xl font-bold text-lavender-deep mb-4">Live Attendance - {sessionCode}</h2>
            {isLoading && !records.length ? <Spinner /> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-lg mb-2">Present Students ({records.length})</h3>
                    <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {records.map(record => (
                        <li key={record.id} className="bg-green-100 text-green-800 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <span className="font-semibold">{record.studentName}</span>
                                <span className="block text-xs text-green-700 font-mono">{record.studentEnrollmentNumber}</span>
                            </div>
                            <span className="text-xs font-mono">{new Date(record.timestamp).toLocaleTimeString()}</span>
                        </li>
                    ))}
                    {records.length === 0 && !isLoading && <p className="text-slate-500">No students have checked in yet.</p>}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-bold text-lg mb-2">Mark Manually</h3>
                     <form onSubmit={handleManualMarkByEnrollment} className="space-y-3">
                        <div>
                            <label htmlFor="enrollment" className="block font-medium mb-1 text-sm">Student Enrollment #</label>
                            <input
                                id="enrollment"
                                type="text"
                                value={enrollmentInput}
                                onChange={(e) => setEnrollmentInput(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark"
                                placeholder="e.g., S001"
                            />
                        </div>
                        <Button type="submit" className="w-full">Mark Present</Button>
                        {manualMarkMessage.text && (
                            <p className={`text-sm text-center h-4 ${messageColor[manualMarkMessage.type as keyof typeof messageColor]}`}>
                                {manualMarkMessage.text}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </Card>
    );
};


const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout }) => {
  const [sessionCode, setSessionCode] = useState('');

  const generateCode = useCallback(() => {
    const newCode = `${user.id}-SESSION-${Date.now()}`;
    setSessionCode(newCode);
  }, [user.id]);

  useEffect(() => {
      generateCode();
  }, [generateCode]);

  return (
    <div className="p-4 md:p-8">
       <Header user={user} onLogout={onLogout} title="Teacher Dashboard" />
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
             <TeacherProfile user={user} />
             <QRCodeGenerator sessionCode={sessionCode} onRegenerate={generateCode} />
        </div>
        <div className="lg:col-span-2">
            <AttendanceTaker user={user} sessionCode={sessionCode} />
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
import React, { useState, useEffect, useCallback } from 'react';
import type { User, AttendanceRecord } from './types';
import { mockApiService } from './services/mockApiService';
import LoginScreen from './components/auth/LoginScreen';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import useLocalStorage from './hooks/useLocalStorage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingAttendance, setPendingAttendance] = useLocalStorage<AttendanceRecord[]>('pendingAttendance', []);
  
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const syncOfflineData = useCallback(async () => {
    if (pendingAttendance.length > 0 && !isOffline) {
      console.log(`Syncing ${pendingAttendance.length} offline attendance records...`);
      try {
        const syncedRecords = await Promise.all(
          pendingAttendance.map(record => mockApiService.markAttendance(record))
        );
        console.log('Successfully synced records:', syncedRecords);
        setPendingAttendance([]);
        alert('Offline attendance records have been synced.');
      } catch (error) {
        console.error('Failed to sync offline data:', error);
        alert('Could not sync all offline data. Will try again later.');
      }
    }
  }, [pendingAttendance, setPendingAttendance, isOffline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("Application is now online.");
      setIsOffline(false);
    };
    const handleOffline = () => {
      console.log("Application is now offline.");
      setIsOffline(true)
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Attempt to sync whenever online status changes to 'online'
    if (!isOffline) {
      syncOfflineData();
    }
  }, [isOffline, syncOfflineData]);

  const renderDashboard = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case 'Admin':
        return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
      case 'Teacher':
        return <TeacherDashboard user={currentUser} onLogout={handleLogout} />;
      case 'Student':
        return <StudentDashboard user={currentUser} onLogout={handleLogout} isOffline={isOffline} />;
      default:
        // This case should ideally not be reached if currentUser is valid
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className="min-h-screen bg-lavender-light text-slate-700 font-sans">
      {isOffline && (
        <div className="bg-yellow-500 text-white text-center p-2 font-bold sticky top-0 z-50">
          You are currently offline. Data will sync when you're back online.
        </div>
      )}
      {!currentUser ? <LoginScreen onLoginSuccess={handleLoginSuccess} /> : renderDashboard()}
    </div>
  );
};

export default App;
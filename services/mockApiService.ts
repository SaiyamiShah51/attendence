import type { User, AttendanceRecord, Quiz, QuizResult } from '../types';

// --- LocalStorage Persistence Layer ---
const getStoredData = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
    return defaultValue;
  }
};

const setStoredData = <T,>(key: string, value: T) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

// --- Initial Mock Data (used only if localStorage is empty) ---
const initialTeachers: User[] = [
  { id: 'teacher1', name: 'Dr. Evelyn Reed', email: 'e.reed@school.com', role: 'Teacher', password: 'password123', phone: '123-456-7890', address: '123 Oak St', specialization: 'Physics' },
  { id: 'teacher2', name: 'Mr. Samuel Chen', email: 's.chen@school.com', role: 'Teacher', password: 'password123', phone: '098-765-4321', address: '456 Pine St', specialization: 'Mathematics' },
];
const initialStudents: User[] = [
  { id: 'student1', name: 'Alice Johnson', email: 'alice.j@school.com', role: 'Student', password: 'password123', enrollmentNumber: 'S001' },
  { id: 'student2', name: 'Bob Williams', email: 'bob.w@school.com', role: 'Student', password: 'password123', enrollmentNumber: 'S002' },
  { id: 'student3', name: 'Charlie Brown', email: 'charlie.b@school.com', role: 'Student', password: 'password123', enrollmentNumber: 'S003' },
];
const initialAttendance: AttendanceRecord[] = [
    { id: 'att1', studentId: 'student1', studentName: 'Alice Johnson', studentEnrollmentNumber: 'S001', teacherId: 'teacher1', sessionId: 'PHYS101-202401', timestamp: new Date(Date.now() - 86400000).toISOString(), location: { latitude: 34.0522, longitude: -118.2437 }},
    { id: 'att2', studentId: 'student2', studentName: 'Bob Williams', studentEnrollmentNumber: 'S002', teacherId: 'teacher1', sessionId: 'PHYS101-202401', timestamp: new Date(Date.now() - 86400000).toISOString(), location: { latitude: 34.0522, longitude: -118.2437 }},
];

// --- Data Initialization ---
let teachers = getStoredData<User[]>('mock_teachers', initialTeachers);
let students = getStoredData<User[]>('mock_students', initialStudents);
let attendanceRecords = getStoredData<AttendanceRecord[]>('mock_attendance', initialAttendance);
let quizzes = getStoredData<Quiz[]>('mock_quizzes', []);
let quizResults = getStoredData<QuizResult[]>('mock_quiz_results', []);
export const MOCK_ADMIN: User = { id: 'admin1', name: 'Admin User', email: 'admin@school.com', role: 'Admin' };


// Simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const mockApiService = {
  // Auth
  login: async (identifier: string, password: string): Promise<User> => {
    await delay(500);
    if (identifier === 'admin' && password === '123') {
        return MOCK_ADMIN;
    }
    const allUsers = [...teachers, ...students];
    const user = allUsers.find(u => u.name.toLowerCase() === identifier.toLowerCase());
    if (user && user.password === password) {
        // Return user object without the password
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
    }
    throw new Error('Invalid credentials');
  },
  registerStudent: async (userData: Omit<User, 'id' | 'role'>): Promise<User> => {
    await delay(500);
    if (students.some(s => s.email === userData.email) || teachers.some(t => t.email === userData.email)) {
        throw new Error('An account with this email already exists.');
    }
    const newStudent: User = { ...userData, id: `student${Date.now()}`, role: 'Student' };
    students.push(newStudent);
    setStoredData('mock_students', students);
    const { password, ...userWithoutPassword } = newStudent;
    return userWithoutPassword as User;
  },

  // Teacher Management
  getTeachers: async (): Promise<User[]> => {
    await delay(500);
    return teachers.map(t => {
        const { password, ...rest } = t;
        return rest as User;
    });
  },
  addTeacher: async (teacherData: Omit<User, 'id' | 'role'>): Promise<User> => {
    await delay(500);
    if (teachers.some(t => t.email === teacherData.email) || students.some(s => s.email === teacherData.email)) {
        throw new Error('An account with this email already exists.');
    }
    const newTeacher: User = { ...teacherData, id: `teacher${Date.now()}`, role: 'Teacher' };
    teachers.push(newTeacher);
    setStoredData('mock_teachers', teachers);
    const { password, ...userWithoutPassword } = newTeacher;
    return userWithoutPassword as User;
  },
  updateTeacher: async (teacher: User): Promise<User> => {
    await delay(500);
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index === -1) throw new Error('Teacher not found');
    
    const originalTeacher = teachers[index];
    const updatedTeacherData = { ...originalTeacher, ...teacher };

    // If the password in the payload is empty or undefined, keep the original one
    if (!teacher.password) {
        updatedTeacherData.password = originalTeacher.password;
    }

    teachers[index] = updatedTeacherData;
    setStoredData('mock_teachers', teachers);
    const { password, ...userWithoutPassword } = teachers[index];
    return userWithoutPassword as User;
  },
  deleteTeacher: async (teacherId: string): Promise<{ success: boolean }> => {
    await delay(500);
    teachers = teachers.filter(t => t.id !== teacherId);
    setStoredData('mock_teachers', teachers);
    return { success: true };
  },
  
  // Student Management
  getStudents: async (): Promise<User[]> => {
    await delay(300);
    return students;
  },

  // Attendance
  markAttendance: async (record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> => {
    await delay(500);
    const newRecord: AttendanceRecord = { ...record, id: `att${Date.now()}` };
    attendanceRecords.push(newRecord);
    setStoredData('mock_attendance', attendanceRecords);
    return newRecord;
  },
  getAttendanceForSession: async (sessionId: string): Promise<AttendanceRecord[]> => {
    await delay(500);
    return attendanceRecords.filter(r => r.sessionId === sessionId);
  },
  getAllAttendance: async(): Promise<AttendanceRecord[]> => {
    await delay(700);
    return attendanceRecords;
  },

  // Quiz
  saveQuiz: async (quiz: Omit<Quiz, 'id'>): Promise<Quiz> => {
    await delay(500);
    const newQuiz: Quiz = { ...quiz, id: `quiz${Date.now()}` };
    quizzes.push(newQuiz);
    setStoredData('mock_quizzes', quizzes);
    return newQuiz;
  },
  submitQuiz: async (result: Omit<QuizResult, 'submittedAt'>): Promise<QuizResult> => {
    await delay(500);
    const newResult: QuizResult = { ...result, submittedAt: new Date().toISOString() };
    quizResults.push(newResult);
    setStoredData('mock_quiz_results', quizResults);
    return newResult;
  },
  getQuizResults: async(studentId: string): Promise<QuizResult[]> => {
      await delay(500);
      return quizResults.filter(r => r.studentId === studentId);
  },
  getQuizById: async (quizId: string): Promise<Quiz | undefined> => {
      await delay(200);
      return quizzes.find(q => q.id === quizId);
  }
};
export type Role = 'Admin' | 'Teacher' | 'Student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
  phone?: string;
  address?: string;
  specialization?: string; // For Teacher
  enrollmentNumber?: string; // For Student
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEnrollmentNumber: string;
  teacherId: string;
  sessionId: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  } | null; // Allow null for GPS denial
}

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  quizId: string;
  studentId: string;
  score: number;
  answers: (number | null)[]; // user's answer index for each question
  submittedAt: string;
}
import React, { useState, useEffect, useRef } from 'react';
import type { User, Quiz, QuizQuestion, QuizResult, AttendanceRecord } from '../../types';
import { mockApiService } from '../../services/mockApiService';
import { geminiService } from '../../services/geminiService';
import { locationService } from '../../services/locationService';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Header from '../shared/Header';
import useLocalStorage from '../../hooks/useLocalStorage';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  isOffline: boolean;
}

const StudentProfile: React.FC<{ user: User }> = ({ user }) => (
    <Card>
        <h2 className="text-2xl font-bold text-lavender-deep mb-4">My Profile</h2>
        <div className="space-y-2">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Enrollment #:</strong> {user.enrollmentNumber}</p>
            <Button variant="secondary" className="mt-2">Edit Profile</Button>
        </div>
    </Card>
);

const QRCodeScanner: React.FC<{ user: User; isOffline: boolean }> = ({ user, isOffline }) => {
    const [message, setMessage] = useState('Scan a session QR code to mark attendance.');
    const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
    const [pendingAttendance, setPendingAttendance] = useLocalStorage<Omit<AttendanceRecord, 'id'>[]>('pendingAttendance', []);
    const scannerRef = useRef<any>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [pendingScanData, setPendingScanData] = useState<string | null>(null);
    const [scanCompleted, setScanCompleted] = useState(false);
    const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');

    const handleRequestLocation = async () => {
        // This function's purpose is to trigger the browser's permission prompt.
        // The actual state update is handled by the `onchange` listener in the useEffect.
        try {
            await locationService.getCurrentPosition();
        } catch (error) {
            console.warn("User action on location prompt:", error);
        }
    };

    // Effect to check permission status on load and proactively request if needed.
    useEffect(() => {
        const setupPermissions = async () => {
            // navigator.permissions is a modern API; provide a fallback for older browsers.
            if (!navigator.permissions) {
                setLocationPermission('prompt');
                return;
            }

            // Query for the initial permission status.
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            setLocationPermission(permissionStatus.state);

            // If permission has not been decided yet, proactively ask the user.
            if (permissionStatus.state === 'prompt') {
                handleRequestLocation();
            }

            // Set up a listener to update the state if the user changes the permission.
            permissionStatus.onchange = () => {
                setLocationPermission(permissionStatus.state);
            };
        };

        setupPermissions();
        // We only want this to run once on component mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    useEffect(() => {
        // Only initialize scanner if the element exists
        if(document.getElementById("qr-reader")){
            const qrScanner = new (window as any).Html5Qrcode("qr-reader");
            scannerRef.current = qrScanner;

            const startScanner = () => {
                 qrScanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanSuccess,
                    () => {} // onScanFailure - do nothing
                ).catch((err: Error) => {
                    console.error("Failed to start QR scanner:", err);
                    setMessage("Could not start camera. Please grant camera permissions.");
                    setMessageType('error');
                });
            };
            
            startScanner();

            return () => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch((err: Error) => console.error("Failed to stop scanner:", err));
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processAttendance = async (location: {latitude: number, longitude: number} | null, decodedText: string) => {
        const sessionId = decodedText;
        const teacherId = sessionId.split('-')[0];

        if (!teacherId || !sessionId) {
            throw new Error("Invalid QR code format.");
        }
        const attendanceData = {
            studentId: user.id,
            studentName: user.name,
            studentEnrollmentNumber: user.enrollmentNumber!,
            teacherId,
            sessionId,
            timestamp: new Date().toISOString(),
            location,
        };

        if (isOffline) {
            setPendingAttendance([...pendingAttendance, attendanceData]);
            const offlineMessage = location ? 'You are offline. Attendance saved locally.' : 'Offline. Attendance saved locally (no location).';
            setMessage(offlineMessage);
            setMessageType('success');
        } else {
             await mockApiService.markAttendance(attendanceData);
             const onlineMessage = location ? 'Attendance marked successfully!' : 'Success! Attendance marked without location.';
             setMessage(onlineMessage);
             setMessageType('success');
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        // Guard to prevent re-entrant scans while processing a previous one
        if (locationError || scanCompleted) {
            return;
        }

        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.pause(true);
        }
        setMessage('QR code scanned. Getting location...');
        setMessageType('info');

        try {
            const location = await locationService.getCurrentPosition();
            await processAttendance(location, decodedText);
            setScanCompleted(true); // Scan is processed, show resume button
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error("Location Error:", errorMessage);
            setLocationError(errorMessage);
            setPendingScanData(decodedText);
        }
    };
    
    const handleMarkWithoutLocation = async () => {
        if(!pendingScanData) return;
        setLocationError(null);
        try {
            await processAttendance(null, pendingScanData);
            setScanCompleted(true); // Scan is processed, show resume button
        } catch(err) {
             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setMessage(`Error: ${errorMessage}`);
            setMessageType('error');
        } finally {
            setPendingScanData(null);
        }
    }

    const handleResumeScanning = () => {
        setScanCompleted(false);
        setMessage('Scan a session QR code to mark attendance.');
        setMessageType('info');
        if (scannerRef.current && scannerRef.current.getState() === 2 /* PAUSED */) {
            scannerRef.current.resume();
        }
    };

    const messageColor = {
        info: 'text-slate-500',
        success: 'text-green-600',
        error: 'text-red-600'
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-lavender-deep mb-4">Mark Attendance</h2>
            
            <div className="bg-slate-100 p-3 rounded-lg mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p className="font-semibold text-slate-700">Location Status</p>
                    <p className="text-sm text-slate-500">
                        {locationPermission === 'checking' && 'Checking permissions...'}
                        {locationPermission === 'prompt' && 'Please enable location access for verified attendance.'}
                        {locationPermission === 'granted' && 'Location services are active.'}
                        {locationPermission === 'denied' && 'Location is disabled. You can enable it in browser settings.'}
                    </p>
                </div>
                {locationPermission === 'prompt' && (
                    <Button variant="secondary" className="text-sm py-1 px-3" onClick={handleRequestLocation}>
                        Enable GPS
                    </Button>
                )}
            </div>

            {locationError ? (
                <div className="text-center p-4">
                    <p className="font-semibold text-red-600 mb-2">Location Access Denied</p>
                    <p className="text-slate-600 mb-4">You can still mark your attendance. Your location will not be recorded.</p>
                    <Button onClick={handleMarkWithoutLocation}>Mark Attendance Anyway</Button>
                </div>
            ) : scanCompleted ? (
                 <div className="text-center p-4">
                    <p className={`font-semibold text-lg ${messageColor[messageType]}`}>{message}</p>
                    <Button onClick={handleResumeScanning} className="mt-4">Scan Another Code</Button>
                </div>
            ) : (
                <>
                    <div id="qr-reader" className="w-full max-w-sm mx-auto border-2 border-dashed border-lavender rounded-lg"></div>
                    <p className={`text-center font-semibold mt-4 h-6 ${messageColor[messageType]}`}>{message}</p>
                </>
            )}
        </Card>
    );
};


const QuizGenerator: React.FC<{ onQuizGenerated: (quiz: Quiz) => void }> = ({ onQuizGenerated }) => {
    const [file, setFile] = useState<File | null>(null);
    const [difficulty, setDifficulty] =useState('Medium');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const uploadedFile = e.target.files[0];
            if (uploadedFile && uploadedFile.type === 'text/plain') {
                setFile(uploadedFile);
                setError('');
            } else {
                setFile(null);
                setError('Invalid file type. Please upload a .txt file.');
            }
        }
    };

    const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value)) value = 1;
        if (value > 20) value = 20;
        setNumQuestions(value);
    };

    const handleGenerate = async () => {
        if (!file) {
            setError('Please upload a file.');
            return;
        }
        if (numQuestions < 1) {
            setError('Number of questions must be at least 1.');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const content = await file.text();
            const questions = await geminiService.generateQuiz(content, difficulty, numQuestions);
            const newQuiz: Quiz = {
                id: `quiz-${Date.now()}`,
                title: file.name,
                questions: questions,
            };
            await mockApiService.saveQuiz(newQuiz);
            onQuizGenerated(newQuiz);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <Card>
            <h2 className="text-2xl font-bold text-lavender-deep mb-4">Generate a Quiz</h2>
            <div className="space-y-4">
                <div>
                    <label className="block font-medium mb-1">Upload File (.txt)</label>
                    <input type="file" accept=".txt" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lavender-light file:text-lavender-deep hover:file:bg-lavender"/>
                </div>
                 <div>
                    <label className="block font-medium mb-1">Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark">
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </div>
                <div>
                    <label className="block font-medium mb-1">Number of Questions (Max 20)</label>
                    <input type="number" value={numQuestions} onChange={handleNumQuestionsChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" min="1" max="20" />
                </div>
                {error && <p className="text-red-500">{error}</p>}
                <Button onClick={handleGenerate} disabled={isLoading || !file} className="w-full">
                    {isLoading ? <Spinner size="sm" className="mx-auto" /> : 'Generate Quiz'}
                </Button>
            </div>
        </Card>
    )
};


const QuizView: React.FC<{ quiz: Quiz; user: User; onQuizFinish: (result: QuizResult) => void }> = ({ quiz, user, onQuizFinish }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null));

    const handleAnswer = (optionIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleSubmit = async () => {
        let score = 0;
        quiz.questions.forEach((q, i) => {
            if (answers[i] === q.correctAnswerIndex) {
                score++;
            }
        });
        const resultData = {
            quizId: quiz.id,
            studentId: user.id,
            score: (score / quiz.questions.length) * 100,
            answers,
        };
        const savedResult = await mockApiService.submitQuiz(resultData);
        onQuizFinish(savedResult);
    };

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <Card>
            <h2 className="text-2xl font-bold text-lavender-deep mb-2">{quiz.title}</h2>
            <p className="text-slate-500 mb-6">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
            
            <p className="text-lg font-semibold mb-4">{currentQuestion.questionText}</p>
            <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                    <button 
                        key={index} 
                        onClick={() => handleAnswer(index)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${answers[currentQuestionIndex] === index ? 'bg-lavender border-lavender-dark' : 'bg-white border-slate-200 hover:border-lavender'}`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <div className="flex justify-end mt-6">
                {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <Button onClick={handleNext}>Next</Button>
                ) : (
                    <Button onClick={handleSubmit}>Finish & See Results</Button>
                )}
            </div>
        </Card>
    );
};

const QuizResults: React.FC<{ result: QuizResult; onRetake: () => void }> = ({ result, onRetake }) => {
    const [quiz, setQuiz] = useState<Quiz | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            const quizData = await mockApiService.getQuizById(result.quizId);
            setQuiz(quizData || null);
        };
        fetchQuiz();
    }, [result.quizId]);
    
    if (!quiz) return <Spinner />;

    return (
        <Card>
            <h2 className="text-3xl font-bold text-lavender-deep mb-2">Quiz Results</h2>
            <p className="text-xl font-semibold mb-6">Your Score: <span className="text-lavender-deep">{result.score.toFixed(0)}%</span></p>
            
            <div className="space-y-6">
                {quiz.questions.map((q, index) => {
                    const userAnswer = result.answers[index];
                    const isCorrect = userAnswer === q.correctAnswerIndex;
                    return (
                        <div key={index} className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                            <p className="font-bold mb-2">{q.questionText}</p>
                            <p className="text-sm">Your answer: <span className="font-semibold">{userAnswer !== null ? q.options[userAnswer] : 'Not answered'}</span></p>
                            {!isCorrect && <p className="text-sm text-green-700">Correct answer: <span className="font-semibold">{q.options[q.correctAnswerIndex]}</span></p>}
                        </div>
                    );
                })}
            </div>
            <div className="text-center mt-6">
                 <Button onClick={onRetake}>Take Another Quiz</Button>
            </div>
        </Card>
    );
};


const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout, isOffline }) => {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [view, setView] = useState<'main' | 'quiz' | 'results'>('main');

  const handleQuizGenerated = (quiz: Quiz) => {
      setActiveQuiz(quiz);
      setView('quiz');
  };

  const handleQuizFinish = (result: QuizResult) => {
      setQuizResult(result);
      setActiveQuiz(null);
      setView('results');
  };
  
  const handleRetake = () => {
      setQuizResult(null);
      setView('main');
  }

  const renderContent = () => {
      switch(view) {
          case 'quiz':
              return activeQuiz && <QuizView quiz={activeQuiz} user={user} onQuizFinish={handleQuizFinish} />;
          case 'results':
              return quizResult && <QuizResults result={quizResult} onRetake={handleRetake} />;
          case 'main':
          default:
              return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="space-y-8">
                        <StudentProfile user={user} />
                        <QuizGenerator onQuizGenerated={handleQuizGenerated} />
                     </div>
                     <div>
                        <QRCodeScanner user={user} isOffline={isOffline} />
                     </div>
                  </div>
              );
      }
  };

  return (
    <div className="p-4 md:p-8">
      <Header user={user} onLogout={onLogout} title="Student Dashboard" />
      <main>
          {renderContent()}
      </main>
    </div>
  );
};

export default StudentDashboard;
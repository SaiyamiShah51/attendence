import React, { useState } from 'react';
import type { User } from '../../types';
import { mockApiService } from '../../services/mockApiService';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

type ActiveTab = 'Student' | 'Teacher' | 'Admin';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('Student');
  
  const [identifier, setIdentifier] = useState(''); // Can be name, email, or 'admin'
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For registration
  const [enrollmentNumber, setEnrollmentNumber] = useState(''); // For registration
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = () => {
      setIdentifier('');
      setPassword('');
      setName('');
      setEnrollmentNumber('');
      setError('');
      // Don't reset isRegistering here as it's part of the tab state
  }

  const handleTabChange = (tab: ActiveTab) => {
      setActiveTab(tab);
      setIsRegistering(false); // Always reset to login view on tab change
      resetFormState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering && activeTab === 'Student') {
        if (!name || !identifier || !password || !enrollmentNumber) {
            throw new Error('All fields are required for registration.');
        }
        await mockApiService.registerStudent({
            name,
            email: identifier, // 'identifier' is used for email during registration
            password,
            enrollmentNumber
        });
        alert('Registration successful! Please log in.');
        setIsRegistering(false); // Switch to login view
        resetFormState();
      } else {
        const loginIdentifier = activeTab === 'Admin' ? 'admin' : identifier;
        const user = await mockApiService.login(loginIdentifier, password);
        // A simple check to ensure the user is logging into the correct portal
        if (user.role !== activeTab) {
            throw new Error(`Invalid credentials for the ${activeTab} portal.`);
        }
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTabClass = (tab: ActiveTab) => {
      return activeTab === tab 
        ? 'border-lavender-dark text-lavender-deep' 
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300';
  }

  const renderTitle = () => {
      if (activeTab === 'Student' && isRegistering) return 'Create Student Account';
      return `${activeTab} Login`;
  }

  const renderDescription = () => {
      if(activeTab === 'Student' && isRegistering) return 'Join our platform by filling out the form below.';
      return `Sign in to your ${activeTab.toLowerCase()} dashboard.`;
  }
  
  const getIdentifierLabel = () => {
      if (activeTab === 'Admin') return 'Username';
      if (activeTab === 'Student' && isRegistering) return 'Email';
      return 'Name';
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <div className="border-b border-slate-200 mb-6">
            <nav className="-mb-px flex space-x-6">
                 <button className={`py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('Student')}`} onClick={() => handleTabChange('Student')}>
                    Student
                </button>
                <button className={`py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('Teacher')}`} onClick={() => handleTabChange('Teacher')}>
                    Teacher
                </button>
                <button className={`py-4 px-1 border-b-2 font-medium text-sm ${getTabClass('Admin')}`} onClick={() => handleTabChange('Admin')}>
                    Admin
                </button>
            </nav>
        </div>

        <h1 className="text-3xl font-bold text-lavender-deep mb-2 text-center">{renderTitle()}</h1>
        <p className="text-slate-500 mb-8 text-center">{renderDescription()}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'Student' && isRegistering && (
            <>
              <div>
                <label className="block font-medium mb-1">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required />
              </div>
               <div>
                <label className="block font-medium mb-1">Enrollment Number</label>
                <input type="text" value={enrollmentNumber} onChange={e => setEnrollmentNumber(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required />
              </div>
            </>
          )}
          <div>
            <label className="block font-medium mb-1">{getIdentifierLabel()}</label>
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required placeholder={getIdentifierLabel() === 'Name' ? 'e.g., Alice Johnson' : ''} />
          </div>
          <div>
            <label className="block font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <Button type="submit" className="w-full text-lg" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" className="mx-auto" /> : (isRegistering ? 'Register' : 'Login')}
          </Button>
        </form>

        {activeTab === 'Student' && (
            <p className="text-center text-slate-500 mt-6">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                <button onClick={() => { setIsRegistering(!isRegistering); resetFormState(); }} className="font-semibold text-lavender-dark hover:underline ml-2">
                    {isRegistering ? 'Login' : 'Register here'}
                </button>
            </p>
        )}
      </Card>
    </div>
  );
};

export default LoginScreen;
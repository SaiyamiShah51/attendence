import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';

interface TeacherFormProps {
  initialData: Partial<User> | null;
  onSubmit: (teacherData: User) => Promise<void>;
  onClose: () => void;
}

const defaultState = {
  name: '', email: '', password: '', phone: '', address: '', specialization: ''
};

const TeacherForm: React.FC<TeacherFormProps> = ({ initialData, onSubmit, onClose }) => {
  const [teacher, setTeacher] = useState<Partial<User>>(defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      // Ensure all form fields are present in the state to prevent React from
      // warning about changing an uncontrolled input to a controlled one.
      // Spread default state first, then initialData, then explicitly override the password for editing.
      setTeacher({ ...defaultState, ...initialData, password: '' });
    } else {
       // For a new teacher, use the clean default state.
       setTeacher(defaultState);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTeacher({ ...teacher, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await onSubmit(teacher as User);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const isEditing = !!initialData?.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block font-medium mb-1">Full Name</label>
            <input name="name" value={teacher.name} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required />
        </div>
        <div>
            <label className="block font-medium mb-1">Email</label>
            <input type="email" name="email" value={teacher.email} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" required />
        </div>
        <div>
            <label className="block font-medium mb-1">Password</label>
            <input type="password" name="password" value={teacher.password} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" placeholder={isEditing ? "Leave blank to keep unchanged" : ""} required={!isEditing} />
        </div>
        <div>
            <label className="block font-medium mb-1">Phone</label>
            <input name="phone" value={teacher.phone} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" />
        </div>
        <div className="md:col-span-2">
            <label className="block font-medium mb-1">Address</label>
            <input name="address" value={teacher.address} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" />
        </div>
        <div className="md:col-span-2">
            <label className="block font-medium mb-1">Specialization</label>
            <input name="specialization" value={teacher.specialization} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-lavender-dark focus:border-lavender-dark" />
        </div>
      </div>
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner size="sm" /> : (isEditing ? 'Save Changes' : 'Add Teacher')}
        </Button>
      </div>
    </form>
  );
};

export default TeacherForm;
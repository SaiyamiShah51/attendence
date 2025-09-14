import React from 'react';
import type { User } from '../../types';
import Button from './Button';

interface HeaderProps {
    user: User;
    onLogout: () => void;
    title: string;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, title }) => {
    return (
        <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-4xl font-bold text-lavender-deep">{title}</h1>
                <p className="text-slate-500">Welcome, {user.name}!</p>
            </div>
            <Button onClick={onLogout} variant="secondary">Logout</Button>
        </header>
    );
};

export default Header;

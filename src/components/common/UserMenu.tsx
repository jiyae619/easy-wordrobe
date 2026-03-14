import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Settings, X, Lock, Camera } from 'lucide-react';

const UserMenu: React.FC = () => {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const initials = user.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email?.[0]?.toUpperCase() || '?';

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* Avatar Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:ring-2 hover:ring-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                >
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-9 h-9 rounded-full object-cover border-2 border-olive-200"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center text-sm font-semibold">
                            {initials}
                        </div>
                    )}
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-olive-100 overflow-hidden animate-scale-in z-50">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-olive-100">
                            <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        className="w-8 h-8 rounded-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                                        <User className="w-4 h-4 text-secondary" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">
                                        {user.displayName || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-1.5">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowProfileModal(true);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-olive-50 rounded-xl transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Profile & Settings
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-600 hover:bg-olive-50 rounded-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile & Settings Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-olive-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-primary">Profile & Settings</h3>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-2 text-olive-400 hover:text-primary hover:bg-olive-50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body — Scrollable */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">

                            {/* === Profile Section === */}
                            <section>
                                <h4 className="text-xs font-bold text-olive-400 uppercase tracking-wider mb-4">Profile</h4>

                                {/* Avatar / Photo */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName || 'User'}
                                                className="w-16 h-16 rounded-2xl object-cover border-2 border-olive-200"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center">
                                                <User className="w-7 h-7 text-secondary" />
                                            </div>
                                        )}
                                        <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-olive-700 transition-colors">
                                            <Camera className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-primary truncate">{user.displayName || 'User'}</p>
                                        <p className="text-xs text-olive-400 truncate">{user.email}</p>
                                    </div>
                                </div>

                                {/* Display Name */}
                                <div className="mb-3">
                                    <label className="block text-sm font-semibold text-primary mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user.displayName || ''}
                                        placeholder="Your name"
                                        className="w-full px-4 py-3 bg-olive-50 border border-olive-200 rounded-xl text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>

                                {/* Change Password */}
                                <button className="flex items-center gap-2 text-sm text-secondary font-semibold hover:text-primary transition-colors">
                                    <Lock className="w-3.5 h-3.5" />
                                    Change password
                                </button>
                            </section>

                            {/* Divider */}
                            <div className="h-px bg-olive-100" />

                            {/* === Settings Section === */}
                            <section>
                                <h4 className="text-xs font-bold text-olive-400 uppercase tracking-wider mb-4">Settings</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-1">Height</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                defaultValue={165}
                                                className="w-full px-4 py-3 bg-olive-50 border border-olive-200 rounded-xl text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-olive-400 font-medium text-sm">cm</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-1">Weight</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                defaultValue={55}
                                                className="w-full px-4 py-3 bg-olive-50 border border-olive-200 rounded-xl text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-olive-400 font-medium text-sm">kg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-primary mb-1">Preferred Vibe</label>
                                        <select className="w-full px-4 py-3 bg-olive-50 border border-olive-200 rounded-xl text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all">
                                            <option value="minimalist">Minimalist</option>
                                            <option value="professional">Professional</option>
                                            <option value="casual">Casual & Comfy</option>
                                            <option value="streetwear">Streetwear</option>
                                            <option value="vintage">Vintage / Retro</option>
                                        </select>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Save Button — Fixed at bottom */}
                        <div className="p-5 border-t border-olive-100 flex-shrink-0">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-transform hover:bg-olive-900"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserMenu;

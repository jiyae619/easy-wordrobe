import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWardrobe } from '../../context/WardrobeContext';
import { LogOut, User, Settings, X, Lock, Camera, Info, Cloud, Activity, Heart } from 'lucide-react';
import { MOODS } from '../../data/moods';
import { SUPPORTED_CITIES } from '../../services/weatherService';

const UserMenu: React.FC = () => {
    const { user, logout } = useAuth();
    const { userSettings, updateUserSettings } = useWardrobe();
    const [isOpen, setIsOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showCurateModal, setShowCurateModal] = useState(false);

    // Local state for profile form
    const [height, setHeight] = useState(userSettings?.height || '');
    const [weight, setWeight] = useState(userSettings?.weight || '');
    const [gender, setGender] = useState(userSettings?.gender || '');
    const [preferredVibe, setPreferredVibe] = useState(userSettings?.preferredVibe || '');
    const [city, setCity] = useState(userSettings?.city || '');

    const menuRef = useRef<HTMLDivElement>(null);

    // Sync local state when userSettings load
    useEffect(() => {
        if (userSettings) {
            setHeight(userSettings.height || '');
            setWeight(userSettings.weight || '');
            setGender(userSettings.gender || '');
            setPreferredVibe(userSettings.preferredVibe || '');
            setCity(userSettings.city || '');
        }
    }, [userSettings]);

    const handleSaveProfile = async () => {
        await updateUserSettings({ height, weight, gender, preferredVibe, city });
        setShowProfileModal(false);
    };

    // Allow other views (e.g. the Home "set your city" hint) to open this modal.
    useEffect(() => {
        const openSettings = () => {
            setIsOpen(false);
            setShowProfileModal(true);
        };
        window.addEventListener('open-settings', openSettings);
        return () => window.removeEventListener('open-settings', openSettings);
    }, []);

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
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:ring-2 hover:ring-lime focus:outline-none focus:ring-2 focus:ring-lime"
                >
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || 'User'}
                            className="w-9 h-9 rounded-full object-cover border-2 border-ink/15"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-ink text-lime flex items-center justify-center text-sm font-bold">
                            {initials}
                        </div>
                    )}
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-paper rounded-2xl shadow-xl border-[1.5px] border-ink overflow-hidden animate-scale-in z-50">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-ink/10">
                            <div className="flex items-center gap-3">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        className="w-8 h-8 rounded-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-lime/40 flex items-center justify-center">
                                        <User className="w-4 h-4 text-ink" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink truncate">
                                        {user.displayName || 'User'}
                                    </p>
                                    <p className="text-xs text-ink/50 truncate">
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
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-ink/70 hover:bg-ink/5 rounded-xl transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Profile & settings
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setShowCurateModal(true);
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-ink/70 hover:bg-ink/5 rounded-xl transition-colors"
                            >
                                <Info className="w-4 h-4" />
                                How your stylist works
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-ink/70 hover:bg-ink/5 rounded-xl transition-colors"
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
                    <div className="w-full max-w-sm bg-paper rounded-[28px] border-[1.5px] border-ink shadow-xl overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-ink/10 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-ink" />
                                <h3 className="font-display text-xl font-extrabold text-ink">Profile & settings</h3>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-2 text-ink/50 hover:text-ink hover:bg-ink/5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body — Scrollable */}
                        <div className="overflow-y-auto flex-1 p-6 space-y-6">

                            {/* === Profile Section === */}
                            <section>
                                <h4 className="text-xs font-bold text-ink/50 uppercase tracking-wider mb-4">Profile</h4>

                                {/* Avatar / Photo */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName || 'User'}
                                                className="w-16 h-16 rounded-2xl object-cover border-2 border-ink/15"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-lime flex items-center justify-center">
                                                <User className="w-7 h-7 text-ink" />
                                            </div>
                                        )}
                                        <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-ink text-white rounded-full flex items-center justify-center shadow-md hover:bg-ink/90 transition-colors">
                                            <Camera className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-ink truncate">{user.displayName || 'User'}</p>
                                        <p className="text-xs text-ink/50 truncate">{user.email}</p>
                                    </div>
                                </div>

                                {/* Display Name */}
                                <div className="mb-3">
                                    <label className="block text-sm font-semibold text-ink mb-1">Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user.displayName || ''}
                                        placeholder="Your name"
                                        className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime transition-all"
                                    />
                                </div>

                                {/* Change Password */}
                                <button className="flex items-center gap-2 text-sm text-ink font-semibold hover:text-ink transition-colors">
                                    <Lock className="w-3.5 h-3.5" />
                                    Change password
                                </button>
                            </section>

                            {/* Divider */}
                            <div className="h-px bg-ink/5" />

                            {/* === Settings Section === */}
                            <section>
                                <h4 className="text-xs font-bold text-ink/50 uppercase tracking-wider mb-4">Settings</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1">Gender</label>
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime appearance-none transition-all"
                                        >
                                            <option value="">Not specified</option>
                                            <option value="female">Female</option>
                                            <option value="male">Male</option>
                                            <option value="non-binary">Nonbinary</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1">Height</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                                placeholder="e.g. 165"
                                                className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/50 font-medium text-sm">cm</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1">Weight</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                placeholder="e.g. 55"
                                                className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime transition-all"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/50 font-medium text-sm">kg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1">Favorite mood</label>
                                        <select
                                            value={preferredVibe}
                                            onChange={(e) => setPreferredVibe(e.target.value)}
                                            className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime appearance-none transition-all"
                                        >
                                            <option value="">Not specified</option>
                                            {MOODS.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-ink mb-1">Weather city</label>
                                        <select
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full px-4 py-3 bg-paper border border-ink/15 rounded-xl text-ink font-medium focus:outline-none focus:ring-2 focus:ring-lime appearance-none transition-all"
                                        >
                                            <option value="">Use my location</option>
                                            {SUPPORTED_CITIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-[11px] text-ink/50">For when location is off. US cities only.</p>
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* Save Button — Fixed at bottom */}
                        <div className="p-5 border-t border-ink/10 flex-shrink-0">
                            <button
                                onClick={handleSaveProfile}
                                className="w-full py-3.5 bg-ink text-white font-bold rounded-full active:scale-[0.98] transition-transform hover:bg-ink/90"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* How We Curate Modal */}
            {showCurateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-ink text-paper rounded-[28px] border-[1.5px] border-lime shadow-xl overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-paper/15">
                            <div className="flex items-center gap-2">
                                <Info className="w-5 h-5 text-lime" />
                                <h3 className="text-lg font-bold">How your stylist picks</h3>
                            </div>
                            <button
                                onClick={() => setShowCurateModal(false)}
                                className="p-2 text-paper/60 hover:text-paper hover:bg-paper/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm leading-relaxed text-paper/80">Three things guide every look. The weather, so you stay comfy. How often you wear each piece, so nothing gets forgotten. And your mood, so it always feels like you.</p>
                            <div className="flex items-center gap-4 text-lime text-xs font-medium">
                                <span className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> Weather</span>
                                <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Rotation</span>
                                <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Mood</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserMenu;

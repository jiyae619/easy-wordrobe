import React from 'react';
import { MOODS } from '../../data/moods';

interface MoodChipsProps {
    value: string;
    onChange: (id: string) => void;
}

/** Horizontal mood selector shared by Today and Picks (bleeds to the screen edges). */
export const MoodChips: React.FC<MoodChipsProps> = ({ value, onChange }) => (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => {
            const on = m.id === value;
            return (
                <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange(m.id)}
                    className={`flex-none h-9 px-3.5 rounded-full border-[1.5px] border-ink text-xs font-bold whitespace-nowrap transition-colors active:scale-[0.96] ${on ? 'bg-lime text-ink' : 'bg-transparent text-ink'}`}
                >
                    {m.name}
                </button>
            );
        })}
    </div>
);

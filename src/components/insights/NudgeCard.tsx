import React from 'react';
import { ArrowRight, RotateCw, AlertCircle, Palette, Sparkles } from 'lucide-react';

export interface NudgeData {
    type: 'frequency' | 'neglect' | 'color' | 'variety';
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
}

interface NudgeCardProps {
    nudge: NudgeData;
}

export const NudgeCard: React.FC<NudgeCardProps> = ({ nudge }) => {
    const getIcon = () => {
        switch (nudge.type) {
            case 'frequency': return <RotateCw className="w-5 h-5 text-secondary" />;
            case 'neglect': return <AlertCircle className="w-5 h-5 text-olive-500" />;
            case 'color': return <Palette className="w-5 h-5 text-olive-400" />;
            case 'variety': return <Sparkles className="w-5 h-5 text-olive-600" />;
        }
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-muted shadow-sm hover:shadow-md transition-shadow card-hover">
            <div className="flex items-start space-x-4">
                <div className="p-2.5 bg-olive-100 rounded-xl flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-primary text-sm mb-1">{nudge.title}</h4>
                    <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                        {nudge.description}
                    </p>
                    <button
                        onClick={nudge.onAction}
                        className="text-xs font-semibold text-secondary flex items-center hover:text-primary transition-colors"
                    >
                        {nudge.actionLabel}
                        <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

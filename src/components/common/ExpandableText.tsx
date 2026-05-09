import React, { useMemo, useState } from 'react';

interface ExpandableTextProps {
    text: string;
    collapsedClassName?: string;
    textClassName?: string;
    buttonClassName?: string;
    minCharsForToggle?: number;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
    text,
    collapsedClassName = 'line-clamp-2',
    textClassName = '',
    buttonClassName = 'mt-1 text-xs font-semibold text-secondary hover:underline',
    minCharsForToggle = 120,
}) => {
    const [expanded, setExpanded] = useState(false);
    const showToggle = useMemo(() => text.trim().length > minCharsForToggle, [text, minCharsForToggle]);

    return (
        <div>
            <p className={`${textClassName} ${expanded ? '' : collapsedClassName}`.trim()}>
                {text}
            </p>
            {showToggle && (
                <button
                    onClick={() => setExpanded((prev) => !prev)}
                    className={buttonClassName}
                >
                    {expanded ? 'Less' : 'More'}
                </button>
            )}
        </div>
    );
};

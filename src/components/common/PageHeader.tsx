import React from 'react';

interface PageHeaderProps {
    /** Small context line ABOVE the title (date, counts, mood…). Always above, on every page. */
    eyebrow: React.ReactNode;
    title: string;
    /** Optional row under the title for page-level info (e.g. the weather pill). */
    children?: React.ReactNode;
}

/**
 * The one header layout every tab uses: eyebrow above, big title, optional meta row below.
 * Right padding leaves room for the account avatar pinned top-right by the layout.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, children }) => (
    <header className="pr-12 min-h-[64px]">
        <p className="text-xs font-bold text-ink/60 leading-5 truncate">{eyebrow}</p>
        <h1 className="font-display text-[32px] font-extrabold leading-none tracking-tight text-ink mt-1">{title}</h1>
        {children && <div className="mt-2.5">{children}</div>}
    </header>
);

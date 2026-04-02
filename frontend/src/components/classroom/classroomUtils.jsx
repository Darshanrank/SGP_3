import { FileText, Image as ImageIcon, FileCode2, File } from 'lucide-react';

export const codeBlockClass = 'rounded-lg border border-white/5 bg-[#0A0F14] p-4 font-mono text-sm text-[#E6EEF8]';
export const chatReactionEmojiOptions = ['👍', '❤️', '🔥', '😂'];
export const rtcConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const keywordByLanguage = {
    javascript: [
        'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'import',
        'export', 'await', 'async', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined'
    ],
    typescript: [
        'type', 'interface', 'extends', 'implements', 'enum', 'public', 'private', 'protected', 'readonly',
        'const', 'let', 'function', 'return', 'if', 'else', 'async', 'await'
    ],
    java: [
        'public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'void',
        'new', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'throw', 'final', 'this', 'super'
    ],
    python: [
        'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with',
        'import', 'from', 'as', 'True', 'False', 'None', 'lambda'
    ],
    c: [
        'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'struct', 'typedef',
        'switch', 'case', 'break', 'continue'
    ],
    cpp: [
        'int', 'float', 'double', 'char', 'void', 'if', 'else', 'for', 'while', 'return', 'class', 'public',
        'private', 'protected', 'namespace', 'using', 'std', 'template', 'auto', 'const'
    ]
};

const normalizeLanguage = (value) => String(value || 'text').trim().toLowerCase();

export const renderHighlightedCodeLine = (line, language) => {
    const keywords = keywordByLanguage[normalizeLanguage(language)] || [];
    if (!keywords.length || !line) return line || ' ';

    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    const parts = line.split(regex);

    return parts.map((part, index) => {
        if (keywords.includes(part)) {
            return (
                <span key={`${part}-${index}`} className="text-[#7BB2FF]">
                    {part}
                </span>
            );
        }
        return <span key={`${part}-${index}`}>{part || (index === parts.length - 1 ? ' ' : '')}</span>;
    });
};

export const toDateTime = (value) => {
    if (!value) return 'just now';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'just now';
    return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getFileExtension = (fileName) => {
    const normalized = String(fileName || '').toLowerCase();
    const parts = normalized.split('.');
    return parts.length > 1 ? parts.pop() : '';
};

export const getFileType = (fileName) => {
    const extension = getFileExtension(fileName);
    if (['pdf'].includes(extension)) return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return 'image';
    if (['cpp', 'c', 'h', 'hpp', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'json'].includes(extension)) return 'code';
    if (['txt', 'md'].includes(extension)) return 'text';
    return 'file';
};

export const isPreviewableFile = (fileName) => {
    const type = getFileType(fileName);
    return type === 'pdf' || type === 'image' || type === 'text' || type === 'code';
};

export const getFileIcon = (fileName) => {
    const type = getFileType(fileName);
    if (type === 'pdf') return FileText;
    if (type === 'image') return ImageIcon;
    if (type === 'code') return FileCode2;
    return File;
};

export const REVIEW_CATEGORY_CONFIG = [
    { key: 'clarityRating', label: 'Clarity' },
    { key: 'punctualityRating', label: 'Punctuality' },
    { key: 'communicationRating', label: 'Communication' },
    { key: 'expertiseRating', label: 'Expertise' }
];

export const getEmptyCategoryRatings = () => ({
    clarityRating: 0,
    punctualityRating: 0,
    communicationRating: 0,
    expertiseRating: 0
});

export const computeOverallFromCategories = (ratings) => {
    const values = REVIEW_CATEGORY_CONFIG.map((item) => Number(ratings[item.key] || 0));
    if (values.some((value) => value <= 0)) return 0;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round(total / values.length);
};

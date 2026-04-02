const SocialLink = ({ href, icon: Icon, label, color }) => {
    if (!href) return null;
    const url = href.startsWith('http') ? href : `https://${href}`;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${color}`}>
            <Icon className="h-4 w-4" />
            {label}
        </a>
    );
};

export default SocialLink;

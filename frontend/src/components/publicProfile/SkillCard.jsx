import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Play } from 'lucide-react';

const levelLabel = { LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced' };
const levelColor = { LOW: 'bg-blue-500/15 text-blue-300', MEDIUM: 'bg-yellow-500/15 text-yellow-300', HIGH: 'bg-green-500/15 text-green-300' };

const formatExperienceLabel = (createdAt) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return 'N/A';

    const now = new Date();
    const months = Math.max(1, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

    if (months < 12) {
        return `${months} month${months === 1 ? '' : 's'}`;
    }

    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (remMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
    return `${years}y ${remMonths}m`;
};

const SkillCard = ({ skill, sessionsCount = 0, mode = 'teach' }) => {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = skill.preview?.videoUrl || skill.proofUrl;
    const progressPercent = Math.min(100, sessionsCount * 20);
    const progressLabel = mode === 'teach' ? 'Teaching progress' : 'Learning progress';

    return (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0E1620] transition-colors hover:bg-[#151D27]">
            <button
                type="button"
                onClick={() => hasDetails && setExpanded(!expanded)}
                className={`w-full flex items-center justify-between p-4 text-left ${hasDetails ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#DCE7F5]">{skill.skill.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColor[skill.level] || 'bg-white/10 text-[#8DA0BF]'}`}>
                        {levelLabel[skill.level] || skill.level}
                    </span>
                </div>
                {hasDetails && (
                    <span className="flex items-center gap-1 text-xs text-[#7BB2FF]">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <><Play className="h-3 w-3" /><ChevronDown className="h-4 w-4" /></>}
                    </span>
                )}
            </button>

            <div className="space-y-2 border-t border-white/10 bg-[#0E1620] p-3">
                <div className="flex items-center justify-between text-sm text-[#8DA0BF]">
                    <span>Level</span>
                    <span className="font-medium text-[#DCE7F5]">{levelLabel[skill.level] || skill.level}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#8DA0BF]">
                    <span>Experience</span>
                    <span className="font-medium text-[#DCE7F5]">{formatExperienceLabel(skill.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#8DA0BF]">
                    <span>{mode === 'teach' ? 'Taught' : 'Learned'}</span>
                    <span className="font-medium text-[#DCE7F5]">{sessionsCount} session{sessionsCount === 1 ? '' : 's'}</span>
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-[#8DA0BF]">
                        <span>{progressLabel}</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#243244]">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            </div>

            {expanded && hasDetails && (
                <div className="space-y-3 border-t border-white/10 bg-[#111721] p-4">
                    {skill.preview?.videoUrl && (
                        <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Video Demo</p>
                            <video
                                src={skill.preview.videoUrl}
                                controls
                                className="max-h-64 w-full rounded-lg border border-white/10"
                            />
                        </div>
                    )}
                    {skill.proofUrl && (
                        <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Proof Link</p>
                            <a
                                href={skill.proofUrl.startsWith('http') ? skill.proofUrl : `https://${skill.proofUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7BB2FF] hover:text-[#9FC8FF] hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {skill.proofUrl}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SkillCard;

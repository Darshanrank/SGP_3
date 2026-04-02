import SkillCard from './SkillCard';

const PublicProfileSkillsSection = ({
    teachSkills,
    learnSkills,
    teachSessionCountByUserSkillId,
    learnSessionCountByUserSkillId
}) => {
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500" /> Can Teach
                    <span className="ml-auto text-sm font-normal text-[#8DA0BF]">{teachSkills.length}</span>
                </h2>
                {teachSkills.length > 0 ? (
                    <div className="space-y-3">
                        {teachSkills.map((skill) => (
                            <SkillCard key={skill.id} skill={skill} mode="teach" sessionsCount={Number(teachSessionCountByUserSkillId[skill.id] || 0)} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm italic text-[#8DA0BF]">No teaching skills listed yet.</p>
                )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111721] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Wants to Learn
                    <span className="ml-auto text-sm font-normal text-[#8DA0BF]">{learnSkills.length}</span>
                </h2>
                {learnSkills.length > 0 ? (
                    <div className="space-y-3">
                        {learnSkills.map((skill) => (
                            <SkillCard key={skill.id} skill={skill} mode="learn" sessionsCount={Number(learnSessionCountByUserSkillId[skill.id] || 0)} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm italic text-[#8DA0BF]">No learning goals listed yet.</p>
                )}
            </div>
        </div>
    );
};

export default PublicProfileSkillsSection;

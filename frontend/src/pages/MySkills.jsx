import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { getUserSkills, removeSkill } from '../services/skill.service';
import { toast } from 'react-hot-toast';

const MySkills = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: mySkills = [], isLoading, isError } = useQuery({
        queryKey: ['mySkills'],
        queryFn: getUserSkills,
        staleTime: 60000
    });

    const handleRemoveSkill = async (skillId) => {
        try {
            await removeSkill(skillId);
            await queryClient.invalidateQueries({ queryKey: ['mySkills'] });
            toast.success('Skill removed');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to remove skill');
        }
    };

    if (isLoading) {
        return <div className="section-card text-center">Loading your skills...</div>;
    }

    if (isError) {
        return <div className="section-card text-center text-red-400">Error loading your skills.</div>;
    }

    return (
        <div className="page-shell">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="page-title">My Skills</h1>
                    <p className="text-sm text-[#8DA0BF]">Manage skills you teach and skills you want to learn.</p>
                </div>
                <Button onClick={() => navigate('/skills/new')}>+ Add Skill</Button>
            </header>

            {mySkills.length === 0 ? (
                <section className="section-card text-center">
                    <p className="text-[#DCE7F5]">You have not added any skills yet.</p>
                    <p className="mt-1 text-sm text-[#8DA0BF]">Add your first skill to start getting better swap matches.</p>
                </section>
            ) : (
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {mySkills.map((userSkill) => (
                        <article key={userSkill.id} className="section-card flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold text-[#DCE7F5]">{userSkill.skill.name}</h2>
                                <div className="mt-1 flex items-center gap-2 text-xs">
                                    <span className={`rounded-full px-2.5 py-0.5 font-medium ${userSkill.type === 'TEACH' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {userSkill.type === 'TEACH' ? 'Teaches' : 'Learns'}
                                    </span>
                                    <span className="text-[#8DA0BF]">{userSkill.level}</span>
                                </div>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => handleRemoveSkill(userSkill.id)}>
                                Remove
                            </Button>
                        </article>
                    ))}
                </section>
            )}
        </div>
    );
};

export default MySkills;

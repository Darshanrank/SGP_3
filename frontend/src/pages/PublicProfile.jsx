import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicProfile, getPublicProfileByUsername } from '../services/profile.service';

const PublicProfile = () => {
    const { userId, username } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = username
                    ? await getPublicProfileByUsername(username)
                    : await getPublicProfile(userId);
                setProfile(data);
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };

        if (username || userId) fetchProfile();
    }, [username, userId]);

    if (loading) return <div>Loading...</div>;
    if (!profile) return <div>Profile not found</div>;

    const teachSkills = profile.userSkills?.filter((skill) => skill.type === 'TEACH') || [];
    const learnSkills = profile.userSkills?.filter((skill) => skill.type === 'LEARN') || [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-4xl font-bold text-gray-400">
                    {(profile.username || profile.profile?.fullName || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{profile.username || profile.profile?.fullName || 'User'}</h1>
                    <p className="text-gray-500 mt-1">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
                    
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-2">About</h2>
                        <p className="text-gray-700">{profile.profile?.bio || "No bio yet."}</p>
                    </div>

                    {profile.profile?.learningLanguage && (
                         <div className="mt-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                Learning: {profile.profile.learningLanguage}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teaching Skills */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-green-700">Can Teach</h2>
                    <ul className="space-y-3">
                        {teachSkills.map(skill => (
                            <li key={skill.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span className="font-medium">{skill.skill.name}</span>
                                <span className="text-sm text-gray-500">{skill.level}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Learning Skills */}
                 <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-blue-700">Wants to Learn</h2>
                     <ul className="space-y-3">
                        {learnSkills.map(skill => (
                            <li key={skill.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                <span className="font-medium">{skill.skill.name}</span>
                                <span className="text-sm text-gray-500">{skill.level}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;

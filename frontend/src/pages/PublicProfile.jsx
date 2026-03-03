import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicProfile, getPublicProfileByUsername } from '../services/profile.service';
import { getUserRating, getUserReviews } from '../services/review.service';
import { Star } from 'lucide-react';

const PublicProfile = () => {
    const { userId, username } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState({ avgRating: 0, reviewCount: 0 });
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = username
                    ? await getPublicProfileByUsername(username)
                    : await getPublicProfile(userId);
                setProfile(data);

                // Fetch rating & reviews for this user
                const uid = data?.userId;
                if (uid) {
                    const [ratingData, reviewsData] = await Promise.all([
                        getUserRating(uid).catch(() => ({ avgRating: 0, reviewCount: 0 })),
                        getUserReviews(uid, 1, 5).catch(() => ({ data: [] }))
                    ]);
                    setRating(ratingData);
                    setReviews(reviewsData?.data || []);
                }
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

                    {/* Rating Badge */}
                    {rating.reviewCount > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`h-5 w-5 ${s <= Math.round(rating.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{rating.avgRating}</span>
                            <span className="text-sm text-gray-500">({rating.reviewCount} review{rating.reviewCount !== 1 ? 's' : ''})</span>
                        </div>
                    )}
                    
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

            {/* Reviews Section */}
            {reviews.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 text-gray-900">Reviews</h2>
                    <div className="space-y-4">
                        {reviews.map((r) => (
                            <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-sm text-gray-800">{r.reviewer?.username || 'User'}</span>
                                    <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-4 w-4 ${s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                                <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProfile;

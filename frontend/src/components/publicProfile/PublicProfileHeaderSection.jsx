import { MessageCircle, Star } from 'lucide-react';
import { Button } from '../ui/Button';
import SocialLink from './SocialLink';

const PublicProfileHeaderSection = ({
    p,
    profile,
    displayName,
    rating,
    socialLinks,
    isOwnProfile,
    user,
    messageBusy,
    handleMessageUser,
    openSwapModal,
    setReportOpen,
    safetyBusy,
    blockStatus,
    handleToggleBlock
}) => {
    return (
        <div className="rounded-xl border border-white/10 bg-[#111721] p-8 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt={displayName} className="h-28 w-28 rounded-full border-4 border-white/10 object-cover shadow-md" />
                ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-4xl font-bold text-white shadow-md">
                        {displayName[0].toUpperCase()}
                    </div>
                )}

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-[#DCE7F5]">{displayName}</h1>
                    {profile.profile?.fullName && profile.username && <p className="text-sm text-[#8DA0BF]">@{profile.username}</p>}
                    <p className="mt-1 text-sm text-[#8DA0BF]">Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

                    {rating.reviewCount > 0 && (
                        <div className="mt-2 flex items-center justify-center gap-2 md:justify-start">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating.avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-[#3E4D63]'}`} />
                                ))}
                            </div>
                            <span className="text-sm font-semibold text-[#DCE7F5]">{Number(rating.avgRating).toFixed(1)}</span>
                            <span className="text-sm text-[#8DA0BF]">({rating.reviewCount} review{rating.reviewCount !== 1 ? 's' : ''})</span>
                        </div>
                    )}

                    {socialLinks.length > 0 && (
                        <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                            {socialLinks.map((link) => <SocialLink key={link.label} {...link} />)}
                        </div>
                    )}

                    <div className="mt-5">
                        {p.bio ? (
                            <div className="prose prose-sm max-w-none text-[#DCE7F5]" dangerouslySetInnerHTML={{ __html: p.bio }} />
                        ) : (
                            <p className="italic text-[#8DA0BF]">No bio yet.</p>
                        )}
                    </div>

                    {!isOwnProfile && user?.userId && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            <button type="button" onClick={openSwapModal} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500">Request Skill Swap</button>
                            <button
                                type="button"
                                onClick={handleMessageUser}
                                className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                                disabled={messageBusy}
                            >
                                <MessageCircle className="h-4 w-4" />
                                {messageBusy ? 'Opening...' : 'Message'}
                            </button>
                            <Button size="sm" variant="secondary" onClick={() => setReportOpen(true)} disabled={safetyBusy}>Report User</Button>
                            <Button size="sm" variant={blockStatus?.isBlocking ? 'danger' : 'ghost'} onClick={handleToggleBlock} disabled={safetyBusy}>
                                {blockStatus?.isBlocking ? 'Unblock User' : 'Block User'}
                            </Button>
                        </div>
                    )}

                    {p.learningLanguage && (
                        <div className="mt-4">
                            <span className="inline-flex items-center rounded-full bg-purple-500/15 px-3 py-1 text-sm font-medium text-purple-300">
                                🌐 Learning: {p.learningLanguage}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfileHeaderSection;

const ProfilePreviewSection = ({
    avatarPreview,
    formData,
    composeFullName,
    profileRating,
    handleOpenReviews,
    earnedBadges
}) => {
    return (
        <section className="space-y-3">
            <h3 className="page-title">Profile Preview</h3>
            <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0E1620] p-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0B1420] px-4 py-5 text-center">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0A4D9F]/25 text-lg font-bold text-[#DCE7F5]">
                            {(formData.firstName || formData.username || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <p className="mt-3 text-lg font-semibold leading-tight text-[#DCE7F5]">{composeFullName(formData.firstName, formData.lastName) || 'Your Name'}</p>
                    <p className="mt-1 text-sm text-[#8DA0BF]">@{formData.username || 'username'}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-yellow-400">⭐</span>
                        <span>{profileRating.avgRating > 0 ? profileRating.avgRating.toFixed(1) : '0.0'}</span>
                        <span className="text-gray-500">|</span>
                        <button type="button" onClick={handleOpenReviews} className="text-gray-300 underline-offset-2 hover:text-white hover:underline">
                            {profileRating.reviewCount} Reviews
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                            <p className="text-[11px] uppercase tracking-wide text-[#8DA0BF]">Teaching Skills</p>
                            <p className="mt-1 text-base font-semibold text-[#DCE7F5]">{formData.teachSkills.filter((s) => s.skillName.trim()).length}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                            <p className="text-[11px] uppercase tracking-wide text-[#8DA0BF]">Learning Skills</p>
                            <p className="mt-1 text-base font-semibold text-[#DCE7F5]">{formData.learnSkills.filter((s) => s.skillName.trim()).length}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                            <p className="text-[11px] uppercase tracking-wide text-[#8DA0BF]">Availability Slots</p>
                            <p className="mt-1 text-base font-semibold text-[#DCE7F5]">{formData.availability.length}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-center">
                            <p className="text-[11px] uppercase tracking-wide text-[#8DA0BF]">Learning Goals</p>
                            <p className="mt-1 text-base font-semibold text-[#DCE7F5]">{formData.learningGoals.filter((goal) => String(goal || '').trim()).length}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-center text-[11px] uppercase tracking-wide text-[#8DA0BF]">Achievements</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                            {earnedBadges.length ? earnedBadges.map((badgeEntry) => (
                                <div key={badgeEntry.id} title={badgeEntry?.badge?.condition || ''} className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                                    <span>🏅</span>
                                    <span>{badgeEntry?.badge?.name || 'Achievement'}</span>
                                </div>
                            )) : (
                                <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                                    <span>🏅</span>
                                    <span>No badges yet</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfilePreviewSection;

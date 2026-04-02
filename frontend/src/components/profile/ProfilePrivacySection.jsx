const ProfilePrivacySection = ({ profileCardClass, profilePrivacy, setFormData }) => {
    return (
        <section className={`${profileCardClass} space-y-4`}>
            <h2 className="text-[21px] font-semibold text-[#DCE7F5]">Profile Privacy Controls</h2>
            <label className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm text-[#DCE7F5]">
                Show availability calendar
                <input
                    type="checkbox"
                    checked={profilePrivacy.showAvailability}
                    onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        profilePrivacy: {
                            ...prev.profilePrivacy,
                            showAvailability: e.target.checked
                        }
                    }))}
                />
            </label>
            <label className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm text-[#DCE7F5]">
                Show portfolio links
                <input
                    type="checkbox"
                    checked={profilePrivacy.showPortfolio}
                    onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        profilePrivacy: {
                            ...prev.profilePrivacy,
                            showPortfolio: e.target.checked
                        }
                    }))}
                />
            </label>
            <label className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm text-[#DCE7F5]">
                Show social links
                <input
                    type="checkbox"
                    checked={profilePrivacy.showSocialLinks}
                    onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        profilePrivacy: {
                            ...prev.profilePrivacy,
                            showSocialLinks: e.target.checked
                        }
                    }))}
                />
            </label>
        </section>
    );
};

export default ProfilePrivacySection;

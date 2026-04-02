import { Github, Linkedin, Globe, Youtube } from 'lucide-react';

const ProfileSocialLinksSection = ({ profileCardClass, formData, touched, fieldErrors, updateField, markTouched }) => {
    return (
        <section className={`${profileCardClass} space-y-5`}>
            <h2 className="text-[21px] font-semibold text-[#DCE7F5]">Social Links</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">GitHub</label>
                    <div className="relative">
                        <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.githubLink && fieldErrors.githubLink ? 'border-red-500' : ''}`} placeholder="https://github.com/username" value={formData.githubLink} onChange={(e) => updateField('githubLink', e.target.value)} onBlur={() => markTouched('githubLink')} />
                    </div>
                    {touched.githubLink && fieldErrors.githubLink && <p className="mt-1 text-xs text-red-400">{fieldErrors.githubLink}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">LinkedIn</label>
                    <div className="relative">
                        <Linkedin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.linkedinLink && fieldErrors.linkedinLink ? 'border-red-500' : ''}`} placeholder="https://linkedin.com/in/username" value={formData.linkedinLink} onChange={(e) => updateField('linkedinLink', e.target.value)} onBlur={() => markTouched('linkedinLink')} />
                    </div>
                    {touched.linkedinLink && fieldErrors.linkedinLink && <p className="mt-1 text-xs text-red-400">{fieldErrors.linkedinLink}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">Portfolio</label>
                    <div className="relative">
                        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.portfolioLink && fieldErrors.portfolioLink ? 'border-red-500' : ''}`} placeholder="https://your-portfolio.com" value={formData.portfolioLink} onChange={(e) => updateField('portfolioLink', e.target.value)} onBlur={() => markTouched('portfolioLink')} />
                    </div>
                    {touched.portfolioLink && fieldErrors.portfolioLink && <p className="mt-1 text-xs text-red-400">{fieldErrors.portfolioLink}</p>}
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-[#DCE7F5]">YouTube</label>
                    <div className="relative">
                        <Youtube className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input className={`w-full border rounded py-2 pl-9 pr-3 ${touched.youtubeLink && fieldErrors.youtubeLink ? 'border-red-500' : ''}`} placeholder="https://youtube.com/@channel" value={formData.youtubeLink} onChange={(e) => updateField('youtubeLink', e.target.value)} onBlur={() => markTouched('youtubeLink')} />
                    </div>
                    {touched.youtubeLink && fieldErrors.youtubeLink && <p className="mt-1 text-xs text-red-400">{fieldErrors.youtubeLink}</p>}
                </div>
            </div>
        </section>
    );
};

export default ProfileSocialLinksSection;

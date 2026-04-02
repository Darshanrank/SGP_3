import { Button } from '../ui/Button';

const PublicProfileModals = ({
    swapModalOpen,
    setSwapModalOpen,
    profile,
    swapForm,
    setSwapForm,
    teachSkills,
    myTeachSkills,
    swapSubmitting,
    handleSendSwapRequest,
    reportOpen,
    setReportOpen,
    reportReason,
    setReportReason,
    reportReasons,
    reportDescription,
    setReportDescription,
    safetyBusy,
    handleSubmitReport
}) => {
    return (
        <>
            {swapModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSwapModalOpen(false)}>
                    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">Request Skill Swap</h3>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Send a swap request to @{profile.username}</p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill You Want to Learn</label>
                                <select
                                    value={swapForm.learnSkillId}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, learnSkillId: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    <option value="">Select skill</option>
                                    {teachSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>{skill.skill?.name || 'Skill'}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Skill You Can Teach</label>
                                <select
                                    value={swapForm.teachSkillId}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, teachSkillId: e.target.value }))}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    <option value="">Optional</option>
                                    {myTeachSkills.map((skill) => (
                                        <option key={skill.id} value={skill.id}>{skill.skill?.name || 'Skill'}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Preferred Date</label>
                                    <input
                                        type="date"
                                        value={swapForm.preferredDate}
                                        onChange={(e) => setSwapForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Preferred Time</label>
                                    <input
                                        type="time"
                                        value={swapForm.preferredTime}
                                        onChange={(e) => setSwapForm((prev) => ({ ...prev, preferredTime: e.target.value }))}
                                        className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Message</label>
                                <textarea
                                    value={swapForm.message}
                                    onChange={(e) => setSwapForm((prev) => ({ ...prev, message: e.target.value }))}
                                    rows={4}
                                    maxLength={1000}
                                    placeholder="Add a message..."
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSwapModalOpen(false)}
                                className="rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
                                disabled={swapSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendSwapRequest}
                                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500"
                                disabled={swapSubmitting}
                            >
                                {swapSubmitting ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportOpen(false)}>
                    <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#111721] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-[#DCE7F5]">Report @{profile.username}</h3>
                        <p className="mt-1 text-sm text-[#8DA0BF]">Select a reason and optionally add details.</p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Reason</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5]"
                                >
                                    {reportReasons.map((reason) => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#8DA0BF]">Description (optional)</label>
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full rounded-lg border border-white/10 bg-[#0E1620] px-3 py-2 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3]"
                                    placeholder="Provide context for admins"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setReportOpen(false)} disabled={safetyBusy}>Cancel</Button>
                            <Button size="sm" variant="danger" onClick={handleSubmitReport} disabled={safetyBusy}>Submit Report</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PublicProfileModals;

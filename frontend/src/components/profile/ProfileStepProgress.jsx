import { Check } from 'lucide-react';

const ProfileStepProgress = ({ profileCardClass, step, profileSteps, setStep }) => {
    return (
        <section className={`${profileCardClass} space-y-4`}>
            <div>
                <h1 className="page-title mb-5">Complete Your Profile</h1>
                <p className="mt-1 text-sm text-[#8DA0BF]">Step {step} of {profileSteps.length}</p>
            </div>

            <div className="mx-auto w-full">
                <div className="flex items-center justify-between">
                    {profileSteps.map((item, index) => {
                        const isCompleted = step > item.id;
                        const isCurrent = step === item.id;
                        const isPending = step < item.id;

                        return (
                            <div key={item.id} className="flex flex-1 items-center">
                                <button type="button" onClick={() => setStep(item.id)} className="group inline-flex items-center gap-3 text-left">
                                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                                        isCompleted
                                            ? 'border-green-500/50 bg-green-500/30 text-green-400'
                                            : isCurrent
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-gray-300 bg-white text-gray-500'
                                    }`}>
                                        {isCompleted ? <Check className="h-4 w-4" /> : item.id}
                                    </span>
                                    <span className={`text-sm font-medium ${
                                        isCompleted
                                            ? 'text-green-400'
                                            : isCurrent
                                                ? 'text-blue-700'
                                                : isPending
                                                    ? 'text-gray-400'
                                                    : 'text-gray-700'
                                    }`}>
                                        {item.label}
                                    </span>
                                </button>

                                {index < profileSteps.length - 1 ? (
                                    <div className={`mx-3 h-0.5 flex-1 rounded-full ${step > item.id ? 'bg-green-400' : 'bg-gray-200'}`} />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ProfileStepProgress;

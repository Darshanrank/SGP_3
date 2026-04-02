const SWAP_TIMELINE_STEPS = ['Request', 'Accepted', 'Classroom', 'Completed'];

const SwapTimeline = ({ activeStep }) => (
    <div className="mt-4 rounded-xl border border-white/10 bg-[#0E1620] px-3 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
            {SWAP_TIMELINE_STEPS.map((step, index) => {
                const isCompleted = index <= activeStep;
                const nextCompleted = index < SWAP_TIMELINE_STEPS.length - 1 && index + 1 <= activeStep;
                return (
                    <div key={step} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className={`h-2 w-2 rounded-full ${isCompleted ? 'bg-blue-400' : 'bg-gray-500'}`} />
                            <span className={`text-xs ${isCompleted ? 'text-[#DCE7F5]' : 'text-[#8DA0BF]'}`}>
                                {step}
                            </span>
                        </div>
                        {index < SWAP_TIMELINE_STEPS.length - 1 && (
                            <span className={`h-0.5 w-8 rounded ${nextCompleted ? 'bg-blue-400/80' : 'bg-gray-700'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

export default SwapTimeline;

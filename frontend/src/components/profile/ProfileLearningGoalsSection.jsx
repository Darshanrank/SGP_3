const ProfileLearningGoalsSection = ({ profileCardClass, learningGoals, addLearningGoal, updateLearningGoal, removeLearningGoal }) => {
    return (
        <section className={`${profileCardClass} space-y-5`}>
            <div className="flex items-center justify-between">
                <h2 className="text-[21px] font-semibold text-[#DCE7F5]">Learning Goals</h2>
                <button type="button" onClick={addLearningGoal} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Add Goal</button>
            </div>
            <div className="space-y-3">
                {learningGoals.map((goal, index) => (
                    <div key={`goal-${index}`} className="flex items-center gap-2">
                        <input
                            className="w-full rounded border px-3 py-2"
                            placeholder="e.g. Build a Node.js API"
                            value={goal}
                            onChange={(e) => updateLearningGoal(index, e.target.value)}
                        />
                        <button type="button" onClick={() => removeLearningGoal(index)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProfileLearningGoalsSection;

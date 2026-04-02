import { Button } from '../ui/Button';

const ClassroomTasksPanel = ({
    isFinished,
    completedTasks,
    totalTasks,
    taskProgress,
    showTaskForm,
    setShowTaskForm,
    handleAddTodo,
    taskTitle,
    setTaskTitle,
    taskAssignedTo,
    setTaskAssignedTo,
    taskDueDate,
    setTaskDueDate,
    savingTask,
    classParticipants,
    todos,
    participantNameById,
    parseTaskAssignedUserId,
    handleToggleTodo
}) => (
    <>
        <div className="mb-4 rounded-lg border border-white/10 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#DCE7F5]">Tasks Progress</p>
                <p className="text-sm text-[#8DA0BF]">{completedTasks} / {totalTasks} Completed</p>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700">
                <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${taskProgress}%` }}
                />
            </div>
        </div>

        {showTaskForm && !isFinished && (
            <form onSubmit={handleAddTodo} className="mb-4 rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                        type="text"
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                        placeholder="Task title"
                        className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                    />
                    <select
                        value={taskAssignedTo}
                        onChange={(event) => setTaskAssignedTo(event.target.value)}
                        className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8] focus:border-[#0A4D9F] focus:outline-none"
                    >
                        <option value="">Assign user</option>
                        {classParticipants.map((participant) => (
                            <option key={participant.userId} value={participant.userId}>
                                {participant.username}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={taskDueDate}
                        onChange={(event) => setTaskDueDate(event.target.value)}
                        className="rounded-lg border border-white/10 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8] focus:border-[#0A4D9F] focus:outline-none"
                    />
                </div>
                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={savingTask}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {savingTask ? 'Adding...' : 'Add Action Item'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTaskForm(false)}
                        className="rounded-lg border border-white/20 px-4 py-2 text-sm text-[#DCE7F5] transition hover:bg-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        )}

        {todos.length === 0 && (
            <p className="text-sm text-[#8DA0BF]">No tasks yet.</p>
        )}

        <ul>
            {todos.map((todo) => (
                <li
                    key={todo.id}
                    className={`mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-slate-800 px-4 py-3 ${todo.isCompleted ? 'opacity-60 line-through' : ''}`}
                >
                    <div>
                        <p className="text-sm font-medium text-[#E6EEF8]">{todo.title}</p>
                        <p className="mt-1 text-xs text-[#8DA0BF]">
                            Assigned to: {participantNameById[parseTaskAssignedUserId(todo.description)] || 'Unassigned'}
                        </p>
                        <p className="text-xs text-[#8DA0BF]">
                            Due: {todo.dueDate ? new Date(todo.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'No due date'}
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#DCE7F5]">
                        <input
                            type="checkbox"
                            checked={todo.isCompleted}
                            onChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                            className="h-4 w-4 rounded"
                            disabled={isFinished}
                        />
                        Mark Complete
                    </label>
                </li>
            ))}
        </ul>
    </>
);

export default ClassroomTasksPanel;

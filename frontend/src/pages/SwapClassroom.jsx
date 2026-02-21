import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClassDetails, addClassTodo, toggleTodo, completeClass } from '../services/swap.service';
import { getMessages, sendMessage } from '../services/chat.service';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQuery from here
import io from 'socket.io-client';

const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const SwapClassroom = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [swapClass, setSwapClass] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    // Initial Load
    useEffect(() => {
        const fetchClassData = async () => {
            try {
                const data = await getClassDetails(id);
                setSwapClass(data);
                if (data) {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    const s = io(socketUrl, {
                        withCredentials: true,
                        autoConnect: true,
                        auth: token ? { token } : undefined,
                    });
                    socketRef.current = s;
                    s.emit('join_chat', id);
                    s.on('error', (msg) => {
                        if (msg === 'Not authorized for this class') {
                            toast.error('Not authorized for this class');
                        }
                    });
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load classroom");
            } finally {
                setLoading(false);
            }
        };
        fetchClassData();

        return () => {
            if (socketRef.current) {
                socketRef.current.off('receive_message');
                socketRef.current.off('error');
                socketRef.current.disconnect();
            }
        };
    }, [id]);

    // React Query for Messages (no polling)
    const { 
        data: messagesData,
    } = useQuery({
        queryKey: ['chat', id, page],
        queryFn: () => getMessages(id, page, 50),
        keepPreviousData: true,
    });

    const messages = messagesData?.data || [];
    const meta = messagesData?.meta;

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (newMessage) => {
            // Optimistically update the cache
            queryClient.setQueryData(['chat', id, page], (oldData) => {
                if (!oldData) return { data: [newMessage], meta: { total: 1 } };
                // Check if message already exists to avoid dupes (e.g. from optimistic update)
                // Though here we rely on socket for the update, so simplistic append is fine for now
                return {
                    ...oldData,
                    data: [...oldData.data, newMessage], 
                };
            });
        };

        const s = socketRef.current;
        if (!s) return () => {};

        s.on('receive_message', handleNewMessage);

        return () => {
            s.off('receive_message', handleNewMessage);
        };
    }, [id, page, queryClient]);

    useEffect(() => {
        // Auto-scroll on new messages
        if (messages.length > 0) {
             chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]); 

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await sendMessage(id, newMessage);
            setNewMessage("");
            // No need to manually refetch, the socket event 'receive_message' will update UI
        } catch (error) {
            toast.error("Failed to send");
        }
    };

    const handleAddTodo = async () => {
        const title = prompt("Enter task title:");
        if (!title) return;

        try {
            const todo = await addClassTodo(id, { title });
            setSwapClass(prev => ({
                ...prev,
                todos: [...prev.todos, todo]
            }));
            toast.success("Todo added");
        } catch (error) {
            toast.error("Failed to add todo");
        }
    };

    const handleToggleTodo = async (todoId, currentStatus) => {
        try {
            await toggleTodo(todoId, !currentStatus);
            setSwapClass(prev => ({
                ...prev,
                todos: prev.todos.map(t => t.id === todoId ? { ...t, isCompleted: !currentStatus } : t)
            }));
        } catch (error) {
             toast.error("Failed to update todo");
        }
    };

    const handleCompleteClass = async () => {
        if (!window.confirm("Are you sure you want to mark this class as completed?")) return;
        try {
            await completeClass(id);
            toast.success("Class marked as complete!");
            // Refresh
            const data = await getClassDetails(id);
            setSwapClass(data);
        } catch (error) {
             toast.error("Error completing class");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading classroom...</div>;
    if (!swapClass) return <div className="p-8 text-center">Class not found.</div>;

    const isFinished = swapClass.status === 'COMPLETED';

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
            {/* Left: Class Details & Todos */}
            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">Classroom #{swapClass.id}</h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isFinished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {swapClass.status}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                        <div>
                            <p className="text-gray-500">Teaching</p>
                            <p className="font-semibold">{swapClass.swapRequest.teachSkill?.skill.name || "TBD"}</p>
                        </div>
                         <div>
                            <p className="text-gray-500">Learning</p>
                            <p className="font-semibold">{swapClass.swapRequest.learnSkill.skill.name}</p>
                        </div>
                    </div>

                    {!isFinished && (
                        <div className="flex space-x-3">
                            <Button onClick={handleAddTodo} size="sm" variant="secondary">+ Add Task</Button>
                            <Button onClick={handleCompleteClass} size="sm" variant="primary">Mark Complete</Button>
                        </div>
                    )}
                </div>

                {/* Todos */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg mb-4">Action Items</h3>
                    {(!swapClass.todos || swapClass.todos.length === 0) && <p className="text-gray-400 text-sm">No tasks yet.</p>}
                    <ul className="space-y-2">
                        {(swapClass.todos || []).map(todo => (
                            <li key={todo.id} className="flex items-center space-x-3">
                                <input 
                                    type="checkbox" 
                                    checked={todo.isCompleted} 
                                    onChange={() => handleToggleTodo(todo.id, todo.isCompleted)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    disabled={isFinished}
                                />
                                <span className={todo.isCompleted ? "line-through text-gray-400" : ""}>{todo.title}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Right: Chat */}
            <div className="w-full md:w-96 flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 h-full">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold">Chat</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map(msg => {
                        const isMe = msg.senderId === user.userId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-lg p-3 text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                    <p>{msg.message}</p>
                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex gap-2">
                    <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isFinished}
                    />
                    <Button type="submit" size="sm" disabled={!newMessage.trim() || isFinished}>Send</Button>
                </form>
            </div>
        </div>
    );
};

export default SwapClassroom;

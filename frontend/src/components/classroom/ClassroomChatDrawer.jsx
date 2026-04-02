import { Search, Paperclip, X, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';

const ClassroomChatDrawer = ({
    isOpen,
    onClose,
    partnerInitial,
    partner,
    partnerOnline,
    searchQuery,
    setSearchQuery,
    onSearch,
    searching,
    searchResults,
    activeSearchIndex,
    jumpToSearchResult,
    messageListRef,
    onChatScroll,
    loadingMessages,
    messagesMeta,
    onLoadOlder,
    loadingOlder,
    messages,
    messageRefs,
    userId,
    isGroupedWithPrevious,
    setActiveReactionMessageId,
    activeReactionMessageId,
    chatReactionEmojiOptions,
    myReactionByMessage,
    onReactToMessage,
    highlightedText,
    formatMessageTimestamp,
    getMessageStatusText,
    messageReactions,
    partnerTyping,
    chatEndRef,
    selectedFile,
    setSelectedFile,
    fileInputRef,
    isFinished,
    newMessage,
    onInputChange,
    sendingMessage,
    onSendMessage
}) => {
    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    aria-label="Close chat drawer overlay"
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/50"
                />
            )}

            <div
                className={`fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-slate-900 shadow-2xl transition-transform duration-300 sm:w-95 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0A4D9F]/30 text-sm font-semibold text-[#DCE7F5]">
                            {partnerInitial}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#DCE7F5]">{partner?.username || 'Partner'}</p>
                            <p className={`text-xs ${partnerOnline ? 'text-green-400' : 'text-gray-400'}`}>
                                {partnerOnline ? '🟢 Online' : '⚫ Offline'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-[#DCE7F5] transition hover:bg-slate-800"
                    >
                        Close
                    </button>
                </div>

                <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F83A3]" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onSearch();
                                    }
                                }}
                                placeholder="Search messages"
                                className="h-9 w-full rounded-lg border border-white/10 bg-[#111721] pl-8 pr-3 text-sm text-[#DCE7F5] placeholder:text-[#6F83A3] focus:border-[#0A4D9F] focus:outline-none"
                            />
                        </div>
                        <Button size="sm" variant="secondary" onClick={onSearch} disabled={searching}>
                            {searching ? '...' : 'Find'}
                        </Button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="ghost" onClick={() => jumpToSearchResult(activeSearchIndex + 1)}>
                                {activeSearchIndex + 1}/{searchResults.length}
                            </Button>
                        </div>
                    )}
                </div>

                <div ref={messageListRef} onScroll={onChatScroll} className="flex-1 space-y-3 overflow-y-auto p-4">
                    {loadingMessages ? (
                        <p className="py-4 text-center text-sm text-[#8DA0BF]">Loading messages...</p>
                    ) : (
                        <>
                            {messagesMeta.hasMore && (
                                <div className="mb-3 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={onLoadOlder}
                                        disabled={loadingOlder}
                                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#111721] px-3 py-1 text-xs text-[#8DA0BF] hover:text-[#DCE7F5] disabled:opacity-60"
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        {loadingOlder ? 'Loading...' : 'Load older'}
                                    </button>
                                </div>
                            )}

                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === userId;
                                const grouped = isGroupedWithPrevious(index);
                                const hidePlaceholderText = msg.messageType !== 'TEXT' && String(msg.message || '').startsWith('[Attachment]');

                                return (
                                    <div
                                        key={msg.id}
                                        ref={(el) => {
                                            if (el) messageRefs.current[msg.id] = el;
                                        }}
                                        className={grouped ? 'mt-1' : 'mt-3'}
                                    >
                                        {!grouped && !isMe && (
                                            <p className="mb-1 ml-10 text-xs font-medium text-[#8DA0BF]">{msg.sender?.username || 'Partner'}</p>
                                        )}

                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2.5`}>
                                            {!isMe && (
                                                <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#111721] text-xs font-semibold text-[#DCE7F5] ${grouped ? 'invisible' : ''}`}>
                                                    {(msg.sender?.username || 'U').charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            <div
                                                className={`relative max-w-xs rounded-xl px-3 py-2 text-sm leading-normal ${isMe ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-slate-800 text-[#E6EEF8]'}`}
                                                onMouseEnter={() => setActiveReactionMessageId(msg.id)}
                                                onMouseLeave={() => setActiveReactionMessageId((prev) => (prev === msg.id ? null : prev))}
                                            >
                                                {activeReactionMessageId === msg.id && (
                                                    <div className={`absolute bottom-full mb-1 flex gap-2 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 ${isMe ? 'right-0' : 'left-0'}`}>
                                                        {chatReactionEmojiOptions.map((emoji) => {
                                                            const isSelected = myReactionByMessage[msg.id] === emoji;
                                                            return (
                                                                <button
                                                                    key={`${msg.id}_${emoji}`}
                                                                    type="button"
                                                                    onClick={() => onReactToMessage(msg.id, emoji)}
                                                                    className={`rounded px-1 text-base transition ${isSelected ? 'bg-white/15' : 'hover:bg-white/10'}`}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {!hidePlaceholderText && msg.message && (
                                                    <p className="whitespace-pre-wrap wrap-break-word">{highlightedText(msg.message)}</p>
                                                )}

                                                {msg.attachmentUrl && msg.messageType === 'IMAGE' && (
                                                    <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                                                        <img src={msg.attachmentUrl} alt={msg.attachmentName || 'attachment'} loading="lazy" className="max-h-56 w-full rounded-xl border border-white/6 object-cover" />
                                                    </a>
                                                )}

                                                {msg.attachmentUrl && msg.messageType === 'FILE' && (
                                                    <a
                                                        href={msg.attachmentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-2 block rounded-xl border border-white/6 bg-[#111721] p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="truncate text-sm text-[#E6EEF8]">{msg.attachmentName || 'File attachment'}</span>
                                                            <span className="shrink-0 text-xs text-[#7BB2FF] underline">Download</span>
                                                        </div>
                                                    </a>
                                                )}

                                                {messageReactions[msg.id] && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {Object.entries(messageReactions[msg.id]).map(([emoji, count]) => (
                                                            <span key={`${msg.id}_${emoji}`} className="rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-xs">
                                                                {emoji} {count}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className={`mt-1 text-xs ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {formatMessageTimestamp(msg.createdAt)}
                                                </div>

                                                {isMe && (
                                                    <div className="text-xs text-blue-100/90">
                                                        {getMessageStatusText(msg)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {partnerTyping && (
                                <div className="ml-10 mt-2 text-xs italic text-gray-400">
                                    <span>{partner?.username || 'Partner'} is typing...</span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </>
                    )}
                </div>

                <div className="border-t border-white/10 p-3">
                    <div className="space-y-2">
                        {selectedFile && (
                            <div className="flex items-center justify-between rounded-xl border border-white/6 bg-[#111721] px-3 py-2 text-sm text-[#E6EEF8]">
                                <span className="truncate">{selectedFile.name}</span>
                                <button type="button" onClick={() => setSelectedFile(null)} className="ml-2 rounded p-1 hover:bg-white/10">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={onSendMessage} className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                disabled={isFinished}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-[#8DA0BF] transition hover:bg-slate-700 hover:text-[#DCE7F5]"
                                disabled={isFinished}
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>

                            <input
                                type="text"
                                value={newMessage}
                                onChange={onInputChange}
                                placeholder={selectedFile ? 'Add a caption (optional)...' : 'Type message...'}
                                className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-[#E6EEF8] placeholder:text-[#8DA0BF] focus:border-[#0A4D9F] focus:outline-none"
                                disabled={isFinished || sendingMessage}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isFinished || sendingMessage || (!newMessage.trim() && !selectedFile)}
                                className="rounded-lg bg-[#0A4D9F] px-4 text-white hover:bg-[#083A78]"
                            >
                                {sendingMessage ? 'Sending...' : 'Send'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClassroomChatDrawer;

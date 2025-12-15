import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../hooks/useChat';

export default function ChatInterface() {
    const { messages, status, isThinking, sendMessage, reconnect } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || status !== 'connected') return;

        sendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-bg-primary">
            {/* Header / Status Bar */}
            <div className="h-12 border-b border-border-color flex items-center px-6 justify-between bg-bg-secondary/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <div className={clsx(
                        "w-2.5 h-2.5 rounded-full",
                        status === 'connected' ? "bg-success shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                            status === 'connecting' ? "bg-accent-secondary animate-pulse" : "bg-error"
                    )} />
                    <span className="text-sm font-medium text-text-secondary">
                        {status === 'connected' ? '助手就绪' :
                            status === 'connecting' ? '连接中...' : '已断开'}
                    </span>
                </div>
                {status === 'disconnected' && (
                    <button onClick={reconnect} className="text-xs text-accent-primary hover:underline">
                        重新连接
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {messages.map((msg, idx) => (
                    <MessageBubble key={idx} message={msg} />
                ))}

                {isThinking && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-bg-secondary border border-border-color text-text-secondary px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-accent-primary" />
                            <span className="text-sm">正在思考数据库结构...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-bg-secondary/30 border-t border-border-color">
                <form
                    onSubmit={handleSubmit}
                    className="relative glass-panel rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-accent-primary/50 transition-all"
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="请输入您的问题... (例如: 查询所有订单)"
                        className="w-full bg-transparent border-none text-text-primary p-4 pr-12 resize-none h-[60px] focus:outline-none placeholder:text-text-tertiary font-sans text-sm leading-relaxed scrollbar-hide"
                        disabled={status !== 'connected'}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || status !== 'connected'}
                        className="absolute right-3 bottom-3 p-2 text-accent-primary hover:bg-accent-primary/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-text-tertiary">按 Enter 发送, Shift + Enter 换行</span>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isError = message.role === 'error';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4 opacity-75">
                <span className="text-xs text-text-tertiary bg-bg-tertiary/20 px-3 py-1 rounded-full border border-border-color/50">
                    {message.content}
                </span>
            </div>
        );
    }

    return (
        <div className={clsx(
            "flex w-full animate-fade-in",
            isUser ? "justify-end" : "justify-start"
        )}>
            <div className={clsx(
                "max-w-[80%] px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                isUser
                    ? "bg-accent-primary text-white rounded-tr-none"
                    : isError
                        ? "bg-error/10 text-error border border-error/20 rounded-tl-none"
                        : "bg-bg-secondary text-text-secondary border border-border-color rounded-tl-none"
            )}>
                {isError && <div className="flex items-center gap-2 mb-1 font-bold"><AlertCircle size={14} /> Error</div>}
                <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeText = String(children).replace(/\n$/, '');

                                if (!inline && match) {
                                    return (
                                        <div className="relative group my-4 rounded-lg overflow-hidden border border-border-color bg-[#0d1117]">
                                            <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary/30 border-b border-border-color/50 text-xs text-text-tertiary">
                                                <span>{match[1]}</span>
                                                <CopyButton text={codeText} />
                                            </div>
                                            <div className="p-3 overflow-x-auto">
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    );
                                }
                                return <code className="bg-bg-tertiary/50 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>;
                            }
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="复制代码"
        >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
        </button>
    );
}

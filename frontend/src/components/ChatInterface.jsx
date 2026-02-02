import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertCircle, Copy, Check, Bot, User, Sparkles, PanelRightOpen, PanelRightClose, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../hooks/useChat';

export default function ChatInterface() {
    const { messages, status, isThinking, logs, currentStatus, sendMessage, reconnect } = useChat();
    const [input, setInput] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const messagesEndRef = useRef(null);
    const logsEndRef = useRef(null);

    // 自动滚动到日志底部
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // 自动打开侧边栏
    useEffect(() => {
        if (isThinking && !showDetails) {
            setShowDetails(true);
        }
    }, [isThinking]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        // 如果断开连接，先尝试重连
        if (status !== 'connected') {
            reconnect();
            return;
        }
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
        <div className="flex h-full w-full bg-white relative">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full border-r border-border-color/50">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-border-color bg-white/50 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-text-primary tracking-tight">智能数据分析</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={clsx("w-1.5 h-1.5 rounded-full", status === 'connected' ? "bg-success" : "bg-error")} />
                                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                                    {status === 'connected' ? '就绪' : '断开连接'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className={clsx(
                            "p-2 rounded-xl transition-all",
                            showDetails ? "bg-accent-secondary/10 text-accent-secondary" : "text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary"
                        )}
                    >
                        {showDetails ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>
                </header>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth custom-scrollbar bg-[#fafafa]/30">
                    <div className="max-w-3xl mx-auto space-y-8 pb-10">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-white shadow-xl shadow-black/5 rounded-3xl flex items-center justify-center mb-6 text-accent-secondary ring-1 ring-black/5">
                                    <Bot size={34} strokeWidth={1.5} />
                                </div>
                                <h2 className="text-2xl font-bold text-text-primary mb-3">开始您的数据对话</h2>
                                <p className="text-text-tertiary text-sm max-w-sm leading-relaxed">
                                    您可以输入如 "展示前10个订单" 或 "统计上月收入总和" 等指令，我将为您生成 SQL 并执行。
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <MessageBubble key={idx} message={msg} />
                        ))}

                        {isThinking && (
                            <div className="flex gap-5 animate-fade-in px-2">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center mt-1 border border-border-color">
                                    <Bot size={16} className="text-text-secondary" />
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-secondary bg-white border border-border-color/60 px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm ring-1 ring-black/5">
                                    <Loader2 size={14} className="animate-spin text-accent-secondary" />
                                    <span className="font-medium">{currentStatus || '思考中...'}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-8 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent">
                    <div className="max-w-3xl mx-auto relative">
                        <form
                            onSubmit={handleSubmit}
                            className="relative bg-white border border-border-color shadow-2xl shadow-black/5 rounded-2xl overflow-hidden focus-within:border-accent-primary focus-within:ring-4 focus-within:ring-accent-primary/5 transition-all duration-300 ring-1 ring-black/5"
                        >
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={status !== 'connected' ? "连接中，请稍候..." : "输入您想查询的内容..."}
                                className="w-full bg-transparent border-none text-text-primary px-5 py-3 pr-16 resize-none min-h-[48px] max-h-[160px] focus:outline-none placeholder:text-text-tertiary text-sm leading-relaxed"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    type="submit"
                                    disabled={!input.trim() || status !== 'connected'}
                                    className="p-2.5 bg-accent-primary text-white rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-lg shadow-black/10"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                        <div className="flex justify-center mt-4 gap-6">
                            <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                                <Terminal size={12} /> 按 Enter 发送
                            </div>
                            <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                                <Sparkles size={12} /> AI 驱动分析
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Details Panel */}
            {showDetails && (
                <div className="w-[320px] h-full bg-[#fcfcfc] flex flex-col animate-slide-in-right border-l border-border-color z-30">
                    <header className="h-16 px-6 flex items-center border-b border-border-color shrink-0 bg-white">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                            分析详情
                        </h3>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-4">
                            {logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <Terminal size={32} className="mb-4" />
                                    <p className="text-[10px] uppercase font-bold tracking-[0.2em]">等待执行日志</p>
                                </div>
                            ) : (
                                <>
                                    {logs
                                        .filter(log => log.type !== 'thought' || log.sql || log.tool)
                                        .map((log, i) => (
                                            <div key={i} className="animate-fade-in space-y-2">
                                                <div className="flex items-center gap-2 px-1">
                                                    <div className={clsx(
                                                        "w-1.5 h-1.5 rounded-full shadow-sm",
                                                        log.type === 'thought' ? "bg-accent-secondary" : "bg-success"
                                                    )} />
                                                    <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                                                        {log.type === 'thought' ? '工作思路' : `工具执行: ${log.tool || '未知'}`}
                                                    </h4>
                                                </div>
                                                <div className="bg-white border border-border-color/60 rounded-xl p-3 shadow-sm ring-1 ring-black/[0.02]">
                                                    <p className="text-[11px] text-text-secondary leading-relaxed">
                                                        {log.content}
                                                    </p>
                                                    {log.sql && (
                                                        <div className="mt-2.5 bg-[#0d1117] text-[#e6edf3] rounded-lg p-3 font-mono text-[10px] shadow-inner overflow-x-auto relative group/sql">
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover/sql:opacity-100 transition-opacity">
                                                                <Copy size={10} className="text-gray-500 hover:text-white cursor-pointer" />
                                                            </div>
                                                            <code className="whitespace-pre-wrap">{log.sql}</code>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    {!isThinking && logs.length > 0 && (
                                        <div className="animate-fade-in space-y-2">
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-1.5 h-1.5 rounded-full shadow-sm bg-green-500" />
                                                <h4 className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                                                    ✓ 分析完成
                                                </h4>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const isError = message.role === 'error';

    if (message.role === 'system') return null;

    return (
        <div className={clsx(
            "flex gap-5 w-full animate-fade-in group px-2",
            isUser ? "flex-row-reverse" : "flex-row"
        )}>
            {/* Avatar */}
            <div className={clsx(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-sm transition-transform duration-300 group-hover:scale-110",
                isUser ? "bg-accent-primary text-white" : "bg-white border border-border-color text-text-secondary"
            )}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble Container */}
            <div className={clsx(
                "max-w-[85%] flex flex-col gap-1.5",
                isUser ? "items-end" : "items-start"
            )}>
                {/* Bubble Body */}
                <div className={clsx(
                    "px-6 py-4 text-sm leading-relaxed shadow-sm transition-all duration-300 group-hover:shadow-md",
                    isUser
                        ? "bg-[#1a1c1e] text-white rounded-2xl rounded-tr-sm border border-black/10"
                        : isError
                            ? "bg-error/5 text-error border border-error/10 rounded-2xl rounded-tl-sm chat-markdown"
                            : "bg-white border border-border-color text-text-secondary rounded-2xl rounded-tl-sm chat-markdown ring-1 ring-black/[0.02]"
                )}>
                    {isError && (
                        <div className="flex items-center gap-2 mb-3 py-1 px-2.5 bg-error/10 rounded-lg text-xs font-bold w-fit tracking-tight">
                            <AlertCircle size={14} /> SYSTEM ERROR
                        </div>
                    )}

                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:text-text-primary prose-headings:font-bold prose-strong:text-text-primary prose-code:bg-bg-secondary/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-accent-secondary">
                        <ReactMarkdown
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');

                                    if (!inline && match) {
                                        return (
                                            <div className="relative group/code my-4 rounded-xl overflow-hidden border border-border-color bg-[#0d1117] shadow-xl text-slate-200">
                                                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    <span>{match[1]}</span>
                                                    <CopyButton text={codeText} />
                                                </div>
                                                <div className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono">
                                                    <code className={clsx(className, "text-slate-200")} {...props}>
                                                        {children}
                                                    </code>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return <code className={className} {...props}>{children}</code>;
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Footer / Meta (Optional) */}
                <div className="px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">
                        {isUser ? 'You' : 'Assistant'} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
            className="flex items-center gap-1.5 hover:text-white transition-colors"
            title="Copy code"
        >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? '已复制' : '复制'}</span>
        </button>
    );
}

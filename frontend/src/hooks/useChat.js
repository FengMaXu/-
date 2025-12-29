import { useState, useEffect, useRef, useCallback } from 'react';

export function useChat() {
    const [messages, setMessages] = useState([
        { role: 'system', content: '欢迎使用数据库副驾驶！请连接数据库开始查询。' }
    ]);
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error
    const [isThinking, setIsThinking] = useState(false);
    const [logs, setLogs] = useState([]); // 存储工作日志
    const [currentStatus, setCurrentStatus] = useState(''); // 当前进度提示

    const wsRef = useRef(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setStatus('connecting');
        // In Vite dev, /ws proxies to ws://localhost:8000/chat
        // In prod, use relative protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/chat`;

        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket Connected');
            setStatus('connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            } catch (e) {
                console.error('Failed to parse message:', event.data);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            setStatus('error');
        };

        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setStatus('disconnected');
        };

        wsRef.current = ws;
    }, []);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const sendMessage = useCallback((content) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Add user message immediately
            setMessages(prev => [...prev, { role: 'user', content }]);
            setLogs([]); // 清空旧日志
            setCurrentStatus('🤔 正在准备...');

            wsRef.current.send(JSON.stringify({ content }));
        } else {
            console.warn('WebSocket not connected');
        }
    }, []);

    const handleServerMessage = (data) => {
        // data structure: { type: 'system'|'response'|'status'|'error'|'thought'|'tool_call', content: string, status?: string }

        switch (data.type) {
            case 'system':
                setMessages(prev => [...prev, { role: 'system', content: data.content }]);
                break;
            case 'response':
                setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
                setIsThinking(false);
                setCurrentStatus('');
                break;
            case 'status':
                setIsThinking(true);
                setCurrentStatus(data.content);
                break;
            case 'thought':
            case 'tool_call':
                console.log('📋 Received log data:', data);
                setIsThinking(true); // 只要有日志动作，就在思考
                setLogs(prev => [...prev, data]);
                if (data.content) {
                    setCurrentStatus(data.content);
                }
                break;
            case 'error':
                setMessages(prev => [...prev, { role: 'error', content: data.content }]);
                setIsThinking(false);
                setCurrentStatus('');
                break;
            default:
                console.log('Unknown message type:', data);
        }
    };

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        messages,
        status,
        isThinking,
        logs,
        currentStatus,
        sendMessage,
        reconnect: connect
    };
}

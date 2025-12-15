import React, { useState, useEffect } from 'react';
import { Database, Settings, Table, Search, ChevronRight, ChevronDown, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';

export default function Sidebar({ isOpen, onSelectTable, activeView, refreshKey }) {
    const [expandedTables, setExpandedTables] = useState({});
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch tables from backend on mount and when refreshKey changes
    useEffect(() => {
        const fetchTables = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get('/api/v1/tables');
                if (response.data.success && response.data.tables) {
                    let tableData = response.data.tables;
                    if (Array.isArray(tableData)) {
                        setTables(tableData.map(t => typeof t === 'string' ? { name: t, schema: [] } : t));
                    }
                } else if (response.data.error) {
                    setError(response.data.error);
                }
            } catch (err) {
                console.error('Failed to fetch tables:', err);
                setError('无法加载表列表');
            } finally {
                setLoading(false);
            }
        };

        fetchTables();
    }, [refreshKey]);

    const toggleTable = (tableName) => {
        setExpandedTables(prev => ({
            ...prev,
            [tableName]: !prev[tableName]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="w-[280px] bg-bg-secondary flex flex-col border-r border-border-color h-full transition-all duration-300">
            {/* Header */}
            <div className="p-4 border-b border-border-color flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary tracking-wide flex items-center gap-2">
                    <Database size={16} className="text-accent-primary" />
                    数据库资源
                </h2>
                <button className="text-text-tertiary hover:text-text-primary transition-colors">
                    <Settings size={16} />
                </button>
            </div>

            {/* Connection Info */}
            <div className="px-4 py-3 bg-bg-tertiary/20">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span className="text-xs font-medium text-text-primary">Production DB (MySQL)</span>
                </div>
                <div className="text-[10px] text-text-tertiary font-mono">host: aws-rds-primary</div>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-text-tertiary" />
                    <input
                        type="text"
                        placeholder="搜索表..."
                        className="w-full bg-bg-primary rounded-md pl-9 pr-3 py-2 text-xs text-text-primary border border-border-color focus:border-accent-primary focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Table List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                <h3 className="px-2 py-2 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                    表列表 {!loading && `(${tables.length})`}
                </h3>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-accent-primary" />
                        <span className="ml-2 text-xs text-text-tertiary">加载中...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="text-xs text-error px-2 py-4">{error}</div>
                )}

                {!loading && !error && tables.length === 0 && (
                    <div className="text-xs text-text-tertiary px-2 py-4">暂无表数据</div>
                )}

                {!loading && tables.map(table => (
                    <div key={table.name} className="group">
                        <button
                            onClick={() => toggleTable(table.name)}
                            className="w-full flex items-center px-2 py-1.5 rounded-md hover:bg-bg-tertiary/50 text-text-secondary hover:text-text-primary transition-colors text-xs"
                        >
                            {expandedTables[table.name] ? (
                                <ChevronDown size={14} className="mr-1.5 text-text-tertiary" />
                            ) : (
                                <ChevronRight size={14} className="mr-1.5 text-text-tertiary" />
                            )}
                            <Table size={14} className="mr-2 text-accent-secondary" />
                            <span className="truncate">{table.name}</span>
                        </button>

                        {/* Schema Columns (Expanded) */}
                        {expandedTables[table.name] && (
                            <div className="ml-7 pl-2 border-l border-border-color/50 my-1 space-y-1">
                                {table.schema.map(col => (
                                    <div key={col} className="text-[10px] text-text-tertiary hover:text-text-secondary py-0.5 cursor-default truncate">
                                        {col}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-border-color bg-bg-tertiary/10 space-y-2">
                {activeView === 'settings' ? (
                    <button
                        onClick={() => onSelectTable('chat')}
                        className="flex items-center gap-3 w-full p-2.5 bg-accent-primary text-white rounded-lg transition-colors text-xs font-medium hover:bg-accent-primary/80"
                    >
                        <MessageSquare size={16} />
                        <span>返回对话</span>
                    </button>
                ) : (
                    <button
                        onClick={() => onSelectTable('settings')}
                        className="flex items-center gap-3 w-full p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary hover:text-text-primary text-xs"
                    >
                        <Settings size={16} />
                        <span>系统设置</span>
                    </button>
                )}
            </div>
        </div>
    );
}

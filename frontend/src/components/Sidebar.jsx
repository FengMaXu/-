import React, { useState, useEffect } from 'react';
import { Table, Search, ChevronRight, ChevronDown, Loader2, Database, AlertCircle, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';

export default function Sidebar({ onSelectTable, activeView, refreshKey }) {
    const [expandedTables, setExpandedTables] = useState({});
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch tables
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
                } else {
                    // If backend returns success: false with an error message
                    setError(response.data.error || '无法连接数据库');
                    setTables([]);
                }
            } catch (err) {
                console.error('Failed to fetch tables:', err);
                setError('服务器连接失败');
                setTables([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTables();
    }, [refreshKey]);

    const toggleTable = (tableName) => {
        setExpandedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }));
    };

    return (
        <div className="w-[260px] bg-[#f8f9fa] flex flex-col h-full border-r border-border-color">
            {/* Header / Context */}
            <div className="p-5">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-accent-primary transition-colors" size={14} />
                    <input
                        type="text"
                        placeholder="搜索数据表..."
                        className="w-full bg-white border border-border-color rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/5 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Table List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 size={20} className="animate-spin text-accent-secondary" />
                        <span className="text-[11px] text-text-tertiary font-medium">正在读取架构...</span>
                    </div>
                ) : error ? (
                    <div className="px-3 py-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
                            <AlertCircle size={18} className="text-error" />
                        </div>
                        <p className="text-[11px] font-semibold text-text-secondary px-2">{error}</p>
                        <button
                            onClick={() => onSelectTable('settings')}
                            className="mt-4 text-[10px] text-accent-secondary font-bold hover:underline"
                        >
                            去配置数据库 →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {tables.map(table => (
                            <div key={table.name} className="group">
                                <button
                                    onClick={() => toggleTable(table.name)}
                                    className={clsx(
                                        "w-full flex items-center px-2.5 py-2 rounded-xl transition-all duration-200 text-[13px]",
                                        expandedTables[table.name] ? "bg-white text-text-primary shadow-sm ring-1 ring-black/5" : "text-text-secondary hover:bg-white/60 hover:text-text-primary"
                                    )}
                                >
                                    <Table size={15} className={clsx("mr-2.5", expandedTables[table.name] ? "text-accent-secondary" : "text-text-tertiary")} />
                                    <span className="truncate font-medium">{table.name}</span>
                                    <ChevronRight size={14} className={clsx("ml-auto text-text-tertiary transition-transform duration-200", expandedTables[table.name] && "rotate-90")} />
                                </button>

                                {/* Column Schema - Placeholder for now */}
                                {expandedTables[table.name] && (
                                    <div className="mt-1 ml-6 pl-3 border-l-2 border-border-color space-y-1 animate-slide-down">
                                        <div className="text-[11px] text-text-tertiary py-1 italic">正在加载列...</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {tables.length === 0 && !loading && !error && (
                            <div className="text-center py-10">
                                <Database size={24} className="mx-auto text-text-tertiary mb-3 opacity-20" />
                                <p className="text-[11px] text-text-tertiary">没有找到任何表</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Status Panel */}
            <div className="p-4 border-t border-border-color bg-white/50">
                <div className="flex items-center gap-3">
                    <div className={clsx("w-2 h-2 rounded-full", tables.length > 0 ? "bg-success shadow-success/40 shadow-lg" : "bg-text-tertiary")} />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">
                        {tables.length > 0 ? `已连接 (${tables.length} 个表)` : '未连接数据库'}
                    </span>
                </div>
            </div>
        </div>
    );
}


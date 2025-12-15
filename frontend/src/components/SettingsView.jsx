import React, { useState } from 'react';
import { Save, Database, Server, Key, User, Activity, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function SettingsView({ onBack, onConfigSaved }) {
    const [dbConfig, setDbConfig] = useState({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: ''
    });

    const [status, setStatus] = useState('idle'); // idle, testing, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const value = e.target.name === 'port' ? parseInt(e.target.value) || 3306 : e.target.value;
        setDbConfig({ ...dbConfig, [e.target.name]: value });
    };

    const handleTestConnection = async () => {
        setStatus('testing');
        setErrorMsg('');
        try {
            const response = await axios.post('/api/v1/config/test', dbConfig);
            if (response.data.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMsg(response.data.error || '连接失败');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.response?.data?.error || '连接测试失败');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await axios.post('/api/v1/config', dbConfig);
            if (response.data.success) {
                alert('配置已保存！');
                // Trigger refresh of tables in sidebar
                if (onConfigSaved) onConfigSaved();
            } else {
                alert('保存失败: ' + (response.data.error || '未知错误'));
            }
        } catch (err) {
            alert('保存失败: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 h-full bg-bg-primary overflow-y-auto">
            {/* Header */}
            <div className="h-14 border-b border-border-color flex items-center justify-between px-6 bg-bg-secondary/30 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium hover:bg-accent-primary/80 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        返回对话
                    </button>
                    <h2 className="text-lg font-semibold text-text-primary">系统设置</h2>
                </div>
            </div>

            <div className="p-8 max-w-3xl mx-auto animate-fade-in">

                {/* Section: Database Connection */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex-center text-accent-primary">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">数据库配置</h3>
                            <p className="text-xs text-text-tertiary">配置您的主要数据源连接信息</p>
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-6 space-y-5 bg-bg-secondary/20">

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                    <Server size={12} /> 主机地址 (Host)
                                </label>
                                <input
                                    type="text"
                                    name="host"
                                    value={dbConfig.host}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-border-color rounded-lg px-3 py-2 text-sm text-black focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all placeholder:text-gray-400"
                                    placeholder="e.g. 127.0.0.1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                    <Activity size={12} /> 端口 (Port)
                                </label>
                                <input
                                    type="text"
                                    name="port"
                                    value={dbConfig.port}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-border-color rounded-lg px-3 py-2 text-sm text-black focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all placeholder:text-gray-400"
                                    placeholder="3306"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                    <User size={12} /> 用户名 (User)
                                </label>
                                <input
                                    type="text"
                                    name="user"
                                    value={dbConfig.user}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-border-color rounded-lg px-3 py-2 text-sm text-black focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all placeholder:text-gray-400"
                                    placeholder="root"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                    <Key size={12} /> 密码 (Password)
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={dbConfig.password}
                                    onChange={handleChange}
                                    className="w-full bg-white border border-border-color rounded-lg px-3 py-2 text-sm text-black focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all placeholder:text-gray-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                <Database size={12} /> 数据库名 (Database Name)
                            </label>
                            <input
                                type="text"
                                name="database"
                                value={dbConfig.database}
                                onChange={handleChange}
                                className="w-full bg-white border border-border-color rounded-lg px-3 py-2 text-sm text-black focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition-all placeholder:text-gray-400"
                                placeholder="my_database"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex items-center justify-between border-t border-border-color/50">
                            <div className="flex items-center gap-2">
                                {status === 'success' && (
                                    <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-md animate-fade-in">
                                        <CheckCircle size={12} /> 连接成功
                                    </span>
                                )}
                                {status === 'error' && (
                                    <span className="flex items-center gap-1.5 text-xs text-error bg-error/10 px-2 py-1 rounded-md animate-fade-in">
                                        <AlertCircle size={12} /> 连接失败
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={status === 'testing'}
                                    className="px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                                >
                                    {status === 'testing' ? '测试中...' : '测试连接'}
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 transition-all shadow-lg hover:shadow-accent-primary/20 hover:-translate-y-0.5"
                                >
                                    <Save size={14} />
                                    保存配置
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Other Sections Placeholder */}
                <div className="opacity-50 pointer-events-none filter blur-[1px]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex-center text-text-secondary">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">高级选项 (即将推出)</h3>
                            <p className="text-xs text-text-tertiary">自定义模型参数与代理行为</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

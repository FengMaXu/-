import React, { useState } from 'react';
import { Save, Database, Server, Key, User, Activity, CheckCircle, AlertCircle, ArrowLeft, Loader2, Link2, ShieldCheck } from 'lucide-react';
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
                // Success feedback
                setStatus('success');
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
        <div className="flex-1 h-full bg-[#fcfcfc] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="h-16 border-b border-border-color flex items-center justify-between px-8 bg-white/50 backdrop-blur-xl sticky top-0 z-10 transition-all">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-xl hover:bg-bg-secondary text-text-secondary transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-lg font-bold text-text-primary tracking-tight">系统设置</h2>
                </div>
            </div>

            <div className="p-10 max-w-4xl mx-auto animate-fade-in">
                {/* Introduction */}
                <div className="mb-10">
                    <h3 className="text-3xl font-bold text-text-primary mb-3">连接您的数据</h3>
                    <p className="text-text-tertiary text-sm leading-relaxed max-w-lg">
                        配置您的 MySQL 数据库连接。DatabaseAgent 将通过该配置来读取表架构并执行您的自然语言查询。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Panel: Form */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Section: Database Connection */}
                        <div className="bg-white border border-border-color rounded-3xl p-8 shadow-xl shadow-black/[0.02] ring-1 ring-black/[0.02]">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                                    <Database size={22} />
                                </div>
                                <h4 className="text-sm font-bold text-text-primary uppercase tracking-widest">核心数据库配置</h4>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Input
                                        label="主机地址"
                                        name="host"
                                        value={dbConfig.host}
                                        onChange={handleChange}
                                        icon={Server}
                                        placeholder="127.0.0.1"
                                    />
                                    <Input
                                        label="端口"
                                        name="port"
                                        value={dbConfig.port}
                                        onChange={handleChange}
                                        icon={Activity}
                                        placeholder="3306"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Input
                                        label="用户名"
                                        name="user"
                                        value={dbConfig.user}
                                        onChange={handleChange}
                                        icon={User}
                                        placeholder="root"
                                    />
                                    <Input
                                        label="密码"
                                        name="password"
                                        type="password"
                                        value={dbConfig.password}
                                        onChange={handleChange}
                                        icon={Key}
                                        placeholder="••••••••"
                                    />
                                </div>

                                <Input
                                    label="数据库名称"
                                    name="database"
                                    value={dbConfig.database}
                                    onChange={handleChange}
                                    icon={Link2}
                                    placeholder="my_database"
                                />
                            </div>

                            <div className="mt-10 pt-8 border-t border-border-color flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {status === 'success' && (
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-success bg-success/10 px-3 py-1.5 rounded-full animate-fade-in ring-1 ring-success/20">
                                            <CheckCircle size={14} /> 连接就绪
                                        </div>
                                    )}
                                    {status === 'error' && (
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-error bg-error/10 px-3 py-1.5 rounded-full animate-fade-in ring-1 ring-error/20">
                                            <AlertCircle size={14} /> {errorMsg || '连接失败'}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleTestConnection}
                                        disabled={status === 'testing'}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-secondary transition-all disabled:opacity-50"
                                    >
                                        {status === 'testing' ? (
                                            <div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 测试中</div>
                                        ) : '测试连接'}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-accent-primary text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={16} />}
                                        保存更改
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Info & Guides */}
                    <div className="space-y-6">
                        <div className="bg-accent-secondary/5 border border-accent-secondary/10 rounded-3xl p-6">
                            <ShieldCheck className="text-accent-secondary mb-4" size={28} />
                            <h5 className="text-sm font-bold text-text-primary mb-2">数据安全保障</h5>
                            <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                                您的连接信息仅保存在本地 `config.toml` 中，绝不会上传至任何云端服务器。
                            </p>
                        </div>

                        <div className="bg-white border border-border-color rounded-3xl p-6 shadow-sm">
                            <Activity className="text-text-tertiary mb-4" size={24} />
                            <h5 className="text-sm font-bold text-text-primary mb-2">连接建议</h5>
                            <ul className="text-[10px] text-text-tertiary space-y-2 font-medium">
                                <li>• 尽量使用只读权限的数据库账号</li>
                                <li>• 如果是本地连接，地址请填写 127.0.0.1</li>
                                <li>• 确保防火墙已放行对应端口</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Input({ label, icon: Icon, value, onChange, name, placeholder, type = "text" }) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider ml-1 flex items-center gap-2">
                {Icon && <Icon size={12} />} {label}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                autoComplete="off"
                className="w-full bg-white border border-border-color rounded-2xl px-4 py-3 text-sm text-text-primary focus:border-accent-secondary focus:ring-4 focus:ring-accent-secondary/5 outline-none transition-all placeholder:text-text-tertiary shadow-sm"
                placeholder={placeholder}
            />
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import {
    Save, Database, Server, Key, User, Activity, CheckCircle,
    AlertCircle, ArrowLeft, Loader2, Link2, ShieldCheck,
    Cpu, Globe, Eye, EyeOff, ExternalLink, Plus, Trash2, X
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';

export default function SettingsView({ onBack, onConfigSaved }) {
    const [activeMainTab, setActiveMainTab] = useState('database'); // database, model

    // Database State
    const [dbConfig, setDbConfig] = useState({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: ''
    });

    // LLM State
    const [llmConfigs, setLlmConfigs] = useState({
        llm: {},
        providers: {}
    });
    const [activeProviderId, setActiveProviderId] = useState('openrouter');
    const [isDefault, setIsDefault] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const [status, setStatus] = useState('idle'); // idle, testing, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        if (activeMainTab === 'model' && llmConfigs.providers[activeProviderId] && isDirty) {
            const timer = setTimeout(() => {
                handleSaveLlm();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [llmConfigs.providers, isDefault, activeProviderId, activeMainTab, isDirty]);

    const fetchConfigs = async () => {
        try {
            const llmRes = await axios.get('/api/v1/llm/config');
            if (llmRes.data.success) {
                setLlmConfigs(llmRes.data.config);
                const providers = Object.keys(llmRes.data.config.providers);
                if (providers.length > 0 && !providers.includes(activeProviderId)) {
                    setActiveProviderId(providers[0]);
                }

                // Check if current provider is the default one
                const currentDefault = llmRes.data.config.llm;
                const activeId = activeProviderId;
                if (currentDefault && (currentDefault.api_type === activeId || currentDefault.base_url === llmRes.data.config.providers[activeId]?.base_url)) {
                    setIsDefault(true);
                } else {
                    setIsDefault(false);
                }
            }
        } catch (err) {
            console.error('Failed to fetch configs', err);
        }
    };

    useEffect(() => {
        // Update isDefault when active provider changes
        if (llmConfigs.llm && llmConfigs.providers[activeProviderId]) {
            const currentDefault = llmConfigs.llm;
            const activeId = activeProviderId;
            const activeProv = llmConfigs.providers[activeId];
            if (currentDefault && (currentDefault.api_type === activeId || currentDefault.base_url === activeProv?.base_url)) {
                setIsDefault(true);
            } else {
                setIsDefault(false);
            }
        }
    }, [activeProviderId, llmConfigs]);

    const handleDbChange = (e) => {
        const value = e.target.name === 'port' ? parseInt(e.target.value) || 3306 : e.target.value;
        setDbConfig({ ...dbConfig, [e.target.name]: value });
    };

    const handleLlmChange = (field, value) => {
        const updatedProviders = { ...llmConfigs.providers };
        if (!updatedProviders[activeProviderId]) {
            updatedProviders[activeProviderId] = {};
        }
        updatedProviders[activeProviderId][field] = value;
        setLlmConfigs({ ...llmConfigs, providers: updatedProviders });
        setIsDirty(true);
    };

    const handleAddModel = () => {
        setIsAddingModel(true);
    };

    const submitNewModel = () => {
        if (newModelName.trim()) {
            const currentModels = llmConfigs.providers[activeProviderId]?.models || [];
            if (!currentModels.includes(newModelName.trim())) {
                handleLlmChange('models', [...currentModels, newModelName.trim()]);
            }
            setNewModelName('');
            setIsAddingModel(false);
        }
    };

    const handleRemoveModel = (modelToRemove) => {
        const currentModels = llmConfigs.providers[activeProviderId]?.models || [];
        handleLlmChange('models', currentModels.filter(m => m !== modelToRemove));
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

    const handleSaveDb = async () => {
        setSaving(true);
        try {
            const response = await axios.post('/api/v1/config', dbConfig);
            if (response.data.success) {
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

    const handleSaveLlm = async () => {
        setSaving(true);
        try {
            const currentProv = llmConfigs.providers[activeProviderId] || {};

            // Following the redesign framework: { agentProvider, agentConfig, defaultModel }
            const syncData = {
                agentProvider: activeProviderId,
                agentConfig: {
                    apiKey: currentProv.api_key,
                    baseUrl: currentProv.base_url,
                    model: currentProv.model || (currentProv.models && currentProv.models[0]) || '',
                    apiType: activeProviderId,
                    temperature: 1.0,
                    maxTokens: 4096
                },
                defaultModel: isDefault ? (currentProv.model || (currentProv.models && currentProv.models[0])) : null
            };

            const response = await axios.post('/api/v1/providers/settings/sync', syncData);

            if (response.data.success) {
                // Background sync success, no alert needed
                setIsDirty(false);
            } else {
                console.error('同步失败: ' + (response.data.error || '未知错误'));
            }
        } catch (err) {
            console.error('同步请求失败: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const providers = [
        { id: 'openrouter', name: 'OpenRouter', icon: 'O' },
        { id: 'google', name: 'Google', icon: 'G' },
        { id: 'gemini', name: 'Gemini', icon: 'Z' },
        { id: 'glm-4.7', name: 'GLM-4.7', icon: 'M' },
        { id: 'ollama', name: 'Ollama', icon: 'O' },
    ];

    const currentLlmConfig = llmConfigs.providers[activeProviderId] || {
        api_key: '',
        base_url: '',
        model: '',
        models: []
    };

    return (
        <div className="flex-1 h-full bg-[#fcfcfc] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-border-color flex items-center justify-between px-8 bg-white/50 backdrop-blur-xl sticky top-0 z-10">
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

            <div className="flex-1 flex overflow-hidden">
                {/* Main Tabs Sidebar */}
                <div className="w-64 border-r border-border-color bg-white flex flex-col p-4 gap-2">
                    <button
                        onClick={() => setActiveMainTab('database')}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                            activeMainTab === 'database' ? "bg-accent-primary/5 text-accent-primary" : "text-text-tertiary hover:bg-bg-secondary"
                        )}
                    >
                        <Database size={18} />
                        数据库设置
                    </button>
                    <button
                        onClick={() => setActiveMainTab('model')}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                            activeMainTab === 'model' ? "bg-accent-primary/5 text-accent-primary" : "text-text-tertiary hover:bg-bg-secondary"
                        )}
                    >
                        <Cpu size={18} />
                        模型设置
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeMainTab === 'database' ? (
                        <div className="max-w-3xl mx-auto animate-fade-in">
                            <div className="mb-10">
                                <h3 className="text-3xl font-bold text-text-primary mb-3">连接您的数据</h3>
                                <p className="text-text-tertiary text-sm leading-relaxed max-w-lg">
                                    配置您的 MySQL 数据库连接。DatabaseAgent 将通过该配置来读取表架构并执行您的自然语言查询。
                                </p>
                            </div>

                            <div className="bg-white border border-border-color rounded-3xl p-8 shadow-xl shadow-black/[0.02]">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <Input
                                            label="主机地址"
                                            name="host"
                                            value={dbConfig.host}
                                            onChange={handleDbChange}
                                            icon={Server}
                                            placeholder="127.0.0.1"
                                        />
                                        <Input
                                            label="端口"
                                            name="port"
                                            value={dbConfig.port}
                                            onChange={handleDbChange}
                                            icon={Activity}
                                            placeholder="3306"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <Input
                                            label="用户名"
                                            name="user"
                                            value={dbConfig.user}
                                            onChange={handleDbChange}
                                            icon={User}
                                            placeholder="root"
                                        />
                                        <Input
                                            label="密码"
                                            name="password"
                                            type="password"
                                            value={dbConfig.password}
                                            onChange={handleDbChange}
                                            icon={Key}
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <Input
                                        label="数据库名称"
                                        name="database"
                                        value={dbConfig.database}
                                        onChange={handleDbChange}
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
                                            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-black border border-black/10 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {status === 'testing' ? (
                                                <div className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 测试中</div>
                                            ) : '测试连接'}
                                        </button>
                                        <button
                                            onClick={handleSaveDb}
                                            disabled={saving}
                                            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black border border-black/10 hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                                            保存数据库配置
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex gap-6 animate-fade-in">
                            {/* Model Provider Sub-sidebar */}
                            <div className="w-44 flex-shrink-0 flex flex-col gap-1">
                                <h4 className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest px-4 mb-4">供应商</h4>
                                {providers.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveProviderId(p.id)}
                                        className={clsx(
                                            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                                            activeProviderId === p.id
                                                ? "bg-bg-secondary text-text-primary shadow-sm ring-1 ring-black/[0.03]"
                                                : "text-text-tertiary hover:bg-bg-secondary/50"
                                        )}
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-bg-tertiary flex items-center justify-center text-[10px] font-bold">
                                            {p.icon}
                                        </div>
                                        {p.name}
                                    </button>
                                ))}
                            </div>

                            {/* Provider Config Form */}
                            <div className="flex-1 max-w-[460px] bg-white border border-border-color rounded-3xl p-8 shadow-xl shadow-black/[0.02]">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-bold text-text-primary font-serif">{activeProviderId.charAt(0).toUpperCase() + activeProviderId.slice(1)}</h3>
                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <span className={`text-[11px] font-bold ${isDefault ? 'text-accent-primary' : 'text-text-tertiary'} uppercase transition-colors whitespace-nowrap`}>
                                            {isDefault ? '当前默认' : '启用并设为默认'}
                                        </span>
                                        <div
                                            onClick={() => {
                                                setIsDefault(!isDefault);
                                                setIsDirty(true);
                                            }}
                                            className="w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 relative border border-black/10 bg-white shadow-inner"
                                        >
                                            <div className={clsx(
                                                "w-4 h-4 bg-black rounded-full transition-all duration-300 transform shadow-sm",
                                                isDefault ? "translate-x-6" : "translate-x-0"
                                            )} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* API Key */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-text-secondary">API 密钥</label>
                                            <a href="#" className="text-[11px] text-accent-primary hover:underline flex items-center gap-1">
                                                获取 API 密钥 <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                value={currentLlmConfig.api_key || ''}
                                                onChange={(e) => handleLlmChange('api_key', e.target.value)}
                                                className="w-full bg-bg-secondary border-none rounded-2xl px-5 py-3.5 text-sm text-text-primary focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all placeholder:text-text-tertiary"
                                                placeholder="输入您的 API 密钥"
                                            />
                                            <button
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                            >
                                                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Base URL */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-text-secondary">API Base URL</label>
                                        <input
                                            type="text"
                                            value={currentLlmConfig.base_url || ''}
                                            onChange={(e) => handleLlmChange('base_url', e.target.value)}
                                            className="w-full bg-bg-secondary border-none rounded-2xl px-5 py-3.5 text-sm text-text-primary focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all placeholder:text-text-tertiary"
                                            placeholder="https://api.openai.com/v1"
                                        />
                                    </div>

                                    {/* Models List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-text-secondary">可用模型</label>
                                            <button
                                                onClick={handleAddModel}
                                                className="text-[11px] font-bold text-accent-primary hover:bg-accent-primary/5 px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                                            >
                                                <Plus size={14} /> 添加模型
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(currentLlmConfig.models || []).map(model => (
                                                <div key={model} className="flex items-center gap-2 bg-success/5 border border-success/10 text-success text-[12px] font-medium px-4 py-2 rounded-xl group transition-all">
                                                    <CheckCircle size={14} />
                                                    {model}
                                                    <button onClick={() => handleRemoveModel(model)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                                        <X size={14} className="text-error" />
                                                    </button>
                                                </div>
                                            ))}
                                            {isAddingModel ? (
                                                <div className="flex items-center gap-2 w-full animate-fade-in group">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={newModelName}
                                                            onChange={(e) => setNewModelName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && submitNewModel()}
                                                            placeholder="输入模型名称，按回车添加"
                                                            className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-primary/20 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => setIsAddingModel(false)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-error transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={submitNewModel}
                                                        className="px-4 py-2 bg-accent-primary/10 text-accent-primary text-xs font-bold rounded-xl hover:bg-accent-primary hover:text-white transition-all shadow-sm"
                                                    >
                                                        添加
                                                    </button>
                                                </div>
                                            ) : (
                                                (!currentLlmConfig.models || currentLlmConfig.models.length === 0) && (
                                                    <p className="text-[11px] text-text-tertiary italic p-2">未配置可用模型</p>
                                                )
                                            )}
                                        </div>
                                    </div>
                                    {/* Auto-sync indicator */}
                                    <div className="pt-4 flex justify-end items-center gap-2 text-text-tertiary">
                                        {saving ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin" />
                                                <span className="text-[10px] font-medium uppercase tracking-wider">正在同步...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={12} className="text-success" />
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-success/70">配置已实时生效</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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


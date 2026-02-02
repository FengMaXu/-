import React from 'react';
import { MessageSquare, Settings, Database, History, HelpCircle, User, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import logo from '../assets/logo.png';

export default function IconRail({ activeView, onNav }) {
    const navItems = [
        { id: 'chat', icon: MessageSquare, label: '对话' },
        { id: 'boards', icon: Database, label: '看板', disabled: true },
        { id: 'history', icon: History, label: '历史', disabled: true },
    ];

    return (
        <div className="w-[68px] bg-[#fdfdfd] border-r border-border-color flex flex-col items-center pt-4 pb-6 gap-8 h-full z-20">
            {/* Logo and Branding */}
            <div className="flex flex-col items-center gap-0 mb-2">
                <div className="w-12 h-12 flex items-center justify-center p-1">
                    <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <span className="text-[14px] text-text-primary font-bold tracking-tight whitespace-nowrap font-serif">
                    your DB
                </span>
            </div>

            {/* Main Nav */}
            <div className="flex flex-col gap-4 flex-1">
                <button
                    onClick={() => onNav('chat')}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group"
                >
                    <Plus size={20} className="text-text-primary group-hover:scale-110 transition-transform" />
                </button>

                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => !item.disabled && onNav(item.id)}
                        className={clsx(
                            "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                            activeView === item.id
                                ? "bg-bg-secondary text-accent-primary"
                                : "text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary",
                            item.disabled && "opacity-40 cursor-not-allowed"
                        )}
                        title={item.label}
                    >
                        <item.icon size={20} />
                        {activeView === item.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-primary rounded-r-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom Nav */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => onNav('settings')}
                    className={clsx(
                        "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group",
                        activeView === 'settings' ? "bg-bg-secondary text-accent-primary" : "text-text-tertiary hover:text-text-secondary"
                    )}
                >
                    <Settings size={20} className="group-hover:rotate-45 transition-transform" />
                </button>

                <div className="w-9 h-9 rounded-full bg-bg-tertiary border border-border-color overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                    <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                        alt="User avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
}

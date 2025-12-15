import React, { useState } from 'react';
import { Bot, MessageSquare, Database, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';

function App() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'settings'
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger sidebar refresh

  const handleSidebarNav = (target) => {
    if (target === 'settings') {
      setActiveView('settings');
    } else {
      setActiveView('chat');
    }
  };

  const handleConfigSaved = () => {
    // Increment refresh key to trigger sidebar table reload
    setRefreshKey(prev => prev + 1);
    setActiveView('chat');
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center p-4">
      {/* Floating Window Container */}
      <div
        className={clsx(
          "glass-panel rounded-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out shadow-2xl",
          isExpanded ? "w-[1000px] h-[700px]" : "w-[60px] h-[60px] rounded-full"
        )}
      >
        {/* Minimized State Trigger */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full h-full flex-center text-accent-primary hover:text-white transition-colors bg-bg-secondary hover:bg-accent-primary/20 rounded-full"
            title="Open Copilot"
          >
            <Bot size={32} />
          </button>
        )}

        {/* Expanded State Content */}
        {isExpanded && (
          <div className="flex h-full text-sm">
            {/* Sidebar (Left) */}
            <Sidebar isOpen={true} onSelectTable={handleSidebarNav} activeView={activeView} refreshKey={refreshKey} />

            {/* Main Content Area (Right) */}
            <div className="flex-1 flex flex-col bg-bg-primary relative overflow-hidden min-w-0">

              {/* Header/Toolbar for Collapse */}
              <div className="absolute top-4 right-4 z-50 flex gap-2">
                {activeView !== 'chat' && (
                  <button
                    onClick={() => setActiveView('chat')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium hover:bg-accent-primary/80 transition-colors shadow-lg"
                    title="返回对话"
                  >
                    <MessageSquare size={14} />
                    返回对话
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="btn-icon bg-bg-tertiary/50 hover:bg-error/20 hover:text-error p-1.5 rounded-full"
                  title="最小化"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              {activeView === 'chat' ? <ChatInterface /> : <SettingsView onBack={() => setActiveView('chat')} onConfigSaved={handleConfigSaved} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

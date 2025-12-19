import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import IconRail from './components/IconRail';

function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'settings' | 'history' | 'boards'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSidebarNav = (target) => {
    setActiveView(target);
  };

  const handleConfigSaved = () => {
    setRefreshKey(prev => prev + 1);
    setActiveView('chat');
  };

  return (
    <div className="flex h-screen w-screen bg-bg-primary overflow-hidden font-sans text-text-primary selection:bg-accent-secondary/20">

      {/* 1. Icon Rail (Leftmost) */}
      <IconRail activeView={activeView} onNav={handleSidebarNav} />

      {/* 2. Navigation Sidebar (Middle-Left) */}
      <Sidebar
        onSelectTable={handleSidebarNav}
        activeView={activeView}
        refreshKey={refreshKey}
      />

      {/* 3. Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.05)] z-10">
        {activeView === 'chat' || activeView === 'history' || activeView === 'boards' ? (
          <ChatInterface />
        ) : activeView === 'settings' ? (
          <SettingsView
            onBack={() => setActiveView('chat')}
            onConfigSaved={handleConfigSaved}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-tertiary">
            选择一个功能继续
          </div>
        )}
      </main>

      {/* 4. Details Panel (Rightmost - Optional, can be toggled inside ChatInterface) */}
    </div>
  );
}

export default App;

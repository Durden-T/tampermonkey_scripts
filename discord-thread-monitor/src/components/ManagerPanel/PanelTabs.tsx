import { type getTexts } from '../../i18n';

type TabType = 'changes' | 'monitoring' | 'blacklist' | 'debug';

interface PanelTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  changesLength: number;
  t: ReturnType<typeof getTexts>;
}

export const PanelTabs: React.FC<PanelTabsProps> = ({
  activeTab,
  setActiveTab,
  changesLength,
  t,
}) => {
  const tabs: Array<{ key: TabType; label: string; showBadge?: boolean }> = [
    { key: 'changes', label: t.tabs.changes, showBadge: true },
    { key: 'monitoring', label: t.tabs.monitoring },
    { key: 'blacklist', label: t.tabs.blacklist },
    { key: 'debug', label: t.tabs.debug },
  ];

  return (
    <div className="panel-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
          {tab.showBadge && changesLength > 0 && <span className="tab-badge">{changesLength}</span>}
        </button>
      ))}
    </div>
  );
};

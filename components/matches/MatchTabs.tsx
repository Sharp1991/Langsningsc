"use client";

import { useState } from "react";

type Tab = {
  id: string;
  label: string;
};

type MatchTabsProps = {
  tabs: Tab[];
  children: Record<string, React.ReactNode>;
};

export default function MatchTabs({
  tabs,
  children,
}: MatchTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* TABS */}
      <div className="border-b border-[#1c1817]/10 bg-white">
        <div className="mx-auto flex max-w-3xl overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mono whitespace-nowrap border-b-2 px-5 py-4 text-[10px] uppercase tracking-[0.15em] transition ${
                activeTab === tab.id
                  ? "border-[#c8102e] text-[#c8102e]"
                  : "border-transparent text-[#83766c] hover:text-[#1c1817]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div>
        {tabs.map((tab) =>
          activeTab === tab.id ? (
            <div key={tab.id}>{children[tab.id]}</div>
          ) : null
        )}
      </div>
    </div>
  );
}

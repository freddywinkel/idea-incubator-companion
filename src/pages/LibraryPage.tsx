import React, { useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import { BusinessList } from '../components/BusinessList';
import { ActivityList } from '../components/ActivityList';
import { Briefcase, Sparkles } from 'lucide-react';

type Tab = 'business' | 'activities';

export const LibraryPage: React.FC = () => {
  const { loading } = useAppData();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('business');

  return (
    <div className="page-container">
      <h1 className="section-title" style={{ marginBottom: 4 }}>
        Library
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 20,
          fontSize: '0.9375rem',
        }}
      >
        Browse, search, and manage your captured ideas.
      </p>

      <div className="tabs" role="tablist" aria-label="Library tabs">
        <button
          className={`tab ${activeTab === 'business' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'business'}
          onClick={() => setActiveTab('business')}
          aria-label="Business Inbox tab"
        >
          <Briefcase
            size={16}
            style={{ marginRight: 6, verticalAlign: 'text-bottom' }}
            aria-hidden="true"
          />
          Business Inbox
        </button>
        <button
          className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'activities'}
          onClick={() => setActiveTab('activities')}
          aria-label="My Activities tab"
        >
          <Sparkles
            size={16}
            style={{ marginRight: 6, verticalAlign: 'text-bottom' }}
            aria-hidden="true"
          />
          My Activities
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading your library...</p>
        </div>
      ) : (
        <>
          {activeTab === 'business' && <BusinessList showToast={showToast} />}
          {activeTab === 'activities' && <ActivityList showToast={showToast} />}
        </>
      )}
    </div>
  );
};

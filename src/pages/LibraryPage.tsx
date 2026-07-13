import React, { useRef, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import { BusinessList } from '../components/BusinessList';
import { ActivityList } from '../components/ActivityList';
import { WishlistList } from '../components/WishlistList';
import { Briefcase, ShoppingBag, Sparkles } from 'lucide-react';

type Tab = 'business' | 'activities' | 'wishlist';

const TAB_ORDER: Tab[] = ['business', 'activities', 'wishlist'];

export const LibraryPage: React.FC = () => {
  const { loading } = useAppData();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('business');
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    business: null,
    activities: null,
    wishlist: null,
  });

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = TAB_ORDER.indexOf(activeTab);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = TAB_ORDER.length - 1;

    const nextTab = TAB_ORDER[nextIndex];
    setActiveTab(nextTab);
    window.requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 4 }}>
        Library
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 20,
          fontSize: '0.9375rem',
        }}
      >
        Browse, search, and manage your ideas, activities, and wishlist.
      </p>

      <div className="tabs" role="tablist" aria-label="Library tabs">
        <button
          id="library-tab-business"
          ref={(element) => {
            tabRefs.current.business = element;
          }}
          className={`tab ${activeTab === 'business' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'business'}
          aria-controls="library-panel-business"
          tabIndex={activeTab === 'business' ? 0 : -1}
          onClick={() => setActiveTab('business')}
          onKeyDown={handleTabKeyDown}
          aria-label="Business Inbox tab"
        >
          <Briefcase size={16} aria-hidden="true" />
          Business
        </button>
        <button
          id="library-tab-activities"
          ref={(element) => {
            tabRefs.current.activities = element;
          }}
          className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'activities'}
          aria-controls="library-panel-activities"
          tabIndex={activeTab === 'activities' ? 0 : -1}
          onClick={() => setActiveTab('activities')}
          onKeyDown={handleTabKeyDown}
          aria-label="My Activities tab"
        >
          <Sparkles size={16} aria-hidden="true" />
          Activities
        </button>
        <button
          id="library-tab-wishlist"
          ref={(element) => {
            tabRefs.current.wishlist = element;
          }}
          className={`tab ${activeTab === 'wishlist' ? 'active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'wishlist'}
          aria-controls="library-panel-wishlist"
          tabIndex={activeTab === 'wishlist' ? 0 : -1}
          onClick={() => setActiveTab('wishlist')}
          onKeyDown={handleTabKeyDown}
          aria-label="Wishlist tab"
        >
          <ShoppingBag size={16} aria-hidden="true" />
          Wishlist
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading your library...</p>
        </div>
      ) : (
        <>
          {activeTab === 'business' && (
            <div id="library-panel-business" role="tabpanel" aria-labelledby="library-tab-business">
              <BusinessList showToast={showToast} />
            </div>
          )}
          {activeTab === 'activities' && (
            <div id="library-panel-activities" role="tabpanel" aria-labelledby="library-tab-activities">
              <ActivityList showToast={showToast} />
            </div>
          )}
          {activeTab === 'wishlist' && (
            <div id="library-panel-wishlist" role="tabpanel" aria-labelledby="library-tab-wishlist">
              <WishlistList showToast={showToast} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

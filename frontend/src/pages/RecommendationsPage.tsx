import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, History, Users, RefreshCw } from 'lucide-react';
import { recommendationsApi } from '../api';
import { Recommendation } from '../types';
import BookCard from '../components/BookCard';

type Tab = 'all' | 'trending' | 'for-you' | 'social';

const TABS: { value: Tab; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { value: 'all', label: 'All', icon: Sparkles, color: 'text-purple-600', description: 'Curated picks from all sources' },
  { value: 'trending', label: 'Trending', icon: TrendingUp, color: 'text-green-600', description: 'What everyone is reading right now' },
  { value: 'for-you', label: 'For You', icon: History, color: 'text-blue-600', description: 'Based on your reading history' },
  { value: 'social', label: 'Social', icon: Users, color: 'text-orange-600', description: 'Loved by the reading community' },
];

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [allRecs, setAllRecs] = useState<{
    trending: Recommendation[];
    history: Recommendation[];
    social: Recommendation[];
  } | null>(null);
  const [tabRecs, setTabRecs] = useState<Recommendation[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await recommendationsApi.getAll();
      setAllRecs(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadTab = async (tab: Tab) => {
    setLoading(true);
    try {
      let res;
      if (tab === 'trending') res = await recommendationsApi.getTrending(16);
      else if (tab === 'for-you') res = await recommendationsApi.getForYou(16);
      else if (tab === 'social') res = await recommendationsApi.getSocial(16);
      if (res) setTabRecs(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'all') {
      if (!allRecs) loadAll();
    } else {
      loadTab(activeTab);
    }
  }, [activeTab]);

  const handleRefresh = () => {
    if (activeTab === 'all') loadAll();
    else loadTab(activeTab);
  };

  const currentTab = TABS.find(t => t.value === activeTab)!;

  const allDisplay: Recommendation[] = activeTab === 'all' && allRecs
    ? [...allRecs.history, ...allRecs.trending, ...allRecs.social]
        .filter((r, i, arr) => arr.findIndex(x => x.book.id === r.book.id) === i)
        .slice(0, 18)
    : tabRecs;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={24} className="text-purple-600" />
            Discover Books
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Personalized recommendations just for you</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <Icon size={15} className={activeTab === tab.value ? 'text-white' : tab.color} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <currentTab.icon size={15} className={currentTab.color} />
        {currentTab.description}
      </div>

      {/* All tab: section layout */}
      {activeTab === 'all' && allRecs ? (
        <div className="space-y-8">
          <RecommendationSection
            title="For You"
            icon={History}
            iconColor="text-blue-600"
            recs={allRecs.history}
            addedIds={addedIds}
            onAdded={id => setAddedIds(prev => new Set([...prev, id]))}
          />
          <RecommendationSection
            title="Trending Now"
            icon={TrendingUp}
            iconColor="text-green-600"
            recs={allRecs.trending}
            addedIds={addedIds}
            onAdded={id => setAddedIds(prev => new Set([...prev, id]))}
          />
          <RecommendationSection
            title="Community Favorites"
            icon={Users}
            iconColor="text-orange-600"
            recs={allRecs.social}
            addedIds={addedIds}
            onAdded={id => setAddedIds(prev => new Set([...prev, id]))}
          />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : activeTab !== 'all' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allDisplay.map(rec => (
            <BookCard
              key={rec.book.id}
              book={rec.book}
              recommendation={{ reason: rec.reason }}
              onAddToLibrary={id => setAddedIds(prev => new Set([...prev, id]))}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Sparkles size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">Loading recommendations...</p>
        </div>
      )}
    </div>
  );
}

function RecommendationSection({
  title,
  icon: Icon,
  iconColor,
  recs,
  addedIds,
  onAdded,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  recs: Recommendation[];
  addedIds: Set<number>;
  onAdded: (id: number) => void;
}) {
  if (recs.length === 0) return null;

  return (
    <div>
      <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Icon size={18} className={iconColor} />
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recs.map(rec => (
          <BookCard
            key={rec.book.id}
            book={rec.book}
            recommendation={{ reason: rec.reason }}
            onAddToLibrary={onAdded}
          />
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiService } from './services/api';
import { usePolling } from './hooks/usePolling';
import { PolymarketTab } from './components/PolymarketTab';
import { OpinionTab } from './components/OpinionTab';
import { MatchesTab } from './components/MatchesTab';
import { ArbitrageTab } from './components/ArbitrageTab';
import type { NormalizedMarket, MarketMatch, ArbitrageOpportunity } from './types';

type Tab = 'polymarket' | 'opinion' | 'matches' | 'arbitrage';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('arbitrage');
  const [polymarketMarkets, setPolymarketMarkets] = useState<NormalizedMarket[]>([]);
  const [opinionMarkets, setOpinionMarkets] = useState<NormalizedMarket[]>([]);
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchData = async () => {
    try {
      setError('');
      const [polyData, opinionData, matchData, arbData] = await Promise.all([
        apiService.getPolymarketMarkets(),
        apiService.getOpinionMarkets(),
        apiService.getMatches(),
        apiService.getArbitrageOpportunities()
      ]);

      setPolymarketMarkets(polyData.markets);
      setOpinionMarkets(opinionData.markets);
      setMatches(matchData.matches);
      setOpportunities(arbData.opportunities);
      setLastUpdate(arbData.lastUpdate);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data. Server may not be running.');
      setLoading(false);
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  usePolling(fetchData, 30000);

  const tabs: { id: Tab; label: string; count: number; color: string }[] = [
    { id: 'polymarket', label: 'Polymarket', count: polymarketMarkets.length, color: 'blue' },
    { id: 'opinion', label: 'Opinion', count: opinionMarkets.length, color: 'green' },
    { id: 'matches', label: 'Matched Events', count: matches.length, color: 'purple' },
    { id: 'arbitrage', label: 'Arbitrage', count: opportunities.length, color: 'red' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Polyscan - Arbitrage Scanner</h1>
          <p className="text-blue-100 mt-2">Polymarket vs Opinion Prediction Markets</p>
          {lastUpdate && (
            <p className="text-sm text-blue-200 mt-2">
              Last updated: {new Date(lastUpdate).toLocaleString()}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="container mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? `border-${tab.color}-500 text-${tab.color}-600`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{
                    borderBottomColor: activeTab === tab.id ? getColor(tab.color) : undefined
                  }}
                >
                  {tab.label}
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'polymarket' && (
              <PolymarketTab markets={polymarketMarkets} loading={loading} />
            )}
            {activeTab === 'opinion' && (
              <OpinionTab markets={opinionMarkets} loading={loading} />
            )}
            {activeTab === 'matches' && (
              <MatchesTab matches={matches} loading={loading} />
            )}
            {activeTab === 'arbitrage' && (
              <ArbitrageTab opportunities={opportunities} loading={loading} />
            )}
          </div>
        </div>
      </div>

      <footer className="bg-gray-800 text-white mt-12 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Polyscan - Real-time arbitrage detection between Polymarket and Opinion
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Data updates every 30 seconds
          </p>
        </div>
      </footer>
    </div>
  );
}

function getColor(color: string): string {
  const colors: Record<string, string> = {
    blue: '#2563eb',
    green: '#16a34a',
    purple: '#9333ea',
    red: '#dc2626'
  };
  return colors[color] || '#6b7280';
}

export default App;

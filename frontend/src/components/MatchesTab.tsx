import { MarketMatch } from '../types';

interface Props {
  matches: MarketMatch[];
  loading: boolean;
}

export function MatchesTab({ matches, loading }: Props) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-purple-600 text-white">
          <tr>
            <th className="px-4 py-2 text-left">Event</th>
            <th className="px-4 py-2 text-center">Similarity</th>
            <th className="px-4 py-2 text-center">Confidence</th>
            <th className="px-4 py-2 text-left">Polymarket Prices</th>
            <th className="px-4 py-2 text-left">Opinion Prices</th>
            <th className="px-4 py-2 text-right">Price Diff</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 max-w-md">
                <div className="font-medium">{match.polymarketMarket.title}</div>
                <div className="text-sm text-gray-600 mt-1">{match.opinionMarket.title}</div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="font-mono text-sm">{(match.similarity * 100).toFixed(1)}%</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 rounded text-sm ${
                  match.confidence === 'high' ? 'bg-green-100 text-green-800' :
                  match.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {match.confidence}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {match.outcomeMatches.map((om, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-green-600">YES ${om.polymarketOutcome.yesAsk?.toFixed(2)}</span>
                      {' / '}
                      <span className="text-red-600">NO ${om.polymarketOutcome.noAsk?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {match.outcomeMatches.map((om, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-green-600">YES ${om.opinionOutcome.yesAsk?.toFixed(2)}</span>
                      {' / '}
                      <span className="text-red-600">NO ${om.opinionOutcome.noAsk?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="space-y-1">
                  {match.outcomeMatches.map((om, i) => {
                    const yesDiff = (om.polymarketOutcome.yesAsk || 0) - (om.opinionOutcome.yesAsk || 0);
                    return (
                      <div key={i} className="text-sm font-mono">
                        {yesDiff > 0 ? '+' : ''}{yesDiff.toFixed(2)}
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

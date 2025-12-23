import { NormalizedMarket } from '../types';

interface Props {
  markets: NormalizedMarket[];
  loading: boolean;
}

export function OpinionTab({ markets, loading }: Props) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-green-600 text-white">
          <tr>
            <th className="px-4 py-2 text-left">Event</th>
            <th className="px-4 py-2 text-left">Outcomes</th>
            <th className="px-4 py-2 text-left">Prices</th>
            <th className="px-4 py-2 text-right">Volume</th>
            <th className="px-4 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr key={market.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 max-w-md">{market.title}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {market.outcomes.map((outcome) => (
                    <div key={outcome.id} className="text-sm font-medium">
                      {outcome.name}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {market.outcomes.map((outcome) => (
                    <div key={outcome.id} className="text-sm">
                      <span className="text-green-600">YES ${outcome.yesAsk?.toFixed(2) || 'N/A'}</span>
                      {' / '}
                      <span className="text-red-600">NO ${outcome.noAsk?.toFixed(2) || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">${market.volume.toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-sm ${
                  market.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {market.active ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

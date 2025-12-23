import { NormalizedMarket } from '../types';

interface Props {
  markets: NormalizedMarket[];
  loading: boolean;
}

export function PolymarketTab({ markets, loading }: Props) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-4 py-2 text-left">Event</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-left">Outcomes</th>
            <th className="px-4 py-2 text-right">Volume</th>
            <th className="px-4 py-2 text-right">Liquidity</th>
            <th className="px-4 py-2 text-left">End Date</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr key={market.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 max-w-md">{market.title}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {market.category || 'Other'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {market.outcomes.map((outcome) => (
                    <div key={outcome.id} className="text-sm">
                      <span className="font-medium">{outcome.name}:</span>{' '}
                      <span className="text-green-600">YES {(outcome.yesPrice * 100).toFixed(1)}%</span>
                      {' / '}
                      <span className="text-red-600">NO {(outcome.noPrice * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">${market.volume.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">${market.liquidity?.toLocaleString() || 'N/A'}</td>
              <td className="px-4 py-3">
                {market.endDate ? new Date(market.endDate).toLocaleDateString() : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

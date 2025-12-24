import { ArbitrageOpportunity } from '../types';

interface Props {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
}

export function ArbitrageTab({ opportunities, loading }: Props) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (opportunities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No arbitrage opportunities found at this time.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800">Found {opportunities.length} arbitrage opportunities!</h3>
        <p className="text-sm text-yellow-700 mt-1">
          Sorted by profit percentage (highest first)
        </p>
      </div>

      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-red-600 text-white">
          <tr>
            <th className="px-4 py-2 text-left">Event</th>
            <th className="px-4 py-2 text-left">Strategy</th>
            <th className="px-4 py-2 text-right">Price 1</th>
            <th className="px-4 py-2 text-right">Price 2</th>
            <th className="px-4 py-2 text-right">Total Cost</th>
            <th className="px-4 py-2 text-right">Profit %</th>
            <th className="px-4 py-2 text-right">Max Investment</th>
            <th className="px-4 py-2 text-left">Detected</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 max-w-md">
                <div className="font-medium">{opp.marketMatch.polymarketMarket.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {opp.outcomeMatch.polymarketOutcome.name}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                      {opp.buyPlatform1}
                    </span>
                    <span className={`font-medium ${
                      opp.buyType1 === 'yes' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {opp.buyType1.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                      {opp.buyPlatform2}
                    </span>
                    <span className={`font-medium ${
                      opp.buyType2 === 'yes' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {opp.buyType2.toUpperCase()}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                ${opp.price1 != null ? opp.price1.toFixed(3) : 'N/A'}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                ${opp.price2 != null ? opp.price2.toFixed(3) : 'N/A'}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                <span className={opp.totalCost < 1 ? 'text-green-600 font-bold' : 'text-red-600'}>
                  ${opp.totalCost != null ? opp.totalCost.toFixed(3) : 'N/A'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold">
                  +{opp.profitPercent != null ? opp.profitPercent.toFixed(2) : '0.00'}%
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {opp.maxInvestment != null && opp.maxInvestment !== Infinity
                  ? `$${opp.maxInvestment.toFixed(0)}`
                  : 'Unlimited'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(opp.detectedAt).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h4 className="font-bold mb-2">How to execute arbitrage:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Buy the specified position on Platform 1 at Price 1</li>
          <li>Buy the specified position on Platform 2 at Price 2</li>
          <li>Wait for event resolution</li>
          <li>Collect $1.00 payout (guaranteed)</li>
          <li>Profit = $1.00 - Total Cost</li>
        </ol>
      </div>
    </div>
  );
}

'use client'
import { useState } from 'react';

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!symbol.trim()) {
      alert('请输入交易对');
      return;
    }
    
    setLoading(true);
    setSignal(null);
    
    try {
      const cleanSymbol = symbol.trim().toUpperCase();
      const url = `/api/signal?symbol=${cleanSymbol}&market=crypto`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        alert(data.error || '请求失败');
        setLoading(false);
        return;
      }
      
      setSignal(data);
    } catch (error) {
      alert('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-indigo-900">
          市场晴雨表
        </h1>
        <p className="text-center text-gray-600 mb-8">
          数字货币方向指示器
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <input
            type="text"
            placeholder="输入交易对，如: BTCUSDT"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            className="w-full p-3 border rounded-lg mb-4"
          />
          
          <button
            onClick={handleQuery}
            disabled={loading || !symbol}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {loading ? '分析中...' : '查询'}
          </button>
        </div>

        {signal && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className={`text-center p-8 rounded-lg mb-6 ${
              signal.signal === 'LONG' ? 'bg-green-100' : 
              signal.signal === 'SHORT' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <h2 className="text-3xl font-bold mb-2">
                {signal.signal === 'LONG' ? '做多信号' : 
                 signal.signal === 'SHORT' ? '做空信号' : '中性'}
              </h2>
              <div className="text-xl">
                置信度: {signal.confidence}%
              </div>
            </div>

            {signal.reasons && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">分析依据:</h3>
                {signal.reasons.map((reason, i) => (
                  <div key={i} className="bg-indigo-50 p-2 mb-2 rounded">
                    {reason}
                  </div>
                ))}
              </div>
            )}

            {signal.data && (
              <div>
                <h3 className="font-bold mb-2">数据:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    价格: ${signal.data.currentPrice}
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    涨跌: {signal.data.priceChange}
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    5m: ${signal.data.ema5m}
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    15m: ${signal.data.ema15m}
                  </div>
                  <div className="bg-gray-50 p-2 rounded col-span-2">
                    60m: ${signal.data.ema60m}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
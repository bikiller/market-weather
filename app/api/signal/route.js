PS C:\Users\Administrator\Desktop\market-weather> cat app/api/signal/route.js
'use client'
import { useState } from 'react';

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState('crypto');
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
      const url = `/api/signal?symbol=${encodeURIComponent(symbol.toUpperCase())}&market=${market}`;
      console.log('请求URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('返回数据:', data);

      if (!response.ok || data.error) {
        alert(data.error || '获取数据失败');
        setLoading(false);
        return;
      }

      setSignal(data);
    } catch (error) {
      console.error('请求错误:', error);
      alert('获取数据失败，请重试');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-indigo-900">
          市场晴雨表 🌤️
        </h1>
        <p className="text-center text-gray-600 mb-8">
          数字货币方向指示器（基于 EMA125）
        </p>

        {/* 输入区域 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            输入交易对
          </label>
          <input
            type="text"
            placeholder="例如: BTCUSDT"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
          />

          <button
            onClick={handleQuery}
            disabled={loading || !symbol}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? '⏳ 分析中...' : '🔍 获取信号'}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            <p>💡 提示：输入格式如 BTCUSDT、ETHUSDT、BNBUSDT</p>
          </div>
        </div>

        {/* 结果展示 */}
        {signal && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className={`text-center p-8 rounded-lg mb-6 ${
              signal.signal === 'LONG' ? 'bg-green-100 border-2 border-green-300' :
              signal.signal === 'SHORT' ? 'bg-red-100 border-2 border-red-300' :
              'bg-gray-100 border-2 border-gray-300'
            }`}>
              <div className="text-6xl mb-4">
                {signal.signal === 'LONG' ? '📈' : signal.signal === 'SHORT' ? '📉' : '➡️'}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {signal.signal === 'LONG' ? '🟢 做多信号' :
                 signal.signal === 'SHORT' ? '🔴 做空信号' : '⚪ 中性观望'}
              </h2>
              <div className="text-xl font-semibold mt-2">
                置信度: <span className="text-indigo-600">{signal.confidence}%</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-lg text-gray-800">📊 分析依据:</h3>
              {signal.reasons && signal.reasons.map((reason, i) => (
                <div key={i} className="flex items-start bg-indigo-50 p-3 rounded">
                  <span className="text-indigo-600 mr-2 font-bold">✓</span>
                  <span className="text-gray-700">{reason}</span>
                </div>
              ))}
            </div>

            {signal.data && (
              <div className="pt-6 border-t border-gray-200">
                <h3 className="font-bold mb-3 text-gray-800">📈 实时数据:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">当前价格</div>
                    <div className="font-bold text-lg">${signal.data.currentPrice}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">涨跌幅</div>
                    <div className={`font-bold text-lg ${
                      signal.data.priceChange?.startsWith('+') ? 'text-green-600' :
                      signal.data.priceChange?.startsWith('-') ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {signal.data.priceChange}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">5分钟EMA125</div>
                    <div className="font-bold">${signal.data.ema5m}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500">15分钟EMA125</div>
                    <div className="font-bold">${signal.data.ema15m}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded col-span-2">
                    <div className="text-gray-500">60分钟EMA125</div>
                    <div className="font-bold">${signal.data.ema60m}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部说明 */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>⚠️ 投资有风险，本工具仅供参考</p>
          <p className="mt-2">数据来源：Binance API</p>
        </div>
      </div>
    </div>
  );
}
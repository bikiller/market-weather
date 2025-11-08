'use client';
import { useState } from 'react';

export default function Home() {
  const [symbol, setSymbol] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const queryDirection = async () => {
    if (!symbol.trim()) {
      alert('请输入品种代码！');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/signal?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">市场晴雨表 - 多空方向指示器</h1>
      <div className="w-80 space-y-4">
        <input
          type="text"
          placeholder="输入品种 (e.g., AAPL, BTC-USD, EURUSD=X)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}  // 自动大写
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button 
          onClick={queryDirection} 
          disabled={loading || !symbol.trim()}
          className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
        >
          {loading ? '查询中...' : '查询方向'}
        </button>
        {result && (
          <div className={`p-4 rounded-lg ${result.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {result.error ? (
              <p className="text-center">错误: {result.error}</p>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xl font-bold">方向: {result.direction}</p>
                <p>分数: {result.score}</p>
                <p>当前价: ${result.current_price}</p>
              </div>
            )}
          </div>
        )}
        <p className="text-sm text-gray-500 text-center">支持股票、外汇、加密、期货 (e.g., AAPL, BTC-USD)</p>
      </div>
    </main>
  );
}
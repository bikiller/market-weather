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
      // 直接构建 URL，不使用任何额外参数
      const cleanSymbol = symbol.trim().toUpperCase();
      const url = `/api/signal?symbol=${cleanSymbol}&market=crypto`;
      
      console.log('发送请求:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('收到响应:', data);
      
      if (!response.ok) {
        alert(data.error || '请求失败');
        setLoading(false);
        return;
      }
      
      if (data.error) {
        alert(data.error);
        setLoading(false);
        return;
      }
      
      setSignal(data);
    } catch (error) {
      console.error('错误:', error);
      alert('获取数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-indigo-900">
          市场晴雨表 🌤️
        </h1>
        <p className="text-center text-gray-600 mb-8">
          数字货币多空方向指示器（EMA125）
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            输入交易对
          </label>
          <input
            type="text"
            placeholder="例如: BTCUSDT, ETHUSDT, BNBUSDT"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          <button
            onClick={handleQuery}
            disabled={loading || !symbol}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {loading ? '⏳ 分析中...' : '🔍 查询方向'}
          </button>
          
          <div className="mt-3 text-sm text-gray-500
import { NextResponse } from 'next/server';

// 计算EMA
function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// 获取K线数据 - 使用多个备用源
async function getKlineData(symbol, interval, limit = 200) {
  // 备用API列表
  const apiUrls = [
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  ];
  
  for (const url of apiUrls) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(8000)
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        return data.map(k => ({
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          time: k[0]
        }));
      }
    } catch (error) {
      console.log(`尝试 ${url} 失败，切换下一个...`);
      continue;
    }
  }
  
  throw new Error('所有数据源均不可用');
}

// 计算信号
function calculateSignal(kline5m, kline15m, kline60m) {
  const prices5m = kline5m.map(k => k.close);
  const prices15m = kline15m.map(k => k.close);
  const prices60m = kline60m.map(k => k.close);
  
  const ema5m_125 = calculateEMA(prices5m, 125);
  const ema15m_125 = calculateEMA(prices15m, 125);
  const ema60m_125 = calculateEMA(prices60m, 125);
  
  const currentPrice = kline5m[kline5m.length - 1].close;
  const openPrice = kline5m[kline5m.length - 1].open;
  const priceChange = ((currentPrice - openPrice) / openPrice) * 100;
  
  let signal = 'NEUTRAL';
  let confidence = 0;
  let reasons = [];
  
  const above5m = currentPrice > ema5m_125;
  const above15m = currentPrice > ema15m_125;
  const above60m = currentPrice > ema60m_125;
  
  if (above5m && above15m && above60m) {
    signal = 'LONG';
    confidence = 70;
    reasons.push('价格位于 5分钟、15分钟、60分钟 EMA125 均线之上');
    
    if (priceChange > 0) {
      confidence += 15;
      reasons.push(`当前K线上涨 ${priceChange.toFixed(2)}%`);
    }
    
    if (ema5m_125 > ema15m_125 && ema15m_125 > ema60m_125) {
      confidence += 15;
      reasons.push('EMA125 呈多头排列');
    }
  } else if (!above5m && !above15m && !above60m) {
    signal = 'SHORT';
    confidence = 70;
    reasons.push('价格位于 5分钟、15分钟、60分钟 EMA125 均线之下');
    
    if (priceChange < 0) {
      confidence += 15;
      reasons.push(`当前K线下跌 ${Math.abs(priceChange).toFixed(2)}%`);
    }
    
    if (ema5m_125 < ema15m_125 && ema15m_125 < ema60m_125) {
      confidence += 15;
      reasons.push('EMA125 呈空头排列');
    }
  } else {
    signal = 'NEUTRAL';
    confidence = 50;
    
    const positions = [];
    if (above5m) positions.push('5分钟上方');
    else positions.push('5分钟下方');
    
    if (above15m) positions.push('15分钟上方');
    else positions.push('15分钟下方');
    
    if (above60m) positions.push('60分钟上方');
    else positions.push('60分钟下方');
    
    reasons.push(`价格分别在 EMA125 的：${positions.join('、')}`);
    reasons.push('多空信号不明确，建议观望');
  }
  
  return {
    signal,
    confidence: Math.min(confidence, 100),
    reasons,
    data: {
      currentPrice: currentPrice.toFixed(2),
      priceChange: (priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%',
      ema5m: ema5m_125.toFixed(2),
      ema15m: ema15m_125.toFixed(2),
      ema60m: ema60m_125.toFixed(2)
    }
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const market = searchParams.get('market');
    
    if (!symbol) {
      return NextResponse.json({ error: '请输入交易对' }, { status: 400 });
    }
    
    if (market !== 'crypto') {
      return NextResponse.json({ 
        error: '暂时只支持数字货币，外汇功能即将上线' 
      }, { status: 400 });
    }
    
    console.log(`正在获取 ${symbol} 的数据...`);
    
    const [kline5m, kline15m, kline60m] = await Promise.all([
      getKlineData(symbol, '5m', 200),
      getKlineData(symbol, '15m', 200),
      getKlineData(symbol, '1h', 200)
    ]);
    
    console.log('数据获取成功！');
    
    const result = calculateSignal(kline5m, kline15m, kline60m);
    
    return NextResponse.json({
      success: true,
      symbol,
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: '获取数据失败：' + error.message 
    }, { status: 500 });
  }
}
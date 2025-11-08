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

// 获取 OKX K线数据
async function getOKXKlines(symbol, interval, limit = 200) {
  // OKX 的交易对格式：BTC-USDT（需要转换）
  const okxSymbol = symbol.replace('USDT', '-USDT');
  
  // OKX 时间周期映射
  const intervalMap = {
    '5m': '5m',
    '15m': '15m',
    '1h': '1H'
  };
  
  const okxInterval = intervalMap[interval];
  const url = `https://www.okx.com/api/v5/market/candles?instId=${okxSymbol}&bar=${okxInterval}&limit=${limit}`;
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.code !== '0') {
      throw new Error('OKX API 返回错误');
    }
    
    // OKX 数据格式: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
    return result.data.reverse().map(k => ({
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      time: parseInt(k[0])
    }));
  } catch (error) {
    console.error('获取 OKX 数据失败:', error);
    throw error;
  }
}

// 计算信号
function calculateSignal(kline5m, kline15m, kline60m) {
  // 提取收盘价
  const prices5m = kline5m.map(k => k.close);
  const prices15m = kline15m.map(k => k.close);
  const prices60m = kline60m.map(k => k.close);
  
  // 计算 EMA125
  const ema5m_125 = calculateEMA(prices5m, 125);
  const ema15m_125 = calculateEMA(prices15m, 125);
  const ema60m_125 = calculateEMA(prices60m, 125);
  
  // 当前价格
  const currentPrice = kline5m[kline5m.length - 1].close;
  const openPrice = kline5m[kline5m.length - 1].open;
  
  // 价格涨跌幅
  const priceChange = ((currentPrice - openPrice) / openPrice) * 100;
  
  // 决策逻辑：基于 EMA125 多空分水岭
  let signal = 'NEUTRAL';
  let confidence = 0;
  let reasons = [];
  
  // 判断价格相对于三个周期 EMA125 的位置
  const above5m = currentPrice > ema5m_125;
  const above15m = currentPrice > ema15m_125;
  const above60m = currentPrice > ema60m_125;
  
  // 规则：价格在所有三个周期的 EMA125 之上 → 做多
  if (above5m && above15m && above60m) {
    signal = 'LONG';
    confidence = 70;
    reasons.push('价格位于 5分钟、15分钟、60分钟 EMA125 均线之上');
    
    // 额外加分项
    if (priceChange > 0) {
      confidence += 15;
      reasons.push(`当前K线上涨 ${priceChange.toFixed(2)}%`);
    }
    
    // 如果 EMA125 呈多头排列（5m > 15m > 60m），再加分
    if (ema5m_125 > ema15m_125 && ema15m_125 > ema60m_125) {
      confidence += 15;
      reasons.push('EMA125 呈多头排列');
    }
  }
  // 规则：价格在所有三个周期的 EMA125 之下 → 做空
  else if (!above5m && !above15m && !above60m) {
    signal = 'SHORT';
    confidence = 70;
    reasons.push('价格位于 5分钟、15分钟、60分钟 EMA125 均线之下');
    
    // 额外加分项
    if (priceChange < 0) {
      confidence += 15;
      reasons.push(`当前K线下跌 ${Math.abs(priceChange).toFixed(2)}%`);
    }
    
    // 如果 EMA125 呈空头排列（5m < 15m < 60m），再加分
    if (ema5m_125 < ema15m_125 && ema15m_125 < ema60m_125) {
      confidence += 15;
      reasons.push('EMA125 呈空头排列');
    }
  }
  // 其他情况 → 中性观望
  else {
    signal = 'NEUTRAL';
    confidence = 50;
    
    // 详细说明哪些周期在上，哪些在下
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
    
    // 目前只支持数字货币
    if (market !== 'crypto') {
      return NextResponse.json({ 
        error: '暂时只支持数字货币，外汇功能即将上线' 
      }, { status: 400 });
    }
    
    // 获取K线数据
    const [kline5m, kline15m, kline60m] = await Promise.all([
      getOKXKlines(symbol, '5m', 200),
      getOKXKlines(symbol, '15m', 200),
      getOKXKlines(symbol, '1h', 200)
    ]);
    
    // 计算信号
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
      error: '获取数据失败，请检查交易对是否正确（如BTCUSDT）或网络连接' 
    }, { status: 500 });
  }
}
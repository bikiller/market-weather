import { NextResponse } from 'next/server';

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

async function getKlineData(symbol, interval, limit) {
  const urls = [
    'https://data-api.binance.vision/api/v3/klines',
    'https://api.binance.us/api/v3/klines',
    'https://api1.binance.com/api/v3/klines'
  ];
  
  for (const baseUrl of urls) {
    try {
      const url = `${baseUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(k => ({
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4])
        }));
      }
    } catch (e) {
      continue;
    }
  }
  throw new Error('No data');
}

function calculateSignal(k5, k15, k60) {
  const p5 = k5.map(x => x.close);
  const p15 = k15.map(x => x.close);
  const p60 = k60.map(x => x.close);
  
  const e5 = calculateEMA(p5, 125);
  const e15 = calculateEMA(p15, 125);
  const e60 = calculateEMA(p60, 125);
  
  const cur = k5[k5.length - 1].close;
  const opn = k5[k5.length - 1].open;
  const chg = ((cur - opn) / opn) * 100;
  
  let sig = 'NEUTRAL';
  let conf = 50;
  let rea = [];
  
  const a5 = cur > e5;
  const a15 = cur > e15;
  const a60 = cur > e60;
  
  if (a5 && a15 && a60) {
    sig = 'LONG';
    conf = 70;
    rea.push('Above all EMA125');
    if (chg > 0) {
      conf += 15;
      rea.push('Up ' + chg.toFixed(2) + '%');
    }
  } else if (!a5 && !a15 && !a60) {
    sig = 'SHORT';
    conf = 70;
    rea.push('Below all EMA125');
    if (chg < 0) {
      conf += 15;
      rea.push('Down ' + Math.abs(chg).toFixed(2) + '%');
    }
  } else {
    rea.push('Mixed signals');
  }
  
  return {
    signal: sig,
    confidence: conf,
    reasons: rea,
    data: {
      currentPrice: cur.toFixed(2),
      priceChange: (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%',
      ema5m: e5.toFixed(2),
      ema15m: e15.toFixed(2),
      ema60m: e60.toFixed(2)
    }
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const market = url.searchParams.get('market');
    
    if (!symbol) {
      return NextResponse.json({ error: 'No symbol' }, { status: 400 });
    }
    
    if (market !== 'crypto') {
      return NextResponse.json({ error: 'Crypto only' }, { status: 400 });
    }
    
    const k5 = await getKlineData(symbol, '5m', 200);
    const k15 = await getKlineData(symbol, '15m', 200);
    const k60 = await getKlineData(symbol, '1h', 200);
    
    const result = calculateSignal(k5, k15, k60);
    
    return NextResponse.json({
      success: true,
      symbol,
      ...result
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
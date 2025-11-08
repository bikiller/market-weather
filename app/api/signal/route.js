import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  const apiKey = 'VLHOY9XP08I8Z3HM';  // 替换你的key

  try {
    let url;
    let isCrypto = symbol.includes('USD') || symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH');  // 检测加密
    if (isCrypto) {
      // 加密专用API
      const cryptoSymbol = symbol.replace(/USD|USDT/i, '');  // e.g., BTCUSD -> BTC
      url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_INTRADAY&symbol=${cryptoSymbol}&market=USD&interval=5min&apikey=${apiKey}`;
    } else {
      // 股票/外汇
      url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${apiKey}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API response error: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();

    let timeSeries;
    if (isCrypto) {
      timeSeries = data['Time Series Crypto (5min)'];
    } else {
      timeSeries = data['Time Series (5min)'];
    }

    if (!timeSeries) {
      throw new Error('No time series data - check symbol or API key. For crypto, use BTCUSD format.');
    }

    // 取最新5根K线计算
    const timestamps = Object.keys(timeSeries).slice(0, 5).reverse();  // 最新在前
    const closes = timestamps.map(ts => parseFloat(timeSeries[ts]['4. close'] || timeSeries[ts]['4. close']));
    const highs = timestamps.map(ts => parseFloat(timeSeries[ts]['2. high']));
    const lows = timestamps.map(ts => parseFloat(timeSeries[ts]['3. low']));
    const opens = timestamps.map(ts => parseFloat(timeSeries[ts]['1. open']));

    const current_close = closes[0];
    const current_open = opens[0];
    const recent_high = Math.max(...highs.slice(0, 4));
    const recent_low = Math.min(...lows.slice(0, 4));

    // EMA计算 (EWMA)
    function ewm(series, span) {
      const alpha = 2 / (span + 1);
      let ema = series[0];
      for (let i = 1; i < series.length; i++) {
        ema = alpha * series[i] + (1 - alpha) * ema;
      }
      return ema;
    }
    const ema5 = ewm(closes, 5);
    const ema15 = ewm(closes, 15);
    const ema60 = ewm(closes, 60);

    let signals = [];
    // 1. K线高低对比
    if (current_close > recent_high * 0.99) signals.push(1);
    else if (current_close < recent_low * 1.01) signals.push(-1);
    else signals.push(0);
    // 2. 开盘对比
    signals.push(current_close > current_open ? 1 : -1);
    // 3. EMA位置
    let ema_above_count = 0;
    if (current_close > ema5) ema_above_count++;
    if (current_close > ema15) ema_above_count++;
    if (current_close > ema60) ema_above_count++;
    signals.push((ema_above_count / 3) * 2 - 1);

    const score = signals.reduce((a, b) => a + b, 0) / signals.length;
    const direction = score > 0.5 ? '多头' : score < -0.5 ? '空头' : '中性';

    return NextResponse.json({ 
      direction, 
      score: score.toFixed(2), 
      current_price: current_close.toFixed(2),
      open: current_open.toFixed(2)
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
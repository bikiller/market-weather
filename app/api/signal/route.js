import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';  // 默认AAPL
  const apiKey = 'YOUR_ALPHA_VANTAGE_KEY';  // 替换你的key (从步2记事本)

  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${apiKey}`);
    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }
    const data = await response.json();
    const timeSeries = data['Time Series (5min)'];
    if (!timeSeries) {
      throw new Error('No time series data - check symbol or API key');
    }

    // 取最新5根K线计算 (模拟100根，Alpha Vantage compact限100)
    const timestamps = Object.keys(timeSeries).slice(0, 5).reverse();  // 最新在前
    const closes = timestamps.map(ts => parseFloat(timeSeries[ts]['4. close']));
    const highs = timestamps.map(ts => parseFloat(timeSeries[ts]['2. high']));
    const lows = timestamps.map(ts => parseFloat(timeSeries[ts]['3. low']));
    const opens = timestamps.map(ts => parseFloat(timeSeries[ts]['1. open']));

    const current_close = closes[0];
    const current_open = opens[0];
    const recent_high = Math.max(...highs.slice(0, 4));  // 近期高
    const recent_low = Math.min(...lows.slice(0, 4));  // 近期低

    // EMA计算 (简单EWMA)
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
    const ema60 = ewm(closes, 60);  // 简化为最后值

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
    console.error('API Error:', error);  // 日志调试
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
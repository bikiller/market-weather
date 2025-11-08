import { NextResponse } from 'next/server';
import yfinance as yf from 'yfinance';  // 需安装yfinance

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';  // 默认AAPL

  try {
    const data = await yf.download(symbol, period='1d', interval='5m');
    if (data.empty) {
      return NextResponse.json({ error: '数据获取失败' }, { status: 400 });
    }

    const close = data['Close'];
    const high = data['High'];
    const low = data['Low'];
    const open_ = data['Open'];

    const ema5 = close.ewm(span=5).mean();
    const ema15 = close.ewm(span=15).mean();
    const ema60 = close.ewm(span=60).mean();

    const current_close = parseFloat(close.iloc[-1]);
    const current_open = parseFloat(open_.iloc[-1]);
    const recent_high = parseFloat(high.tail(20).max());
    const recent_low = parseFloat(low.tail(20).min());
    const ema5_latest = parseFloat(ema5.iloc[-1]);
    const ema15_latest = parseFloat(ema15.iloc[-1]);
    const ema60_latest = parseFloat(ema60.iloc[-1]);

    let signals = [];
    // 1. K线高低对比
    if (current_close > recent_high * 0.99) signals.push(1);
    else if (current_close < recent_low * 1.01) signals.push(-1);
    else signals.push(0);
    // 2. 开盘对比
    signals.push(current_close > current_open ? 1 : -1);
    // 3. EMA位置
    let ema_above_count = 0;
    if (current_close > ema5_latest) ema_above_count++;
    if (current_close > ema15_latest) ema_above_count++;
    if (current_close > ema60_latest) ema_above_count++;
    signals.push((ema_above_count / 3) * 2 - 1);

    const score = signals.reduce((a, b) => a + b, 0) / signals.length;
    const direction = score > 0.5 ? '多头' : score < -0.5 ? '空头' : '中性';

    return NextResponse.json({ direction, score: score.toFixed(2), current_price: current_close.toFixed(2) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
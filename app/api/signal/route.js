import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';  // JS版Yahoo Finance

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'AAPL';  // 默认AAPL

  try {
    const data = await yahooFinance.quoteSummary(symbol, { modules: ['price', 'summaryDetail'] });
    if (!data || !data.price) {
      return NextResponse.json({ error: '数据获取失败' }, { status: 400 });
    }

    // 简化算法：用实时报价模拟K线+EMA（生产可扩展历史数据）
    const current_close = parseFloat(data.price.regularMarketPrice);
    const current_open = parseFloat(data.price.regularMarketOpen);
    const previous_close = parseFloat(data.price.regularMarketPreviousClose);
    const day_high = parseFloat(data.price.regularMarketDayHigh);
    const day_low = parseFloat(data.price.regularMarketDayLow);

    // 简单EMA模拟 (用历史数据扩展时加ta-lib)
    const ema_short = (current_close + current_open + previous_close) / 3;  // 短EMA模拟
    const ema_long = (day_high + day_low + previous_close) / 3;  // 长EMA模拟

    let signals = [];
    // 1. K线高低对比
    if (current_close > day_high * 0.99) signals.push(1);
    else if (current_close < day_low * 1.01) signals.push(-1);
    else signals.push(0);
    // 2. 开盘对比
    signals.push(current_close > current_open ? 1 : -1);
    // 3. EMA位置
    let ema_above_count = 0;
    if (current_close > ema_short) ema_above_count++;
    if (current_close > ema_long) ema_above_count++;
    signals.push((ema_above_count / 2) * 2 - 1);  // 2 EMA

    const score = signals.reduce((a, b) => a + b, 0) / signals.length;
    const direction = score > 0.5 ? '多头' : score < -0.5 ? '空头' : '中性';

    return NextResponse.json({ 
      direction, 
      score: score.toFixed(2), 
      current_price: current_close.toFixed(2),
      open: current_open.toFixed(2)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
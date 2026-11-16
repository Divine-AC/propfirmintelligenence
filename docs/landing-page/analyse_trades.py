"""Analyse the exported TradingView-style closed-position history and emit
landing-page-ready statistics (JSON + CSV).

Input : docs/landing-page/raw-trades.txt   (pipe delimited, newest first)
Output: docs/landing-page/trades.csv
        docs/landing-page/trading-stats.json
        docs/landing-page/equity-curve.json
"""

from __future__ import annotations

import csv
import json
import math
from collections import OrderedDict, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw-trades.txt"

NICE = {
    "FX:XAUUSD": "Gold (XAU/USD)",
    "OANDA:XAUUSD": "Gold (XAU/USD)",
    "FX:XAGUSD": "Silver (XAG/USD)",
    "FX:EURUSD": "EUR/USD",
    "FX:USDJPY": "USD/JPY",
    "CRYPTO:BTCUSD": "Bitcoin (BTC/USD)",
    "TVC:USOIL": "Crude Oil (WTI)",
}


def load() -> list[dict]:
    trades = []
    for line in RAW.read_text().strip().splitlines():
        f = line.split("|")
        ts = datetime.strptime(f[0], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        trades.append(
            {
                "id": 0,
                "closed_at": ts.isoformat(),
                "date": ts.strftime("%Y-%m-%d"),
                "time": ts.strftime("%H:%M"),
                "weekday": ts.strftime("%a"),
                "balance_before": float(f[1]),
                "balance_after": float(f[2]),
                "pnl": float(f[3]),
                "direction": f[4],
                "symbol_raw": f[5],
                "symbol": NICE.get(f[5], f[5]),
                "exit_price": float(f[6]),
                "units": float(f[7]),
                "avg_price": float(f[8]),
                "quote_ccy": f[9],
            }
        )
    trades.sort(key=lambda t: t["closed_at"])          # chronological
    for i, t in enumerate(trades, 1):
        t["id"] = i
    # Segment accounts: a reset is where balance_before jumps discontinuously.
    seg = 1
    prev_after = None
    for t in trades:
        if prev_after is not None and abs(t["balance_before"] - prev_after) > 1.0:
            seg += 1
        t["account"] = seg
        prev_after = t["balance_after"]
    return trades


def pct_return(pnl: float, base: float) -> float:
    return (pnl / base) * 100.0 if base else 0.0


def stats(rows: list[dict], label: str, starting_balance: float | None = None) -> dict:
    if not rows:
        return {}
    pnls = [r["pnl"] for r in rows]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    be = [p for p in pnls if p == 0]
    gross_win = sum(wins)
    gross_loss = abs(sum(losses))
    net = sum(pnls)

    # balance / equity curve for this segment
    bal = [rows[0]["balance_before"]] + [r["balance_after"] for r in rows]
    peak = -math.inf
    max_dd = 0.0
    max_dd_abs = 0.0
    dd_peak = dd_trough = None
    for i, b in enumerate(bal):
        if b > peak:
            peak = b
        dd = (peak - b) / peak * 100.0 if peak else 0.0
        if dd > max_dd:
            max_dd = dd
            max_dd_abs = peak - b
            dd_peak, dd_trough = peak, b

    # streaks (chronological)
    best_win_streak = cur = 0
    best_loss_streak = curl = 0
    for p in pnls:
        if p > 0:
            cur += 1
            curl = 0
            best_win_streak = max(best_win_streak, cur)
        elif p < 0:
            curl += 1
            cur = 0
            best_loss_streak = max(best_loss_streak, curl)
        else:
            cur = curl = 0

    n = len(pnls)
    start = starting_balance if starting_balance is not None else rows[0]["balance_before"]
    end = rows[-1]["balance_after"]
    days = max((datetime.fromisoformat(rows[-1]["closed_at"]) -
                datetime.fromisoformat(rows[0]["closed_at"])).days, 1)

    # risk per trade as % of balance at entry
    risks = [abs(pct_return(r["pnl"], r["balance_before"])) for r in rows]
    loss_risks = [abs(pct_return(r["pnl"], r["balance_before"])) for r in rows if r["pnl"] < 0]
    win_pcts = [pct_return(r["pnl"], r["balance_before"]) for r in rows if r["pnl"] > 0]

    out = OrderedDict()
    out["label"] = label
    out["trades"] = n
    out["first_trade"] = rows[0]["date"]
    out["last_trade"] = rows[-1]["date"]
    out["calendar_days"] = days
    out["trades_per_week"] = round(n / days * 7, 1)
    out["starting_balance"] = round(start, 2)
    out["ending_balance"] = round(end, 2)
    out["net_pnl"] = round(net, 2)
    out["net_return_pct"] = round(pct_return(net, start), 2)
    out["wins"] = len(wins)
    out["losses"] = len(losses)
    out["breakeven"] = len(be)
    out["win_rate_pct"] = round(len(wins) / n * 100.0, 1)
    out["gross_profit"] = round(gross_win, 2)
    out["gross_loss"] = round(gross_loss, 2)
    out["profit_factor"] = round(gross_win / gross_loss, 2) if gross_loss else None
    out["avg_win"] = round(gross_win / len(wins), 2) if wins else 0.0
    out["avg_loss"] = round(-gross_loss / len(losses), 2) if losses else 0.0
    out["payoff_ratio"] = round((gross_win / len(wins)) / (gross_loss / len(losses)), 2) if wins and losses else None
    out["expectancy_per_trade"] = round(net / n, 2)
    out["expectancy_pct_of_balance"] = round(sum(pct_return(p, r["balance_before"]) for p, r in zip(pnls, rows)) / n, 3)
    out["largest_win"] = round(max(pnls), 2)
    out["largest_loss"] = round(min(pnls), 2)
    out["avg_win_pct_of_balance"] = round(sum(win_pcts) / len(win_pcts), 2) if win_pcts else 0.0
    out["avg_loss_pct_of_balance"] = round(-sum(loss_risks) / len(loss_risks), 2) if loss_risks else 0.0
    out["largest_loss_pct_of_balance"] = round(-max(loss_risks), 2) if loss_risks else 0.0
    out["max_balance_drawdown_pct"] = round(max_dd, 2)
    out["max_balance_drawdown_usd"] = round(max_dd_abs, 2)
    out["drawdown_peak_balance"] = round(dd_peak, 2) if dd_peak else None
    out["drawdown_trough_balance"] = round(dd_trough, 2) if dd_trough else None
    out["peak_balance"] = round(max(bal), 2)
    out["best_win_streak"] = best_win_streak
    out["worst_loss_streak"] = best_loss_streak

    by_sym = defaultdict(list)
    by_dir = defaultdict(list)
    by_day = defaultdict(list)
    by_hour = defaultdict(list)
    for r in rows:
        by_sym[r["symbol"]].append(r)
        by_dir[r["direction"]].append(r)
        by_day[r["weekday"]].append(r)
        by_hour[int(r["time"][:2]) // 3 * 3].append(r)

    def breakdown(groups):
        res = []
        for k, g in groups.items():
            p = [x["pnl"] for x in g]
            w = [x for x in p if x > 0]
            l = [x for x in p if x < 0]
            res.append(
                {
                    "key": k,
                    "trades": len(g),
                    "net_pnl": round(sum(p), 2),
                    "win_rate_pct": round(len(w) / len(g) * 100.0, 1),
                    "profit_factor": round(sum(w) / abs(sum(l)), 2) if l and sum(l) != 0 else None,
                    "avg_pnl": round(sum(p) / len(g), 2),
                    "share_of_trades_pct": round(len(g) / len(rows) * 100.0, 1),
                }
            )
        res.sort(key=lambda x: -x["trades"])
        return res

    out["by_symbol"] = breakdown(by_sym)
    out["by_direction"] = breakdown(by_dir)
    out["by_weekday"] = sorted(breakdown(by_day), key=lambda x: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].index(x["key"]))
    out["by_session_utc"] = sorted(breakdown({f"{h:02d}:00-{h+3:02d}:00 UTC": g for h, g in by_hour.items()}), key=lambda x: x["key"])
    return out


def main() -> None:
    trades = load()
    accounts = sorted({t["account"] for t in trades})

    result = OrderedDict()
    result["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result["source"] = "Trader's exported closed-position history (TradingView paper/prop broker export)"
    result["currency"] = "USD"
    result["account_segments"] = [
        {
            "segment": a,
            "trades": len([t for t in trades if t["account"] == a]),
            "from": min(t["date"] for t in trades if t["account"] == a),
            "to": max(t["date"] for t in trades if t["account"] == a),
            "starting_balance": [t for t in trades if t["account"] == a][0]["balance_before"],
            "ending_balance": [t for t in trades if t["account"] == a][-1]["balance_after"],
        }
        for a in accounts
    ]
    result["all_trades"] = stats(trades, "Full exported sample")
    for a in accounts:
        seg = [t for t in trades if t["account"] == a]
        result[f"account_{a}"] = stats(seg, f"Account segment {a}")

    # monthly table (full sample)
    monthly = defaultdict(list)
    for t in trades:
        monthly[t["date"][:7]].append(t)
    result["monthly"] = [
        {
            "month": k,
            "trades": len(v),
            "net_pnl": round(sum(x["pnl"] for x in v), 2),
            "win_rate_pct": round(len([x for x in v if x["pnl"] > 0]) / len(v) * 100.0, 1),
            "end_balance": round(v[-1]["balance_after"], 2),
        }
        for k, v in sorted(monthly.items())
    ]

    (ROOT / "trading-stats.json").write_text(json.dumps(result, indent=2))

    with (ROOT / "trades.csv").open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(trades[0].keys()))
        w.writeheader()
        w.writerows(trades)

    curve = [
        {"date": t["date"], "time": t["time"], "trade": t["id"], "symbol": t["symbol"],
         "direction": t["direction"], "pnl": t["pnl"], "balance": t["balance_after"],
         "account": t["account"]}
        for t in trades
    ]
    (ROOT / "equity-curve.json").write_text(json.dumps(curve, indent=2))

    # console summary
    print(json.dumps({k: v for k, v in result.items()
                      if k in ("account_segments", "monthly")}, indent=2))
    for key in ("all_trades", "account_1", "account_2"):
        s = result[key]
        print("\n=====", s["label"], "=====")
        for k, v in s.items():
            if k in ("by_symbol", "by_direction", "by_weekday", "by_session_utc"):
                print(f"{k}:")
                for row in v:
                    print("   ", row)
            else:
                print(f"{k}: {v}")


if __name__ == "__main__":
    main()

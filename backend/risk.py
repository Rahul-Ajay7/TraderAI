MAX_POSITION_PCT = 0.20
STOP_LOSS_PCT = 0.05
TAKE_PROFIT_PCT = 0.08
TRAILING_STOP_PCT = 0.03
MAX_DRAWDOWN_PCT = 0.20
MAX_POSITIONS = 5


def position_size(cash: float, price: float, confidence: float = 0.5) -> float:
    pct = MAX_POSITION_PCT * min(confidence, 1.0)
    max_amount = cash * pct
    qty = max_amount / price if price > 0 else 0
    return round(qty, 6)


def within_risk(cash: float, price: float, action: str, num_holdings: int) -> bool:
    if action.upper() != "BUY":
        return True
    if num_holdings >= MAX_POSITIONS:
        return False
    return (cash * MAX_POSITION_PCT) >= price


def check_stop_loss(avg_buy: float, current: float) -> bool:
    if avg_buy <= 0:
        return False
    return ((current - avg_buy) / avg_buy) <= -STOP_LOSS_PCT


def check_take_profit(avg_buy: float, current: float) -> bool:
    if avg_buy <= 0:
        return False
    return ((current - avg_buy) / avg_buy) >= TAKE_PROFIT_PCT


def update_trailing_stop(current_stop: float, current_price: float) -> float:
    new_stop = current_price * (1 - TRAILING_STOP_PCT)
    return max(current_stop, new_stop)


def check_trailing_stop(trailing_stop: float, current_price: float) -> bool:
    if trailing_stop <= 0:
        return False
    return current_price <= trailing_stop


def max_drawdown_breached(total_value: float, peak_value: float) -> bool:
    if peak_value <= 0:
        return False
    drawdown = (peak_value - total_value) / peak_value
    return drawdown >= MAX_DRAWDOWN_PCT

"""Three-level status remains unclassified until validated cutoffs are supplied."""

STATUS_THRESHOLDS: tuple[float, float] | None = None


def interpret_status(score: float) -> str | None:
    if STATUS_THRESHOLDS is None:
        return None
    normal_max, caution_max = STATUS_THRESHOLDS
    if not 0 <= normal_max < caution_max <= 1:
        raise ValueError("Status thresholds must be ordered model scores in [0, 1]")
    if score < normal_max:
        return "normal"
    if score < caution_max:
        return "caution"
    return "high_risk"

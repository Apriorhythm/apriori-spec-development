"""slug — the smallest possible apriori-bound Python module."""
import re


def slugify(text: str) -> str:
    """Lowercase, non-alphanumerics collapse to single hyphens, trimmed."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

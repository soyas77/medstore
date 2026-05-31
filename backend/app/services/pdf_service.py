"""Invoice PDF rendering via Jinja2 + WeasyPrint."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.models.invoice import Invoice

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


@lru_cache
def _jinja_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["money"] = lambda v: f"{float(v):,.2f}"
    return env


def render_invoice_html(invoice: Invoice) -> str:
    """Render the invoice HTML (also useful for previews/tests)."""
    template = _jinja_env().get_template("invoice.html")
    return template.render(invoice=invoice, business_name=settings.app_name)


def render_invoice_pdf(invoice: Invoice) -> bytes:
    """Render an invoice to PDF bytes.

    WeasyPrint is imported lazily so the rest of the app (and the test suite)
    can run even if the native rendering libraries are unavailable.
    """
    from weasyprint import HTML  # local import: heavy native deps

    html = render_invoice_html(invoice)
    return HTML(string=html).write_pdf()

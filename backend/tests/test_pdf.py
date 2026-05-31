"""Invoice PDF / HTML rendering tests.

WeasyPrint requires native libraries (pango/cairo) that may not be installed in
every CI image, so the actual PDF byte-generation test is skipped gracefully if
the import fails. The HTML rendering (the part we author) is always tested.
"""

from __future__ import annotations

import pytest

from app.schemas.sale import SaleCreate, SaleItemInput
from app.services.pdf_service import render_invoice_html, render_invoice_pdf
from app.services.sale_service import process_sale

pytestmark = pytest.mark.asyncio


async def _make_invoice(session_maker, admin):
    payload = SaleCreate(
        customer_name="PDF Customer",
        items=[SaleItemInput(medicine_id="MED-0001", quantity_strips=3)],
    )
    async with session_maker() as s:
        return await process_sale(s, payload, admin.id)


async def test_render_invoice_html_contains_key_fields(session_maker, seeded):
    invoice = await _make_invoice(session_maker, seeded["admin"])
    html = render_invoice_html(invoice)

    assert invoice.invoice_number in html
    assert "Paracetamol 500mg" in html
    assert "PDF Customer" in html
    assert "Grand Total" in html


async def test_render_invoice_pdf_bytes(session_maker, seeded):
    invoice = await _make_invoice(session_maker, seeded["admin"])
    try:
        pdf = render_invoice_pdf(invoice)
    except (ImportError, OSError) as exc:  # native libs missing
        pytest.skip(f"WeasyPrint native deps unavailable: {exc}")
    assert isinstance(pdf, (bytes, bytearray))
    assert pdf[:4] == b"%PDF"

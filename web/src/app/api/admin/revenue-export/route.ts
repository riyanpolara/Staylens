import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { getRevenueDashboard } from "@/lib/admin/revenue";
import { parseRevenueQuery } from "@/lib/admin/revenue-query";

/**
 * CSV for the Export button.
 *
 * Re-checks `checkAdmin()` — a route handler is a public GET endpoint, and the
 * layout gate does not protect it. The figures come from the same RPC the page
 * renders, so the file can never disagree with what was on screen.
 *
 * Amounts are written as plain numbers in INR, not formatted with ₹ or K/L/Cr:
 * a spreadsheet needs to be able to add them up.
 */

/** RFC 4180: quote everything, double any embedded quote. */
function cell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const check = await checkAdmin();
  if (check.state !== "admin") {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = parseRevenueQuery(sp);
  const result = await getRevenueDashboard(query);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  const d = result.data;
  const rows: (string | number)[][] = [
    ["StayLens revenue export"],
    ["Window", d.range.from, "to", d.range.to],
    ["Compared against", d.range.prior_from, "to", d.range.prior_to],
    ["Currency", "INR"],
    [],
    ["Metric", "This period", "Prior period"],
    ["Gross booking value", d.totals.gross, d.prior.gross],
    ["Platform commission", d.totals.commission, d.prior.commission],
    ["Host payouts", d.totals.payouts, d.prior.payouts],
    ["Refunds", d.totals.refunds, d.prior.refunds],
    ["Taxes collected", d.totals.taxes, d.prior.taxes],
    ["Net of refunds", d.totals.net, d.prior.net],
    ["Paid bookings", d.totals.bookings, d.prior.bookings],
    ["Average booking value", d.totals.avg_booking_value, d.prior.avg_booking_value],
    ["Median booking value", d.totals.median_booking_value, ""],
    [],
    ["Revenue over time"],
    ["Bucket", "Revenue", "Commission", "Bookings", "Prior revenue"],
    ...d.trend.map((p, i) => [
      p.bucket,
      p.revenue,
      p.commission,
      p.bookings,
      d.trend_prior[i] ?? 0,
    ]),
    [],
    ["Revenue by city"],
    ["City", "Country", "Revenue", "Bookings", "Prior revenue"],
    ...d.by_city.map((c) => [c.city, c.country, c.revenue, c.bookings, c.prior_revenue]),
    [],
    ["Revenue by property type"],
    ["Property type", "Revenue", "Bookings"],
    ...d.by_property_type.map((t) => [t.property_type, t.revenue, t.bookings]),
    [],
    ["Booking value distribution"],
    ["Band", "Bookings", "Revenue"],
    ...d.value_distribution.map((b) => [b.band, b.bookings, b.revenue]),
  ];

  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="staylens-revenue-${d.range.from}-to-${d.range.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Money } from '@/shared/api/generated/model';
import { aVehicle, aVehicleAllTimeInsights, aVehicleInsights, eur, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

/** Two earlier-and-later peak months that are never the current month. */
const others = Array.from({ length: 12 }, (_, m) => m).filter((m) => m !== currentMonth);
const [peakA, peakB] = [others[2]!, others[8]!];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthTotals = (totals: Record<number, string>): Money[] =>
  Array.from({ length: 12 }, (_, month) => eur(totals[month] ?? '0.00'));

/** The chart's bars, January … December. */
const bars = () => [...screen.getByRole('img').querySelectorAll('rect')];

// specs/insights.md — acceptance criteria 1–14 (UI side).
describe('InsightsPage', () => {
  const vehicle = aVehicle({ nickname: 'Golf' });
  const serve = (insights: Parameters<typeof aVehicleInsights>[0]) => {
    const years: (string | null)[] = [];
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/insights`), ({ request }) => {
        const year = new URL(request.url).searchParams.get('year');
        years.push(year);
        return HttpResponse.json(aVehicleInsights({ ...insights, year: Number(year) }));
      }),
    );
    return years;
  };

  it("shows the year's tiles, the chart with its peak and the category breakdown", async () => {
    serve({
      total: eur('2148.00'),
      averagePerMonth: eur('214.80'),
      monthTotals: monthTotals({ [peakA]: '436.00', [peakB]: '436.00', [currentMonth]: '100.00' }),
      categories: [
        { category: 'FUEL', total: eur('1172.00'), sharePercent: 55 },
        { category: 'TIRES', total: eur('380.00'), sharePercent: 18 },
        { category: 'OTHER', total: eur('55.00'), sharePercent: 3 },
      ],
      carValue: eur('8500.00'),
      distanceKm: 13120,
      costPerKm: eur('0.85'),
      yearDistanceKm: 6320,
      yearCostPerKm: eur('0.34'),
    });

    renderApp(`/vehicles/${vehicle.id}/insights`);

    expect(await screen.findByRole('heading', { name: 'Golf', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(`Insights · ${currentYear}`)).toBeInTheDocument();
    expect(screen.getByText('Total spent').nextSibling).toHaveTextContent('€2,148');
    expect(screen.getByText('Avg per month').nextSibling).toHaveTextContent('€214.80');
    expect(screen.getByRole('button', { name: 'Year' })).toHaveAttribute('aria-pressed', 'true');
    // AC 10, 12: distance and cost per km of the selected year, not lifetime.
    expect(screen.getByText('Distance').parentElement).toHaveTextContent(`6,320 kmIn ${currentYear}`);
    expect(screen.getByText('Per km').nextSibling).toHaveTextContent('€0.34');
    expect(screen.queryByText('Car value')).not.toBeInTheDocument();

    // Peak: the earliest of the highest months wins; the current month is highlighted in the current year.
    expect(screen.getByText(/^Peak:/)).toHaveTextContent(`Peak: ${MONTHS[peakA]} · €436`);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      `Monthly spending January to December ${currentYear}, peak in ${LONG[peakA]} at €436`,
    );
    expect(bars()).toHaveLength(12);
    expect(bars()[currentMonth]).toHaveClass('fill-primary');
    expect(bars().filter((bar) => bar.classList.contains('fill-primary'))).toHaveLength(1);

    const rows = within(screen.getByRole('list', { name: 'Spending by category' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Fuel55% · €1,172',
      'Tires18% · €380',
      'Other3% · €55',
    ]);
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the peak month of a past year and asks for that year', async () => {
    const years = serve({
      firstYear: currentYear - 1,
      total: eur('1200.00'),
      averagePerMonth: eur('100.00'),
      monthTotals: monthTotals({ 5: '1000.00', 8: '200.00' }),
    });
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/insights`);

    await user.click(await screen.findByRole('button', { name: 'Previous year' }));

    expect(await screen.findByText(`Insights · ${currentYear - 1}`)).toBeInTheDocument();
    expect(await screen.findByText('Peak: Jun · €1,000')).toBeInTheDocument();
    expect(screen.getByText('Avg per month').nextSibling).toHaveTextContent('€100');
    expect(bars()[5]).toHaveClass('fill-primary');
    expect(bars().filter((bar) => bar.classList.contains('fill-primary'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
    expect(years).toEqual([String(currentYear), String(currentYear - 1)]);
  });

  it('shows an empty year with zero tiles, a flat chart, no breakdown and no distance', async () => {
    serve({ carValue: eur('8500.00'), distanceKm: 1000, costPerKm: eur('8.60') });

    renderApp(`/vehicles/${vehicle.id}/insights`);

    expect(await screen.findByText(`No expenses in ${currentYear}`)).toBeInTheDocument();
    expect(screen.getByText('Total spent').nextSibling).toHaveTextContent('€0');
    expect(screen.getByText('Avg per month').nextSibling).toHaveTextContent('€0');
    // AC 11: no odometer readings in the year.
    expect(screen.getByText('Distance').nextSibling).toHaveTextContent('—');
    expect(screen.getByText('Per km').nextSibling).toHaveTextContent('—');
    expect(screen.queryByText(/^Peak:/)).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(`No spending in ${currentYear}`);
    expect(bars().every((bar) => bar.getAttribute('height') === '0')).toBe(true);
  });

  it('shows an error with retry when the insights cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/insights`), () =>
        fail
          ? HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 })
          : HttpResponse.json(aVehicleInsights()),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/insights`);

    expect(await screen.findByText('Could not load the insights')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(`No expenses in ${currentYear}`)).toBeInTheDocument();
  });

  describe('All time', () => {
    const yearTotals = [
      { year: currentYear - 2, total: eur('300.00') },
      { year: currentYear - 1, total: eur('1200.00') },
      { year: currentYear, total: eur('2148.00') },
    ];

    it('switches to all-time figures, a bar per year and the all-time breakdown', async () => {
      serve({});
      server.use(
        http.get(api(`/vehicles/${vehicle.id}/insights/all-time`), () =>
          HttpResponse.json(
            aVehicleAllTimeInsights({
              firstYear: currentYear - 2,
              total: eur('3648.00'),
              averagePerMonth: eur('167.40'),
              yearTotals,
              categories: [
                { category: 'FUEL', total: eur('2148.00'), sharePercent: 59 },
                { category: 'TIRES', total: eur('1500.00'), sharePercent: 41 },
              ],
              carValue: eur('8500.00'),
              distanceKm: 13120,
              costPerKm: eur('0.93'),
            }),
          ),
        ),
      );
      const user = userEvent.setup();
      renderApp(`/vehicles/${vehicle.id}/insights`);

      await user.click(await screen.findByRole('button', { name: 'All time' }));

      expect(await screen.findByText('Insights · All time')).toBeInTheDocument();
      expect(await screen.findByText('Car value')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('button', { name: 'Previous year' })).not.toBeInTheDocument();
      expect(screen.getByText('Total spent').nextSibling).toHaveTextContent('€3,648');
      expect(screen.getByText('Avg per month').nextSibling).toHaveTextContent('€167.40');
      expect(screen.getByText('Car value').parentElement).toHaveTextContent('€8,500Purchase price');
      expect(screen.getByText('Distance').nextSibling).toHaveTextContent('13,120 km');
      expect(screen.getByText('Per km').nextSibling).toHaveTextContent('€0.93');

      expect(screen.getByRole('heading', { name: 'By year' })).toBeInTheDocument();
      expect(screen.getByText(/^Peak:/)).toHaveTextContent(`Peak: ${currentYear} · €2,148`);
      expect(screen.getByRole('img')).toHaveAccessibleName(
        `Yearly spending ${currentYear - 2} to ${currentYear}, peak in ${currentYear} at €2,148`,
      );
      expect(bars()).toHaveLength(3);
      expect(bars()[2]).toHaveClass('fill-primary');
      expect(bars().filter((bar) => bar.classList.contains('fill-primary'))).toHaveLength(1);

      const rows = within(screen.getByRole('list', { name: 'Spending by category' })).getAllByRole(
        'listitem',
      );
      expect(rows.map((row) => row.textContent)).toEqual(['Fuel59% · €2,148', 'Tires41% · €1,500']);

      await user.click(screen.getByRole('button', { name: 'Year' }));
      expect(await screen.findByText(`Insights · ${currentYear}`)).toBeInTheDocument();
    });

    it('opens all time from the URL without loading a year, and shows an empty state without expenses', async () => {
      server.use(
        http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
        http.get(api(`/vehicles/${vehicle.id}/insights/all-time`), () =>
          HttpResponse.json(aVehicleAllTimeInsights()),
        ),
      );
      renderApp(`/vehicles/${vehicle.id}/insights?period=all`);

      expect(await screen.findByText('No expenses yet')).toBeInTheDocument();
      expect(screen.getByText('Total spent').nextSibling).toHaveTextContent('€0');
      expect(screen.getByText('Per km').nextSibling).toHaveTextContent('—');
      expect(screen.queryByText(/^Peak:/)).not.toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAccessibleName(`No spending in ${currentYear}`);
    });

    it('shows an error with retry when the all-time insights cannot be loaded', async () => {
      let fail = true;
      server.use(
        http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
        http.get(api(`/vehicles/${vehicle.id}/insights/all-time`), () =>
          fail
            ? HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 })
            : HttpResponse.json(aVehicleAllTimeInsights()),
        ),
      );
      const user = userEvent.setup();
      renderApp(`/vehicles/${vehicle.id}/insights?period=all`);

      expect(await screen.findByText('Could not load the insights')).toBeInTheDocument();
      fail = false;
      await user.click(screen.getByRole('button', { name: 'Try again' }));

      expect(await screen.findByText('No expenses yet')).toBeInTheDocument();
    });
  });
});

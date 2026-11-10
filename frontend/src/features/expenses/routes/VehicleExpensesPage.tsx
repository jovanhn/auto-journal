import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { Currency, Journal } from '@/shared/api/generated/model';
import { monthIndexOf, monthName } from '@/shared/lib/dates';
import { formatKm, formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { JournalFilterBar } from '../components/JournalFilterBar';
import { JournalMonthGroup } from '../components/JournalMonthGroup';
import { StatTile } from '../components/StatTile';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { useJournal } from '../hooks/useJournal';
import { useVehicle } from '../hooks/useVehicle';
import {
  averageMonths,
  averagePerMonth,
  earlierDate,
  filterJournal,
  journalItems,
  sumExpenses,
  type JournalItem,
  type JournalPeriod,
  type JournalSearch,
  type JournalType,
} from '../journal';
import { metricInfo } from '../metricInfo';

const route = getRouteApi('/_app/vehicles/$vehicleId');

/**
 * Vehicle · Journal (specs/journal.md, specs/journal-filters.md): app bar, the filter bar (search, entry type, year
 * chips), Spent / Avg per month / Entries tiles for what is shown, the entries grouped by month (newest first), and
 * the Add journal entry FAB. The filters live in the URL.
 */
export function VehicleExpensesPage() {
  const { vehicleId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const currentYear = new Date().getFullYear();
  const period: JournalPeriod =
    search.year === 'all' ? 'all' : Math.min(search.year ?? currentYear, currentYear);
  const vehicle = useVehicle(vehicleId);
  const journal = useJournal(vehicleId);
  const displayCurrency = useDisplayCurrency();

  const changeSearch = (next: { period?: JournalPeriod; type?: JournalType | null; q?: string }) => {
    const nextPeriod = next.period ?? period;
    const nextType = next.type === undefined ? search.type : (next.type ?? undefined);
    const nextQuery = next.q ?? search.q ?? '';
    void navigate({
      search: {
        ...(nextPeriod === currentYear ? {} : { year: nextPeriod }),
        ...(nextType ? { type: nextType } : {}),
        ...(nextQuery !== '' ? { q: nextQuery } : {}),
      },
      replace: true,
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-36">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle={
          vehicle.isSuccess
            ? `${vehicle.data.make} ${vehicle.data.model} · ${vehicle.data.year} · ${formatKm(vehicle.data.currentOdometer)}`
            : undefined
        }
      />

      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : journal.isPending ? (
        <LoadingState label="Loading journal…" rows={5} />
      ) : journal.isError ? (
        <ErrorState
          title="Could not load the journal"
          error={journal.error}
          onRetry={() => void journal.refetch()}
        />
      ) : (
        <>
          <JournalFilterBar
            query={search.q ?? ''}
            type={search.type}
            period={period}
            years={yearsDownTo(journal.data.firstYear, currentYear)}
            onQueryChange={(q) => {
              changeSearch({ q });
            }}
            onTypeChange={(type) => {
              changeSearch({ type: type ?? null });
            }}
            onPeriodChange={(next) => {
              changeSearch({ period: next });
            }}
          />
          <JournalView
            data={journal.data}
            period={period}
            search={search}
            currentYear={currentYear}
            currency={displayCurrency.data ?? journal.data.expenses[0]?.displayAmount.currency ?? 'EUR'}
            purchaseDate={vehicle.data?.purchaseDate}
            vehicleId={vehicleId}
            onClear={() => {
              void navigate({ search: {}, replace: true });
            }}
          />
        </>
      )}

      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-24 z-10 h-13 rounded-full px-5 shadow-[0_4px_14px_rgb(22_24_29/0.18)]"
      >
        <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }} search={search}>
          <Plus className="size-[18px]" aria-hidden="true" />
          Add journal entry
        </Link>
      </Button>
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

/** The current year down to [firstYear] (at least the current year). */
const yearsDownTo = (firstYear: number, currentYear: number): number[] =>
  Array.from({ length: Math.max(1, currentYear - firstYear + 1) }, (_, index) => currentYear - index);

type JournalViewProps = {
  data: Journal;
  period: JournalPeriod;
  search: JournalSearch;
  currentYear: number;
  /** The display currency, for sums of nothing. */
  currency: Currency;
  /** BR-I9: the All average starts at the earlier of the purchase date and the first expense. */
  purchaseDate: string | undefined;
  vehicleId: string;
  onClear: () => void;
};

function JournalView({
  data,
  period,
  search,
  currentYear,
  currency,
  purchaseDate,
  vehicleId,
  onClear,
}: JournalViewProps) {
  const items = filterJournal(journalItems(data), period, search.type, search.q);
  const filtered = period !== currentYear || !!search.type || (search.q ?? '').trim() !== '';
  const spent = sumExpenses(items, currency);
  const firstExpense = data.expenses.at(-1)?.date;
  const months = averageMonths(period, new Date(), earlierDate(purchaseDate, firstExpense));
  const groups = monthGroups(items, period === 'all');

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Spent" value={formatMoney(spent)} info={metricInfo.journalSpent} />
        <StatTile
          label="Avg / month"
          value={formatMoney(averagePerMonth(spent, months))}
          info={metricInfo.journalAverage}
        />
        <StatTile label="Entries" value={String(items.length)} info={metricInfo.journalEntries} />
      </div>
      {filtered && (
        <div className="-my-2 flex items-center justify-between px-1">
          <span className="text-[13px] text-muted-foreground">Filtered results</span>
          <Button variant="link" className="h-11 px-0 font-semibold" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No entries match"
            description="Try another search, year or entry type."
            action={
              <Button variant="outline" className="mt-2" onClick={onClear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title={`No journal entries in ${String(period)}`}
            description="Log what this car costs, its odometer or anything you notice."
            action={
              <Button asChild className="mt-2">
                <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
                  Add to journal
                </Link>
              </Button>
            }
          />
        )
      ) : (
        groups.map((group) => (
          <JournalMonthGroup
            key={group.key}
            label={group.label}
            total={group.hasExpenses ? sumExpenses(group.items, currency) : null}
            items={group.items}
            currentYear={currentYear}
            search={search}
          />
        ))
      )}
    </>
  );
}

type MonthGroup = { key: string; label: string; items: JournalItem[]; hasExpenses: boolean };

/** Consecutive items of one month (items are newest first); the label carries the year when all years show. */
function monthGroups(items: JournalItem[], withYear: boolean): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const item of items) {
    const key = item.entry.date.slice(0, 7);
    let group = groups.at(-1);
    if (group?.key !== key) {
      const name = monthName(monthIndexOf(item.entry.date));
      group = { key, label: withYear ? `${name} ${key.slice(0, 4)}` : name, items: [], hasExpenses: false };
      groups.push(group);
    }
    group.items.push(item);
    if (item.kind === 'expense') group.hasExpenses = true;
  }
  return groups;
}

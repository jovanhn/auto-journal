import { Link } from '@tanstack/react-router';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { ProjectSummary } from '@/shared/api/generated/model';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

// Module scope keeps features/columns stable across renders (TanStack Table v9 requirement).
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ProjectSummary>();
const columns = helper.columns([
  helper.accessor('name', {
    header: 'Project',
    cell: (info) => (
      <Link
        to="/projects/$projectId"
        params={{ projectId: info.row.original.id }}
        className="font-medium underline-offset-4 hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('openTaskCount', { header: 'Open tasks' }),
  helper.accessor('doneTaskCount', { header: 'Done tasks' }),
]);

type ProjectsTableProps = {
  projects: ProjectSummary[];
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const table = useTable({ features, columns, data: projects, getRowId: (row) => row.id });

  return (
    <Table aria-label="Projects">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

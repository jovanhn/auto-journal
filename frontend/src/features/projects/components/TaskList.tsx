import { CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '@/shared/api/generated/model';
import { cn } from '@/shared/lib/utils';

type TaskListProps = {
  tasks: Task[];
};

export function TaskList({ tasks }: TaskListProps) {
  return (
    <ul aria-label="Tasks" className="divide-y rounded-lg border">
      {tasks.map((task) => {
        const done = task.status === 'DONE';
        const Icon = done ? CheckCircle2 : Circle;
        return (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <Icon
              aria-hidden="true"
              className={cn('size-4', done ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className={cn('flex-1', done && 'text-muted-foreground line-through')}>{task.title}</span>
            <span className="text-xs text-muted-foreground">{done ? 'Done' : 'Open'}</span>
          </li>
        );
      })}
    </ul>
  );
}

import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { Project } from '@/shared/api/generated/model';

type ProjectHeaderProps = {
  project: Project;
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All projects
      </Link>
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      {project.description && <p className="text-muted-foreground">{project.description}</p>}
    </div>
  );
}

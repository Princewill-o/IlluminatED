import {
  ExternalLink,
  LinkList,
  Note,
  PageHeader,
  Section,
} from "@/components/kit";
import { coursesByRoute } from "@/lib/data/courses";
import { BOARDS, routeById } from "@/lib/data/routes";
import type { BoardId, Course, RouteId } from "@/lib/types";

export function HubHero({
  id,
  children,
}: {
  id: RouteId;
  children?: React.ReactNode;
}) {
  const r = routeById(id);
  return (
    <PageHeader
      title={r.name}
      intro={
        <>
          <span className="text-foreground">{r.years}.</span> {r.description}
        </>
      }
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Courses", href: "/courses" },
        { label: r.name },
      ]}
    >
      {children}
    </PageHeader>
  );
}

const courseMeta = (c: Course) =>
  c.boardFixed
    ? c.boards.map((b) => BOARDS[b].short).join(", ")
    : c.topicIds.length
      ? `${c.topicIds.length} topic${c.topicIds.length > 1 ? "s" : ""}`
      : undefined;

export function CourseGrid({
  courses,
  groupBy,
}: {
  courses: Course[];
  groupBy?: boolean;
}) {
  const toItems = (list: Course[]) =>
    list.map((c) => ({
      href: `/courses/${c.id}`,
      title: c.subject,
      description: c.summary,
      meta: courseMeta(c),
    }));
  if (!groupBy) return <LinkList columns={2} items={toItems(courses)} />;
  const groups = Array.from(new Set(courses.map((c) => c.group ?? "Other")));
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <div key={g}>
          <h3 className="mb-2 text-lg font-semibold">{g}</h3>
          <LinkList
            columns={2}
            items={toItems(courses.filter((c) => (c.group ?? "Other") === g))}
          />
        </div>
      ))}
    </div>
  );
}

export function BoardLinks({ boards }: { boards: BoardId[] }) {
  return (
    <ul className="border-t">
      {boards.map((b) => {
        const B = BOARDS[b];
        return (
          <li
            key={b}
            className="grid gap-2 border-b py-4 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-8"
          >
            <div>
              <p className="font-semibold">{B.name}</p>
              {B.note && (
                <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                  {B.note}
                </p>
              )}
            </div>
            <ExternalLink href={B.home}>Specifications</ExternalLink>
            {B.pastPapers ? (
              <ExternalLink href={B.pastPapers}>
                Past papers and mark schemes
              </ExternalLink>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function RouteCourses({
  id,
  title,
  intro,
  groupBy,
}: {
  id: RouteId;
  title: string;
  intro?: string;
  groupBy?: boolean;
}) {
  return (
    <Section id="subjects" title={title} intro={intro}>
      <CourseGrid courses={coursesByRoute(id)} groupBy={groupBy} />
    </Section>
  );
}

export function StudyAdvice({ id }: { id: RouteId }) {
  return <Note>{routeById(id).studyAdvice}</Note>;
}

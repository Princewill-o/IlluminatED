import type { CourseCurriculum } from "@/lib/education";
/** A cached database snapshot must not displace a more recently checked bundled item. */
export function newestCurriculum(
  local: CourseCurriculum,
  remote: CourseCurriculum | null,
): CourseCurriculum {
  if (!remote || remote.course.id !== local.course.id) return local;
  function merge<T extends { checkedAt: string }>(
    bundled: T[],
    stored: T[],
    key: (item: T) => string,
  ): T[] {
    const items = new Map(bundled.map((item) => [key(item), item]));
    for (const item of stored) {
      if (!item || !Number.isFinite(Date.parse(item.checkedAt))) continue;
      const previous = items.get(key(item));
      if (
        !previous ||
        Date.parse(item.checkedAt) > Date.parse(previous.checkedAt)
      )
        items.set(key(item), item);
    }
    return [...items.values()];
  }
  return {
    ...local,
    programmes: merge(local.programmes, remote.programmes, (p) => p.slug),
    syllabuses: merge(
      local.syllabuses,
      remote.syllabuses,
      (s) => `${s.board}:${s.code}`,
    ),
  };
}

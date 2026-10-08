export type ClassroomConnection = { accessToken: string; refreshToken?: string };
export type ClassroomTask = {
  id: string;
  title: string;
  description?: string;
  link?: string;
  dueDate?: string;
};
type Fetcher = typeof fetch;

export async function fetchClassroomTasks(
  connection: ClassroomConnection,
  fetcher: Fetcher = fetch,
): Promise<ClassroomTask[]> {
  const headers = { authorization: `Bearer ${connection.accessToken}` };
  const coursesResponse = await fetcher(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
    { headers },
  );
  if (!coursesResponse.ok) throw new Error(`GOOGLE_CLASSROOM_${coursesResponse.status}`);
  const courses = (await coursesResponse.json()) as { courses?: Array<{ id: string }> };
  const results = await Promise.all(
    (courses.courses ?? []).map(async (course) => {
      const response = await fetcher(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
        { headers },
      );
      if (!response.ok) return [];
      const data = (await response.json()) as {
        courseWork?: Array<{
          id: string;
          title: string;
          description?: string;
          alternateLink?: string;
          dueDate?: { year: number; month: number; day: number };
          dueTime?: { hours?: number; minutes?: number };
        }>;
      };
      return (data.courseWork ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        link: item.alternateLink,
        dueDate: item.dueDate
          ? new Date(
              item.dueDate.year,
              item.dueDate.month - 1,
              item.dueDate.day,
              item.dueTime?.hours ?? 0,
              item.dueTime?.minutes ?? 0,
            ).toISOString()
          : undefined,
      }));
    }),
  );
  return results.flat();
}

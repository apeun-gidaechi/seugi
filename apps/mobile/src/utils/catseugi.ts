type CatseugiEnvelope = { keyword?: string; data?: unknown };
type CatseugiParticipant = { id: string; name: string };

export function catseugiVisibleText(raw: string, participants: CatseugiParticipant[] = []): string {
  let answer: CatseugiEnvelope;
  try { answer = JSON.parse(raw) as CatseugiEnvelope; }
  catch { return raw; }

  if (typeof answer.data === "string") {
    if (answer.keyword === "사람 뽑기") {
      const ids = [...answer.data.matchAll(/::([^:]+)::/g)].map((match) => match[1]!);
      if (!ids.length) return answer.data;
      const names = ids.map((id) => participants.find((participant) => participant.id === id)?.name).filter((name): name is string => !!name);
      return `사람을 ${ids.length}명 뽑았어요\n${names.join(" ")}`;
    }
    if (answer.keyword === "팀짜기") {
      return answer.data.replace(/::([^:]+)::/g, (token, id: string) => participants.find((participant) => participant.id === id)?.name ?? token);
    }
    return answer.data;
  }
  if (!Array.isArray(answer.data)) return raw;

  const rows = answer.data as Array<Record<string, unknown>>;
  if (answer.keyword === "급식") {
    const label = (row: Record<string, unknown>) => {
      const type = String(row.mealType ?? row.type ?? "");
      if (["조식", "아침", "BREAKFAST"].includes(type.toUpperCase())) return "조식";
      if (["중식", "점심", "LUNCH"].includes(type.toUpperCase())) return "중식";
      if (["석식", "저녁", "DINNER"].includes(type.toUpperCase())) return "석식";
      return type;
    };
    return rows.length
      ? rows.map((row) => `- 오늘의 ${label(row)}\n${Array.isArray(row.menu) ? row.menu.join("\n") : ""}`).join("\n\n")
      : "오늘의 급식 없습니다.";
  }
  if (answer.keyword === "시간표") {
    return `오늘의 시간표에요${rows.length ? `\n${rows.map((row) => `${String(row.time ?? "")}교시 : ${String(row.subject ?? "")}`).join("\n")}` : ""}`;
  }
  if (answer.keyword === "공지") {
    return rows.map((row) => `${String(row.userName ?? "")} 선생님이 공지를 작성하셨어요\n제목: ${String(row.title ?? "")}${String(row.content ?? "")}`).join("\n");
  }
  return raw;
}

import type { Meal, Schedule, Timetable, Workspace } from "@seugi/contracts";

type NeisRow = Record<string, string>;
type NeisPayload = Record<string, Array<{ row?: NeisRow[] }>>;

/** Minimal adapter for the public Korean NEIS Open API used by the Kotlin server. */
export class NeisClient {
  constructor(private readonly key = process.env.NEIS_API_KEY, private readonly fetcher = fetch) {}
  private school(workspace: Workspace) {
    if (!this.key) throw new Error("NEIS_API_KEY is not configured");
    if (!workspace.educationOfficeCode || !workspace.schoolCode) throw new Error("워크스페이스에 교육청 코드와 학교 코드가 필요합니다");
    return { KEY: this.key, Type: "json", pIndex: "1", pSize: "1000", ATPT_OFCDC_SC_CODE: workspace.educationOfficeCode, SD_SCHUL_CODE: workspace.schoolCode };
  }
  private async rows(endpoint: string, params: Record<string, string>) {
    const url = new URL(`https://open.neis.go.kr/hub/${endpoint}`); Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await this.fetcher(url); if (!response.ok) throw new Error(`NEIS 요청 실패 (${response.status})`);
    const data = await response.json() as NeisPayload; const section = data[endpoint]; return section?.flatMap((part) => part.row ?? []) ?? [];
  }
  async meals(workspace: Workspace, from: string, to: string): Promise<Meal[]> {
    const rows = await this.rows("mealServiceDietInfo", { ...this.school(workspace), MLSV_FROM_YMD: from, MLSV_TO_YMD: to });
    return rows.map((row) => ({ date: `${row.MLSV_YMD.slice(0, 4)}-${row.MLSV_YMD.slice(4, 6)}-${row.MLSV_YMD.slice(6, 8)}`, type: row.MMEAL_SC_NM, menu: (row.DDISH_NM ?? "").split("<br/>").map((item) => item.replace(/[0-9.]/g, "").trim()).filter(Boolean), calorie: row.CAL_INFO }));
  }
  async schedules(workspace: Workspace, year: number): Promise<Schedule[]> {
    const rows = await this.rows("SchoolSchedule", { ...this.school(workspace), AA_FROM_YMD: `${year}0101`, AA_TO_YMD: `${year}1231` });
    return rows.map((row) => ({ workspaceId: workspace.id, date: `${row.AA_YMD.slice(0, 4)}-${row.AA_YMD.slice(4, 6)}-${row.AA_YMD.slice(6, 8)}`, name: row.EVENT_NM }));
  }
  async timetables(workspace: Workspace, from: string, to: string): Promise<Timetable[]> {
    const kind = (workspace.schoolType ?? "").toUpperCase();
    const endpoint = /HIGH|고등/.test(kind) ? "hisTimetable" : /MIDDLE|MID|중학/.test(kind) ? "misTimetable" : /ELEMENTARY|ELEM|초등/.test(kind) ? "elsTimetable" : undefined;
    if (!endpoint) throw new Error("학교 유형을 시간표 조회에 사용할 수 없습니다");
    const rows = await this.rows(endpoint, { ...this.school(workspace), TI_FROM_YMD: from, TI_TO_YMD: to });
    return rows.filter((row) => row.ALL_TI_YMD && row.PERIO && row.ITRT_CNTNT).map((row) => ({ id: "", workspaceId: workspace.id, grade: row.GRADE ?? "", classNum: row.CLASS_NM ?? "", time: row.PERIO ?? "", subject: row.ITRT_CNTNT ?? "", date: `${row.ALL_TI_YMD!.slice(0, 4)}-${row.ALL_TI_YMD!.slice(4, 6)}-${row.ALL_TI_YMD!.slice(6, 8)}` }));
  }
}

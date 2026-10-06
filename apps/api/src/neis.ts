import type { Meal, Schedule, Workspace } from "@seugi/contracts";

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
}

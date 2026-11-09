import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateReportBody,
  CreateReportResponse,
  DeleteReportParams,
  ListReportsQueryParams,
  ListReportsResponse,
  UpdateReportBody,
  UpdateReportParams,
  UpdateReportResponse,
} from "@workspace/api-zod";
import { dailyReportsTable, db, projectsTable } from "@workspace/db";
import { isValidCalendarDate } from "../lib/validation";

const router: IRouter = Router();

function withProjectName() {
  return {
    id: dailyReportsTable.id,
    projectId: dailyReportsTable.projectId,
    projectName: projectsTable.name,
    reportDate: dailyReportsTable.reportDate,
    weather: dailyReportsTable.weather,
    workersCount: dailyReportsTable.workersCount,
    workPerformed: dailyReportsTable.workPerformed,
    issues: dailyReportsTable.issues,
    nextDayPlan: dailyReportsTable.nextDayPlan,
    createdAt: dailyReportsTable.createdAt,
  };
}

async function projectExists(projectId: number): Promise<boolean> {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  return Boolean(project);
}

router.get("/reports", async (req, res): Promise<void> => {
  const params = ListReportsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reports = await db
    .select(withProjectName())
    .from(dailyReportsTable)
    .innerJoin(projectsTable, eq(dailyReportsTable.projectId, projectsTable.id))
    .where(
      params.data.projectId
        ? eq(dailyReportsTable.projectId, params.data.projectId)
        : undefined,
    )
    .orderBy(desc(dailyReportsTable.reportDate), desc(dailyReportsTable.id));
  res.json(ListReportsResponse.parse(reports));
});

router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isValidCalendarDate(parsed.data.reportDate)) {
    res.status(400).json({ error: "Enter a valid report date." });
    return;
  }
  if (!(await projectExists(parsed.data.projectId))) {
    res.status(400).json({ error: "Choose an existing project." });
    return;
  }

  const [report] = await db
    .insert(dailyReportsTable)
    .values(parsed.data)
    .returning();
  const [withProject] = await db
    .select(withProjectName())
    .from(dailyReportsTable)
    .innerJoin(projectsTable, eq(dailyReportsTable.projectId, projectsTable.id))
    .where(eq(dailyReportsTable.id, report.id));
  res.status(201).json(CreateReportResponse.parse(withProject));
});

router.patch("/reports/:id", async (req, res): Promise<void> => {
  const params = UpdateReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReportBody.safeParse(req.body);
  if (!parsed.success || Object.keys(req.body ?? {}).length === 0) {
    res
      .status(400)
      .json({ error: parsed.success ? "Provide at least one field to update." : parsed.error.message });
    return;
  }
  if (
    parsed.data.reportDate !== undefined &&
    !isValidCalendarDate(parsed.data.reportDate)
  ) {
    res.status(400).json({ error: "Enter a valid report date." });
    return;
  }
  if (
    parsed.data.projectId !== undefined &&
    !(await projectExists(parsed.data.projectId))
  ) {
    res.status(400).json({ error: "Choose an existing project." });
    return;
  }

  const [updated] = await db
    .update(dailyReportsTable)
    .set(parsed.data)
    .where(eq(dailyReportsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Daily report not found." });
    return;
  }

  const [withProject] = await db
    .select(withProjectName())
    .from(dailyReportsTable)
    .innerJoin(projectsTable, eq(dailyReportsTable.projectId, projectsTable.id))
    .where(eq(dailyReportsTable.id, updated.id));
  res.json(UpdateReportResponse.parse(withProject));
});

router.delete("/reports/:id", async (req, res): Promise<void> => {
  const params = DeleteReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .delete(dailyReportsTable)
    .where(eq(dailyReportsTable.id, params.data.id))
    .returning({ id: dailyReportsTable.id });
  if (!report) {
    res.status(404).json({ error: "Daily report not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;

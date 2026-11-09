import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { dailyReportsTable, db, materialDeliveriesTable, projectsTable } from "@workspace/db";
import { kenyaDateParts } from "../lib/validation";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const { today, monthStart } = kenyaDateParts();

  const [projectCount] = await db
    .select({ total: count() })
    .from(projectsTable);
  const [activeProjects] = await db
    .select({ total: count() })
    .from(projectsTable)
    .where(eq(projectsTable.status, "active"));
  const [reportsToday] = await db
    .select({ total: count() })
    .from(dailyReportsTable)
    .where(eq(dailyReportsTable.reportDate, today));
  const workers = await db
    .select({ workersCount: dailyReportsTable.workersCount })
    .from(dailyReportsTable)
    .where(eq(dailyReportsTable.reportDate, today));
  const [materialsThisMonth] = await db
    .select({ total: count() })
    .from(materialDeliveriesTable)
    .where(
      and(
        gte(materialDeliveriesTable.deliveryDate, monthStart),
        lte(materialDeliveriesTable.deliveryDate, today),
      ),
    );
  const recentReports = await db
    .select({
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
    })
    .from(dailyReportsTable)
    .innerJoin(projectsTable, eq(dailyReportsTable.projectId, projectsTable.id))
    .orderBy(desc(dailyReportsTable.reportDate), desc(dailyReportsTable.id))
    .limit(5);

  res.json(
    GetDashboardResponse.parse({
      projectCount: projectCount?.total ?? 0,
      activeProjects: activeProjects?.total ?? 0,
      reportsToday: reportsToday?.total ?? 0,
      workersToday: workers.reduce((total, row) => total + row.workersCount, 0),
      materialsThisMonth: materialsThisMonth?.total ?? 0,
      recentReports,
    }),
  );
});

export default router;

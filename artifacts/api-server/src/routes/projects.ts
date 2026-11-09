import { count, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateProjectBody,
  CreateProjectResponse,
  DeleteProjectParams,
  ListProjectsResponse,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import {
  dailyReportsTable,
  db,
  materialDeliveriesTable,
  projectsTable,
} from "@workspace/db";
import { isValidCalendarDate } from "../lib/validation";

const router: IRouter = Router();

function validProjectDates(
  values: { startDate?: string | null; targetEndDate?: string | null },
): boolean {
  return [values.startDate, values.targetEndDate].every(
    (value) => value == null || isValidCalendarDate(value),
  );
}

router.get("/projects", async (_req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(projectsTable.createdAt);
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!validProjectDates(parsed.data)) {
    res.status(400).json({ error: "Enter valid start and target dates." });
    return;
  }

  const [project] = await db.insert(projectsTable).values(parsed.data).returning();
  res.status(201).json(CreateProjectResponse.parse(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success || Object.keys(req.body ?? {}).length === 0) {
    res
      .status(400)
      .json({ error: parsed.success ? "Provide at least one field to update." : parsed.error.message });
    return;
  }
  if (!validProjectDates(parsed.data)) {
    res.status(400).json({ error: "Enter valid start and target dates." });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  const [reportCount] = await db
    .select({ total: count() })
    .from(dailyReportsTable)
    .where(eq(dailyReportsTable.projectId, project.id));
  const [deliveryCount] = await db
    .select({ total: count() })
    .from(materialDeliveriesTable)
    .where(eq(materialDeliveriesTable.projectId, project.id));
  if ((reportCount?.total ?? 0) > 0 || (deliveryCount?.total ?? 0) > 0) {
    res.status(409).json({
      error: "This project has saved reports or deliveries. Remove those records first.",
    });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
  res.sendStatus(204);
});

export default router;

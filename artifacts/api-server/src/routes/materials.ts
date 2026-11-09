import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateMaterialBody,
  CreateMaterialResponse,
  DeleteMaterialParams,
  ListMaterialsQueryParams,
  ListMaterialsResponse,
  UpdateMaterialBody,
  UpdateMaterialParams,
  UpdateMaterialResponse,
} from "@workspace/api-zod";
import { db, materialDeliveriesTable, projectsTable } from "@workspace/db";
import { isValidCalendarDate } from "../lib/validation";

const router: IRouter = Router();

function withProjectName() {
  return {
    id: materialDeliveriesTable.id,
    projectId: materialDeliveriesTable.projectId,
    projectName: projectsTable.name,
    deliveryDate: materialDeliveriesTable.deliveryDate,
    materialName: materialDeliveriesTable.materialName,
    quantity: materialDeliveriesTable.quantity,
    unit: materialDeliveriesTable.unit,
    supplier: materialDeliveriesTable.supplier,
    unitCost: materialDeliveriesTable.unitCost,
    receivedBy: materialDeliveriesTable.receivedBy,
    deliveryNote: materialDeliveriesTable.deliveryNote,
    createdAt: materialDeliveriesTable.createdAt,
  };
}

async function projectExists(projectId: number): Promise<boolean> {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  return Boolean(project);
}

router.get("/materials", async (req, res): Promise<void> => {
  const params = ListMaterialsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deliveries = await db
    .select(withProjectName())
    .from(materialDeliveriesTable)
    .innerJoin(
      projectsTable,
      eq(materialDeliveriesTable.projectId, projectsTable.id),
    )
    .where(
      params.data.projectId
        ? eq(materialDeliveriesTable.projectId, params.data.projectId)
        : undefined,
    )
    .orderBy(
      desc(materialDeliveriesTable.deliveryDate),
      desc(materialDeliveriesTable.id),
    );
  res.json(ListMaterialsResponse.parse(deliveries));
});

router.post("/materials", async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!isValidCalendarDate(parsed.data.deliveryDate)) {
    res.status(400).json({ error: "Enter a valid delivery date." });
    return;
  }
  if (!(await projectExists(parsed.data.projectId))) {
    res.status(400).json({ error: "Choose an existing project." });
    return;
  }

  const [delivery] = await db
    .insert(materialDeliveriesTable)
    .values(parsed.data)
    .returning();
  const [withProject] = await db
    .select(withProjectName())
    .from(materialDeliveriesTable)
    .innerJoin(
      projectsTable,
      eq(materialDeliveriesTable.projectId, projectsTable.id),
    )
    .where(eq(materialDeliveriesTable.id, delivery.id));
  res.status(201).json(CreateMaterialResponse.parse(withProject));
});

router.patch("/materials/:id", async (req, res): Promise<void> => {
  const params = UpdateMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success || Object.keys(req.body ?? {}).length === 0) {
    res
      .status(400)
      .json({ error: parsed.success ? "Provide at least one field to update." : parsed.error.message });
    return;
  }
  if (
    parsed.data.deliveryDate !== undefined &&
    !isValidCalendarDate(parsed.data.deliveryDate)
  ) {
    res.status(400).json({ error: "Enter a valid delivery date." });
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
    .update(materialDeliveriesTable)
    .set(parsed.data)
    .where(eq(materialDeliveriesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Material delivery not found." });
    return;
  }

  const [withProject] = await db
    .select(withProjectName())
    .from(materialDeliveriesTable)
    .innerJoin(
      projectsTable,
      eq(materialDeliveriesTable.projectId, projectsTable.id),
    )
    .where(eq(materialDeliveriesTable.id, updated.id));
  res.json(UpdateMaterialResponse.parse(withProject));
});

router.delete("/materials/:id", async (req, res): Promise<void> => {
  const params = DeleteMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [delivery] = await db
    .delete(materialDeliveriesTable)
    .where(eq(materialDeliveriesTable.id, params.data.id))
    .returning({ id: materialDeliveriesTable.id });
  if (!delivery) {
    res.status(404).json({ error: "Material delivery not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;

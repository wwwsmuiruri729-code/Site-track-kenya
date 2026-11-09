import assert from "node:assert/strict";
import { test } from "node:test";

const apiBaseUrl = (
  process.env.SITE_API_BASE_URL ?? "http://localhost:80/api"
).replace(/\/+$/, "");
const testLabel = `Automated test ${new Date().toISOString()}`;

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${apiBaseUrl}. Start the API Server workflow and try again.`,
      { cause: error },
    );
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data };
}

async function expectStatus(method, path, expectedStatus, body) {
  const result = await request(method, path, body);
  assert.equal(
    result.status,
    expectedStatus,
    `${method} ${path} returned ${result.status}; expected ${expectedStatus}: ${JSON.stringify(result.data)}`,
  );
  return result.data;
}

function kenyaToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

test(
  "site records can be created, viewed, edited, and safely removed",
  { timeout: 60_000 },
  async (t) => {
    let projectId;
    let reportId;
    let materialId;
    const projectName = `${testLabel} project`;

    const step = async (description, action) => {
      await action();
      t.diagnostic(`PASS ${description}`);
    };

    const bestEffortDelete = async (path) => {
      try {
        const result = await request("DELETE", path);
        if (![204, 404].includes(result.status)) {
          t.diagnostic(
            `Cleanup warning: DELETE ${path} returned ${result.status}.`,
          );
        }
      } catch {
        t.diagnostic(`Cleanup warning: could not reach the API to delete ${path}.`);
      }
    };

    try {
      await step("API health check responds", async () => {
        const result = await expectStatus("GET", "/healthz", 200);
        assert.equal(result.status, "ok");
      });

      await step("invalid project details are rejected", async () => {
        const result = await expectStatus("POST", "/projects", 400, {
          name: "",
          client: "Test client",
        });
        assert.ok(result?.error);
      });

      await step("a project and its KSh budget are saved and listed", async () => {
        const project = await expectStatus("POST", "/projects", 201, {
          name: projectName,
          client: "Automated test client",
          location: "Nairobi",
          status: "active",
          budget: 1_500_000,
          progress: 0,
          startDate: null,
          targetEndDate: null,
        });
        projectId = project.id;
        assert.equal(project.name, projectName);
        assert.equal(project.budget, 1_500_000);

        const projects = await expectStatus("GET", "/projects", 200);
        assert.ok(projects.some((item) => item.id === projectId));
      });

      await step("project progress and budget can be edited", async () => {
        const project = await expectStatus(
          "PATCH",
          `/projects/${projectId}`,
          200,
          { progress: 35, budget: 1_600_000 },
        );
        assert.equal(project.progress, 35);
        assert.equal(project.budget, 1_600_000);
      });

      await step("invalid daily report details are rejected", async () => {
        const result = await expectStatus("POST", "/reports", 400, {
          projectId,
          reportDate: kenyaToday(),
          workersCount: -1,
          workPerformed: "Invalid worker count test",
        });
        assert.ok(result?.error);
      });

      await step("a daily report is saved, listed, and editable", async () => {
        const report = await expectStatus("POST", "/reports", 201, {
          projectId,
          reportDate: kenyaToday(),
          weather: "Sunny",
          workersCount: 12,
          workPerformed: `${testLabel}: foundation inspection completed`,
        });
        reportId = report.id;
        assert.equal(report.projectName, projectName);
        assert.equal(report.workersCount, 12);

        const reports = await expectStatus(
          "GET",
          `/reports?projectId=${projectId}`,
          200,
        );
        assert.ok(reports.some((item) => item.id === reportId));

        const edited = await expectStatus(
          "PATCH",
          `/reports/${reportId}`,
          200,
          { workersCount: 13, issues: "Automated test note" },
        );
        assert.equal(edited.workersCount, 13);
        assert.equal(edited.issues, "Automated test note");
      });

      await step("invalid material quantities are rejected", async () => {
        const result = await expectStatus("POST", "/materials", 400, {
          projectId,
          deliveryDate: kenyaToday(),
          materialName: "Test cement",
          quantity: 0,
          unit: "bags",
          supplier: "Test supplier",
        });
        assert.ok(result?.error);
      });

      await step("a material delivery is saved, listed, and editable", async () => {
        const material = await expectStatus("POST", "/materials", 201, {
          projectId,
          deliveryDate: kenyaToday(),
          materialName: `${testLabel} cement`,
          quantity: 50,
          unit: "bags",
          supplier: "Automated test supplier",
          unitCost: 620,
          receivedBy: "Test foreman",
        });
        materialId = material.id;
        assert.equal(material.projectName, projectName);
        assert.equal(material.unitCost, 620);

        const materials = await expectStatus(
          "GET",
          `/materials?projectId=${projectId}`,
          200,
        );
        assert.ok(materials.some((item) => item.id === materialId));

        const edited = await expectStatus(
          "PATCH",
          `/materials/${materialId}`,
          200,
          { quantity: 55, unitCost: 640 },
        );
        assert.equal(edited.quantity, 55);
        assert.equal(edited.unitCost, 640);
      });

      await step("the dashboard includes the new daily report", async () => {
        const dashboard = await expectStatus("GET", "/dashboard", 200);
        assert.ok(dashboard.recentReports.some((item) => item.id === reportId));
      });

      await step("a project with linked records cannot be deleted", async () => {
        const result = await expectStatus(
          "DELETE",
          `/projects/${projectId}`,
          409,
        );
        assert.ok(result?.error);
      });

      await step("test records can be deleted and leave no project behind", async () => {
        await expectStatus("DELETE", `/reports/${reportId}`, 204);
        reportId = undefined;
        await expectStatus("DELETE", `/materials/${materialId}`, 204);
        materialId = undefined;
        await expectStatus("DELETE", `/projects/${projectId}`, 204);
        projectId = undefined;

        const projects = await expectStatus("GET", "/projects", 200);
        assert.ok(!projects.some((item) => item.name === projectName));
      });
    } finally {
      if (reportId) await bestEffortDelete(`/reports/${reportId}`);
      if (materialId) await bestEffortDelete(`/materials/${materialId}`);
      if (projectId) await bestEffortDelete(`/projects/${projectId}`);
    }
  },
);

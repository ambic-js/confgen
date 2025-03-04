import { describe, it, expect } from "vitest"
import { Project } from "~/project"
import { MockSystem } from "~/system"

describe("presets/typescript", () => {
  it("should add a TypeScript watch task if the codespaces preset is chosen", async () => {
    const system = new MockSystem()
    const project = new Project({
      runtimes: ["lib"],
      presetConfigs: ["codespaces", "typescript"],
      system,
    })

    await project.confgen()

    expect(system.exists(".vscode/tasks.json")).toBe(true)
    const tasksJson = system.json(".vscode/tasks.json")
    expect(tasksJson.tasks).toHaveLength(1)
    expect(tasksJson).toMatchObject({
      tasks: [{ label: "TypeScript Watch" }],
    })
  })
})

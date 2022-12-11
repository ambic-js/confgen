import startCase from "lodash/startCase"
import { getGithubWorkflow } from "./githubActions"
import {
  readJson,
  type CommandGenerator,
  type CommandWithArgs,
  type System,
} from "~/commands"
import { formatHtml, formatTypescript } from "~/format"

export const generator: CommandGenerator = async ({ system, presets }) => {
  const packageJson = readJson<{ name: string | undefined }>(
    "package.json",
    system
  )

  const commands: CommandWithArgs[] = [
    {
      command: "yarn",
      pkg: "react-router-dom",
      dev: true,
    },
  ]

  if (presets.includes("githubActions")) {
    commands.push({
      command: "file",
      path: ".github/workflows/publish-docs.yml",
      contents: getWorkflow(packageJson.name),
      merge: "replace",
    })
  }

  if (packageJson.name !== "codedocs") {
    commands.push({
      command: "yarn",
      pkg: "codedocs",
      dev: true,
    })
  }

  if (!presets.includes("typescript")) {
    throw new Error(
      "The codedocs preset currently requires the typescript preset. If you'd like to use it with JavaScript please create a ticket at https://github.com/ambic-js/confgen/issues"
    )
  }

  const title = getTitle(system, packageJson.name)

  if (!system.exists("docs/index.tsx")) {
    commands.push({
      command: "file",
      path: "docs/index.tsx",
      contents: await getIndexTsx(title),
    })
  }

  if (!system.exists("docs/HomePage.docs.tsx")) {
    commands.push({
      command: "file",
      path: "docs/HomePage.docs.tsx",
      contents: await getHomeTsx(),
    })
  }

  if (!system.exists("docs/index.html")) {
    commands.push({
      command: "file",
      path: "docs/index.html",
      contents: await getIndexHtml(title),
    })
  }

  return commands
}

const getTitle = (system: System, packageName: string | undefined) => {
  const lines: string[] = []
  system.run(`basename "$PWD"`, lines)
  const folderName = lines[0]
  const rawName = packageName || folderName

  return startCase(rawName)
}

const getIndexTsx = async (title: string) =>
  await formatTypescript(`
  import { DocsApp } from "codedocs"
  import React from "react"
  import { render } from "react-dom"
  import * as HomePage from "./HomePage.docs"

  render(
    <DocsApp
      logo="${title}"
      docs={[HomePage]}
    />,
    document.getElementById("root")
  )
`)

const getHomeTsx = async () =>
  await formatTypescript(`
  import { Doc } from "codedocs"
  import React from "react"

  export default <Doc path="/">Welcome!</Doc>
`)

const getIndexHtml = async (title: string) =>
  await formatHtml(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="description" content="${title} Docs" />
        <title>${title} Docs</title>
      </head>

      <body>
        <div id="root"></div>
        <script type="module" src="./index.tsx"></script>
      </body>
    </html>
  `)

const getWorkflow = (
  packageName: string | undefined
): Record<string, unknown> => {
  const buildJob = {
    jobName: "build",
    steps: [
      {
        name: "Build Codedocs",
        run: "yarn build",
      },
      {
        name: "Build site",
        run: "yarn build:docs",
      },
    ],
  }

  const deployJob = {
    jobName: "deploy",
    jobOptions: {
      if: "${{ github.ref == 'refs/heads/main' }}",
      needs: ["build"],
      environment: {
        name: "github-pages",
        url: "${{ steps.deployment.outputs.page_url }}",
      },
    },
    steps: [
      {
        name: "Configure pages",
        uses: "actions/configure-pages@v2",
      },
      // In the very special case of Codedocs itself, the docs reference
      // the current version of the lib in the current branch, so we
      // need to build that before building the site. Most apps will
      // just import { ... } from "codedocs" so they don't need this
      // step:
      ...(packageName === "codedocs"
        ? [
            {
              name: "Build Codedocs",
              run: "yarn build",
            },
          ]
        : []),
      {
        name: "Build site",
        run: "yarn build:docs",
      },
      {
        name: "Upload artifact",
        if: "github.ref == 'refs/heads/main'",
        uses: "actions/upload-pages-artifact@v1",
        with: {
          path: "site",
        },
      },
      {
        name: "Deploy pages",
        if: "github.ref == 'refs/heads/main'",
        id: "deployment",
        uses: "actions/deploy-pages@v1",
      },
    ],
  }

  return getGithubWorkflow({
    needsPackages: true,
    workflowName: "docs site",
    workflowOptions: {
      permissions: {
        "contents": "read",
        "pages": "write",
        "id-token": "write",
      },
      concurrency: {
        "group": "pages",
        "cancel-in-progress": true,
      },
    },
    jobs: [buildJob, deployJob],
  })
}

import type { CommandGenerator, CommandWithArgs } from "~/commands"

export const generator: CommandGenerator = ({ presets }) => {
  const commands: CommandWithArgs[] = []

  if (presets.includes("codespaces")) {
    commands.push(
      {
        command: "file",
        path: ".devcontainer/Dockerfile",
        contents: `ARG VARIANT="18-buster"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-\${VARIANT}
`,
      },
      {
        command: "file",
        path: ".devcontainer/devcontainer.json",
        contents: {
          name: "Node.js",
          build: {
            dockerfile: "Dockerfile",
            args: {
              VARIANT: "18-buster",
            },
          },
          remoteUser: "node",
        },
      },
      {
        command: "file",
        path: ".vscode/extensions.json",
        contents: {
          unwantedRecommendations: ["ms-azuretools.vscode-docker"],
        },
      }
    )
  }

  return commands
}

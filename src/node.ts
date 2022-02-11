import { CommandGenerator } from "./types"

export const node: CommandGenerator = () => [
  {
    command: "file",
    path: ".devcontainer/Dockerfile",
    contents: `
      ARG VARIANT="16-bullseye"
      FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-\${VARIANT}
    `,
  },
  {
    command: "file",
    path: ".devcontainer/devcontainer.json",
    contents: {
      "name": "Node.js",
      "build": {
        "dockerfile": "Dockerfile",
        "args": {
          "VARIANT": "16-bullseye",
        },
      },
      "remoteUser": "node",
    },
  },
  {
    command: "file",
    path: ".vscode/extensions.json",
    contents: {
      "unwantedRecommendations": ["ms-azuretools.vscode-docker"],
    },
  },
]

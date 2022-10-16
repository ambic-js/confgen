import merge from "merge-objects"
import YAML from "yaml"
import { type System } from "@/system"
import { type PresetName } from "@/presets"
import { type Args } from "@/args"
import { dedupe } from "@/dedupe"
import type { Build } from "@/builds"

export type Builds = Build[]

export type { System } from "@/system"

export type { Args } from "@/args"

export type Command = "file" | "run" | "script" | "yarn"

export type FileCommand = {
  command: "file"
  path: string
  contents: string | string[] | Record<string, unknown>
  merge?: "if-not-exists" | "prefer-existing" | "prefer-preset"
}

export type RunCommand = {
  command: "run"
  script: string
}

export type ScriptCommand = {
  command: "script"
  name: string
  script: string
}

export type CommandWithArgs = { preset?: PresetName } & (
  | FileCommand
  | RunCommand
  | ScriptCommand
  | PackageCommand
)

export function isDistPackageCommand(
  command: CommandWithArgs
): command is DistPackageCommand {
  return command.command === "yarn" && !(command as DevPackageCommand).dev
}

export type DistPackageCommand = {
  command: "yarn"
  pkg: string
}

export type DevPackageCommand = DistPackageCommand & {
  dev: true
}

export type PackageCommand = DistPackageCommand | DevPackageCommand

export function isDevPackageCommand(
  command: CommandWithArgs
): command is DevPackageCommand {
  return command.command === "yarn" && (command as DevPackageCommand).dev
}

export type Presets = PresetName[]

export type CommandGenerator = (input: {
  builds: Build[]
  presets: Presets
  args: Args
  system: System
}) => CommandWithArgs[]

export type Precheck = (input: {
  presets: Presets
  args: Args
  system: System
}) => void

type FileChanges = string | string[] | Record<string, unknown>

const descriptions: Record<string, string> = {
  file: "Updating file",
  run: "Running command",
  script: "Updating script in package.json",
  yarn: "Adding package(s) to package.json",
  yarnDev: "Adding development package(s) to package.json",
}

export const runCommand = (command: CommandWithArgs, system: System) => {
  const descriptionKey = isDevPackageCommand(command)
    ? "yarnDev"
    : command.command

  const foo = command[Object.keys(command)[1] as keyof CommandWithArgs]
  system.silent ||
    console.log(`----------------------------------------
👷 ${descriptions[descriptionKey]}${
      command.preset ? ` for preset [${command.preset}]` : ""
    }...
   ${foo}`)

  // @ts-expect-error Typescript doesn't know that command.command narrows the type sufficiently here
  commands[command.command](command, system)
}

const commands = {
  file: ({ path, contents, merge }: FileCommand, system: System) => {
    if (merge === "if-not-exists" && system.exists(path)) return
    syncFile(path, contents, merge === "prefer-existing", system)
  },
  run: ({ script }: RunCommand, system: System) => {
    system.run(script)
  },
  script: ({ name, script }: ScriptCommand, system: System) => {
    amendJson(
      "package.json",
      {
        scripts: {
          [name]: script,
        },
      },
      false,
      system
    )
  },
  yarn: (command: PackageCommand, system: System) => {
    system.addPackage(command.pkg, isDevPackageCommand(command))
  },
} as const

const syncFile = (
  filename: string,
  changes: FileChanges,
  preferExisting: boolean,
  system: System
) => {
  if (/[.]ya?ml$/.test(filename)) {
    amendYaml(filename, changes, preferExisting, system)
  } else if (Array.isArray(changes)) {
    ensureLines(filename, changes, system)
  } else if (typeof changes === "string") {
    system.write(filename, changes)
  } else {
    amendJson(filename, changes, preferExisting, system)
  }
}

const ensureLines = (filename: string, newLines: string[], system: System) => {
  const originalContents = system.exists(filename) ? system.read(filename) : ""
  const lines = originalContents.split("\n")
  for (const line of newLines) {
    if (lines.includes(line)) continue
    lines.unshift(line)
  }
  system.write(filename, lines.join("\n"))
}

const amendJson = (
  filename: string,
  json: Record<string, unknown>,
  preferExisting: boolean,
  system: System
) => {
  const originalContents = system.exists(filename)
    ? system.read(filename)
    : "{}"
  const originalJson = JSON.parse(originalContents) as Record<string, unknown>
  const newJson = dedupe(
    preferExisting ? merge(json, originalJson) : merge(originalJson, json)
  )
  system.write(filename, JSON.stringify(newJson, null, 2))
}

const amendYaml = (
  filename: string,
  changes: FileChanges,
  preferExisting: boolean,
  system: System
) => {
  if (typeof changes === "string" || Array.isArray(changes)) {
    throw new Error(
      `Cannot amend YAML file ${filename} with a string or array. Contents must be an object.`
    )
  }

  const originalYaml = system.exists(filename)
    ? (YAML.parse(system.read(filename)) as Record<string, unknown>)
    : {}

  if (Array.isArray(originalYaml)) {
    throw new Error(
      `YAML file ${filename} is an array, but we only know how to sync objects`
    )
  }

  const newYaml = dedupe(
    preferExisting ? merge(changes, originalYaml) : merge(originalYaml, changes)
  )

  system.write(filename, YAML.stringify(newYaml))
}

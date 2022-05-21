export const PRESETS = [
  "all",
  "api",
  "bin",
  "codegen",
  "codespaces",
  "devServer",
  "macros",
  "eslint",
  "git",
  "library",
  "node",
  "prettier",
  "react",
  "sql",
  "typescript",
  "vite",
  "vitest",
  "yarn",
] as const

export type Preset = typeof PRESETS[number]

export const isPreset = (preset: string): preset is Preset => {
  return PRESETS.includes(preset as Preset)
}

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

export type CommandWithArgs = { preset?: Preset } & (
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

export type Args = Record<Preset, string[]>

export const EMPTY_ARGS = PRESETS.reduce(
  (argsByPresetName, preset) => ({
    ...argsByPresetName,
    [preset]: [],
  }),
  {} as Args
)

export type CommandGenerator = (
  presets: Preset[],
  args: Args
) => CommandWithArgs[]

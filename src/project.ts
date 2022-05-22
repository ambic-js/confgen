import { presets } from "./presets"
import {
  type Presets,
  DistPackageCommand,
  isDistPackageCommand,
  DevPackageCommand,
  isDevPackageCommand,
  type Args,
  EMPTY_ARGS,
  PRESETS,
  isPreset,
} from "./types"
import { runCommand } from "./commands"
import { RealSystem, type System } from "./system"

export class Project {
  system: System
  presetNames: Presets
  argsByPresetName: Args

  constructor({
    presetConfigs,
    system,
  }: {
    presetConfigs: string[]
    system?: System
  }) {
    this.system = system || new RealSystem()
    const { presetNames, argsByPresetName } = parsePresetConfigs(presetConfigs)
    this.presetNames = presetNames
    this.argsByPresetName = argsByPresetName
  }

  confgen() {
    const generatedCommands = []

    for (const presetName of this.presetNames) {
      this.system.silent ||
        console.log(`Generating commands for preset [${presetName}]...`)
      const generated = presets[presetName](
        this.presetNames,
        {
          ...EMPTY_ARGS,
          ...this.argsByPresetName,
        },
        this.system
      )
      generated.forEach((command) => (command.preset = presetName))
      generatedCommands.push(...generated)
    }

    const distPackageCommands =
      generatedCommands.filter<DistPackageCommand>(isDistPackageCommand)

    const devPackageCommands =
      generatedCommands.filter<DevPackageCommand>(isDevPackageCommand)

    const otherCommands = generatedCommands.filter(
      ({ command }) => command !== "yarn"
    )

    const distPackages = distPackageCommands.map(({ pkg }) => pkg).join(" ")
    if (distPackages) {
      runCommand({ command: "yarn", pkg: distPackages }, this.system)
    }

    const devPackages = devPackageCommands.map(({ pkg }) => pkg).join(" ")
    if (devPackages) {
      runCommand({ command: "yarn", pkg: devPackages, dev: true }, this.system)
    }

    for (const command of otherCommands) {
      runCommand(command, this.system)
    }
  }
}

const parsePresetConfigs = (
  configs: string[]
): { argsByPresetName: Args; presetNames: Presets } => {
  const argsByPresetName = {
    ...EMPTY_ARGS,
  }

  const presetNames = configs.map((config) => {
    const [presetName, ...presetArgs] = config.split(":")
    if (!isPreset(presetName)) {
      throw new Error(
        `${presetName} is not a valid preset.\n\nUsage:\nnpx confgen [${PRESETS.join(
          " | "
        )}]\n`
      )
    }
    argsByPresetName[presetName] = presetArgs
    return presetName
  })

  return { argsByPresetName, presetNames }
}

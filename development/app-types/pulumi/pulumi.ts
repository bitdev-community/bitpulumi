const { exec } = require("child_process");
import path from "path";
import type {
  AppContext,
  Application,
  ApplicationInstance,
  AppDeployContext,
  AppBuildContext,
} from "@teambit/application";

async function executeCommand(command: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, shell: '/bin/sh' }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command "${command}": ${error.message}\nStandard output: ${stdout}\nStandard error: ${stderr}`);
        return;
      }
      resolve(stdout + stderr);
    });
  });
}

async function installPulumi(): Promise<string> {
  console.log("Pulumi not found. Installing Pulumi...");

  try {
    console.log("Downloading Pulumi installation script using curl...");
    await executeCommand("curl -fsSL https://get.pulumi.com -o pulumi-install.sh");
  } catch (error) {
    console.log("curl failed, trying wget...");
    try {
      await executeCommand("wget -q https://get.pulumi.com -O pulumi-install.sh");
    } catch (error) {
      throw new Error(`Failed to download Pulumi installation script: ${error}`);
    }
  }

  try {
    console.log("Making the installation script executable...");
    await executeCommand("chmod +x pulumi-install.sh");
  } catch (error) {
    throw new Error(`Failed to make Pulumi installation script executable: ${error}`);
  }

  try {
    console.log("Running the Pulumi installation script...");
    await executeCommand("sh pulumi-install.sh");
    console.log("Pulumi installed successfully.");

    // Determine the installation path and return it
    const installDir = await executeCommand("sh -c 'echo $HOME/.pulumi/bin'");
    return installDir.trim();
  } catch (error) {
    throw new Error(`Failed to run Pulumi installation script: ${error}`);
  }
}

async function checkInstallRunPulumi(componentPath: string): Promise<void> {
  // Check for AWS environment variables
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set.");
  }

  // Check for Pulumi stack name environment variable
  const stackName = process.env.PULUMI_STACK_NAME;
  if (!stackName) {
    throw new Error("PULUMI_STACK_NAME environment variable must be set.");
  }

  // Check for Pulumi access token
  const pulumiAccessToken = process.env.PULUMI_ACCESS_TOKEN;
  if (!pulumiAccessToken) {
    throw new Error("PULUMI_ACCESS_TOKEN environment variable must be set.");
  }

  process.env.PULUMI_ACCESS_TOKEN = pulumiAccessToken;

  let pulumiBinDir;
  try {
    // Check if Pulumi is installed
    await executeCommand("pulumi version");
    console.log("Pulumi is already installed.");
    pulumiBinDir = path.dirname(await executeCommand("which pulumi"));
  } catch (error) {
    pulumiBinDir = await installPulumi();
  }

  // Ensure Pulumi bin directory is in PATH
  process.env.PATH = `${pulumiBinDir}:${process.env.PATH}`;

  try {
    // Set the default stack
    await executeCommand(`cd ${componentPath} && pulumi stack select ${stackName}`);
    console.log(`Selected Pulumi stack: ${stackName}`);

    // Run pulumi preview
    const previewOutput = await executeCommand(`cd ${componentPath} && pulumi preview`);
    console.log("Pulumi preview output:\n", previewOutput);

    // Run pulumi up
    const upOutput = await executeCommand(`cd ${componentPath} && pulumi up --yes`);
    console.log("Pulumi stack updated successfully.\n", upOutput);
  } catch (error) {
    console.error(`Failed to update Pulumi stack: ${error}`);
    throw new Error("Failed to update Pulumi stack.");
  }
}

async function getPulumiOutputs(componentPath: string) {
  try {
    const output = await executeCommand(`cd ${componentPath} && pulumi stack output --json`);
    return JSON.parse(output);
  } catch (error) {
    console.error(`Failed to get Pulumi stack outputs: ${error}`);
    throw new Error("Failed to get Pulumi stack outputs.");
  }
}

/**
 * Your custom component app using Bit.
 */
export class PulumiApp implements Application {
  /**
   * name of your app as recognized by Bit.
   */
  name = "pulumi-app";

  /**
   * runs your application in development mode.
   */
  async run(context: AppContext): Promise<ApplicationInstance> {
    // path to your isolated component root.
    const componentPath = context.hostRootDir;
    if (!componentPath) {
      throw new Error("Component path is undefined.");
    }
    await checkInstallRunPulumi(componentPath);
    return;
  }

  /**
   * builds your application. if needed besides component build.
   */
  async build(context: AppBuildContext) {
    // this is the component build path.
    const componentPath = context.capsule.path;
    if (!componentPath) {
      throw new Error("Component path is undefined.");
    }
    // your deployment function goes here
    return {};
  }

  /**
   * use this function to deploy your component to the chosen destination.
   */
  async deploy(context: AppDeployContext) {
    const componentPath = context.capsule.path;
    if (!componentPath) {
      throw new Error("Component path is undefined.");
    }
    await checkInstallRunPulumi(componentPath);
    const outputs = await getPulumiOutputs(componentPath);
    console.log("Pulumi outputs:\n", outputs);
    return outputs;
  }

  static from() {
    return new PulumiApp();
  }
}
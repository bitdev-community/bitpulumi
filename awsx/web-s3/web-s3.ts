import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "path";
import * as fs from "fs";
import * as mime from "mime"; // Import mime module to determine the content type
const { execSync } = require("child_process");

namespace bitpulumi {
  export namespace awsx {
    export class WebS3 {
      public bucket: aws.s3.Bucket;
      public cloudfrontDistribution: aws.cloudfront.Distribution;

      constructor(
        bucketName: string,
        webComponentPackage: string,
        artifactName?: string
      ) {
        pulumi.log.info("Creating S3 bucket...");
        this.bucket = this.createS3Bucket(bucketName);

        const webComponentRoot = this.getWebComponentRoot(webComponentPackage);
        const { webComponentId, componentScope, componentName } =
          this.getComponentId(webComponentRoot);

        const tmpDir = path.join(process.cwd(), "tmp");

        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir);
        } else {
          pulumi.log.info(`Directory already exists at ${tmpDir}`);
        }

        this.downloadWebAppArtifacts(webComponentId, tmpDir);

        const artifactsDir = this.getDistDirPath(
          tmpDir,
          componentScope,
          componentName,
          artifactName
        );

        this.createS3ObjectsForArtifacts(artifactsDir, artifactsDir);

        const oai = this.createOriginAccessIdentity(bucketName);

        this.createS3BucketPolicy(
          bucketName,
          this.bucket.id,
          this.bucket.arn,
          oai.iamArn
        );

        this.createCloudFrontDistribution(
          bucketName,
          this.bucket.bucketRegionalDomainName,
          this.bucket.id,
          oai.cloudfrontAccessIdentityPath
        );
        pulumi.log.info("CloudFront distribution created.");
      }

      private createS3Bucket(bucketName: string): aws.s3.Bucket {
        return new aws.s3.Bucket(bucketName, {
          acl: "private",
          corsRules: [
            {
              allowedHeaders: ["*"],
              allowedMethods: ["GET", "HEAD"],
              allowedOrigins: ["*"],
              exposeHeaders: ["ETag"],
              maxAgeSeconds: 3000,
            },
          ],
        });
      }

      private getWebComponentRoot(webComponentPackageName: string): string {
        return path.dirname(path.dirname(webComponentPackageName));
      }

      private getComponentId(webComponentRoot: string): {
        webComponentId: string;
        componentScope: string;
        componentName: string;
      } {
        const packageJsonPath = path.join(webComponentRoot, "package.json");
        const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
        const packageJson = JSON.parse(packageJsonContent);
        const componentIdObj = packageJson.componentId;
        const componentScope = componentIdObj.scope;
        const componentName = componentIdObj.name;
        const webComponentId = `${componentScope}/${componentName}`;
        return { webComponentId, componentScope, componentName };
      }

      private getDistDirPath(
        artifactsRoot: string,
        componentScope: string,
        componentName: string,
        artifactName?: string
      ): string {
        return path.resolve(
          artifactsRoot,
          `${componentScope}_${componentName}${path.sep}artifacts${
            artifactName ? path.sep + artifactName : ""
          }`
        );
      }

      private downloadWebAppArtifacts(
        webComponentId: string,
        artifactsDownloadPath: string
      ): void {
        try {
          try {
            const output = execSync(`bit init`, { stdio: 'inherit' });
            pulumi.log.info(`Created a workspace and imported the component ${webComponentId}`, output.toString());
          } catch (error) {
            pulumi.log.info('Already inside a workspace');
          }
          const artifactsCommand = `bit import ${webComponentId} && bit import ${webComponentId} --objects && bit artifacts ${webComponentId} --aspect teambit.harmony/application --out-dir ${artifactsDownloadPath}${path.sep}`;
          execSync(artifactsCommand, { encoding: "utf-8" });
          pulumi.log.info(`Downloaded artifacts for ${webComponentId}`);
        } catch (error) {
          pulumi.log.error(`Error executing command: ${error.message}`);
        }
      }

      private isDirectoryExists(dirPath: string): boolean {
        return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
      }

      private createOriginAccessIdentity(
        bucketName: string
      ): aws.cloudfront.OriginAccessIdentity {
        return new aws.cloudfront.OriginAccessIdentity(`${bucketName}-oai`, {});
      }

      private createS3BucketPolicy(
        bucketName: string,
        bucketId: pulumi.Output<string>,
        bucketArn: pulumi.Output<string>,
        iamArn: pulumi.Output<string>
      ): void {
        new aws.s3.BucketPolicy(`${bucketName}-policy`, {
          bucket: bucketId,
          policy: pulumi
            .all([bucketArn, iamArn])
            .apply(([bucketArn, iamArn]) => {
              const policy = JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      AWS: iamArn,
                    },
                    Action: ["s3:GetObject"],
                    Resource: `${bucketArn}/*`,
                  },
                ],
              });
              return policy;
            }),
        });
      }

      private createCloudFrontDistribution(
        bucketName: string,
        bucketRegionalDomainName: pulumi.Output<string>,
        bucketId: pulumi.Output<string>,
        cloudfrontAccessIdentityPath: pulumi.Output<string>
      ): void {
        this.cloudfrontDistribution = new aws.cloudfront.Distribution(
          `${bucketName}-cdn`,
          {
            origins: [
              {
                domainName: bucketRegionalDomainName,
                originId: bucketId,
                s3OriginConfig: {
                  originAccessIdentity: cloudfrontAccessIdentityPath,
                },
              },
            ],
            enabled: true,
            isIpv6Enabled: true,
            defaultRootObject: "index.html",
            defaultCacheBehavior: {
              targetOriginId: bucketId,
              viewerProtocolPolicy: "redirect-to-https",
              allowedMethods: ["GET", "HEAD", "OPTIONS"],
              cachedMethods: ["GET", "HEAD"],
              forwardedValues: {
                queryString: true,
                cookies: {
                  forward: "none",
                },
                headers: ["Origin"],
              },
              minTtl: 0,
              defaultTtl: 0, //  defaultTtl: 3600,
              maxTtl: 0, // maxTtl: 86400,
              compress: true, // Enable compression
            },
            customErrorResponses: [
              {
                errorCode: 404,
                responsePagePath: "/index.html",
                responseCode: 200,
                errorCachingMinTtl: 300,
              },
            ],
            priceClass: "PriceClass_100",
            restrictions: {
              geoRestriction: {
                restrictionType: "none",
              },
            },
            viewerCertificate: {
              cloudfrontDefaultCertificate: true,
            },
          }
        );
        pulumi.log.info(
          `CloudFront distribution created with ID: ${this.cloudfrontDistribution.id}`
        );
      }

      private getContentType(file: string): string {
        let contentType = mime.getType(file) || "application/octet-stream";
        if (
          file.endsWith(".js") ||
          file.endsWith(".ts") ||
          file.endsWith(".tsx")
        ) {
          contentType = "text/javascript";
        }
        return contentType;
      }

      private createS3ObjectsForArtifacts(
        baseDir: string,
        artifactsDir: string
      ): void {
        const files = fs.readdirSync(artifactsDir);

        files.forEach((file) => {
          const filePath = path.join(artifactsDir, file);
          if (fs.lstatSync(filePath).isDirectory()) {
            this.createS3ObjectsForArtifacts(baseDir, filePath);
          } else {
            const relativeFilePath = path.relative(baseDir, filePath);
            const contentType = this.getContentType(file);
            new aws.s3.BucketObject(relativeFilePath, {
              bucket: this.bucket,
              source: new pulumi.asset.FileAsset(filePath),
              key: relativeFilePath,
              contentType: contentType, // Set the Content-Type metadata
            });
          }
        });
      }
    }
  }
}

export default bitpulumi;

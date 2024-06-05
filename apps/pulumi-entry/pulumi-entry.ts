import * as pulumi from "@pulumi/pulumi";
import { apiRoutes } from "@bitpulumi/awsdemo.api-gateway";
import bitpulumi from "@bitpulumi/awsx.web-s3";

const API_NAME = "api";

const apiRouteInstance = apiRoutes(API_NAME);

const WEB_BUCKET_NAME = "web-bucket";

const webBucketInstance = new bitpulumi.awsx.WebS3(
  WEB_BUCKET_NAME,
  require.resolve("@bitpulumi/apps.vite-app")
);

/* Pulumi stack exports */
export const bucketName = webBucketInstance.bucket.id.apply(name => name) as pulumi.Output<string>;

export const cloudfrontUrl = webBucketInstance.cloudfrontDistribution.domainName.apply(
  (domainName) => `https://${domainName}`
) as pulumi.Output<string>;

export const apiUrl = apiRouteInstance.url.apply(
  (url) => `${url}api/hello`
) as pulumi.Output<string>;

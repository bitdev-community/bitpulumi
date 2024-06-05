import * as apigateway from "@pulumi/aws-apigateway";
import bitpulumi from "@bitpulumi/awsx.lambda";

export function apiRoutes(endpointName: string) {
  const api = new apigateway.RestAPI(endpointName, {
    routes: [
      {
        path: "/api/hello",
        method: "GET",
        eventHandler: new bitpulumi.awsx.Lambda(
          "hello-lambda",
          require.resolve("@bitpulumi/awsdemo.services.hello-service"),
          {
            environment: {
              variables: { DATE_TYPE: "Today" }, // Optional environment variables
            },
          }
        ),
      },
    ],
  });
  return api;
}

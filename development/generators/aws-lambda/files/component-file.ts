import { ComponentContext } from '@teambit/generator';

export const componentFile = (context: ComponentContext) => {
  const { name, namePascalCase: Name } = context;

  return {
    relativePath: `${name}.tsx`,
    content: `import { APIGatewayProxyHandler } from 'aws-lambda';

    export const handler: APIGatewayProxyHandler = async () => {
      const message = "success!";
    
      return {
        statusCode: 200,
        body: JSON.stringify({ message }),
      };
    };    
`,
  };
};

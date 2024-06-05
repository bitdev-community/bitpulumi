import { ComponentContext } from '@teambit/generator';

export const testFile = (context: ComponentContext) => {
  const { name, namePascalCase: Name } = context;

  return {
    relativePath: name + '.spec.ts',
    content: `import { APIGatewayProxyHandler } from 'aws-lambda';
    import { handler } from './handler';
    
    describe('Lambda Handler', () => {
      it('should return a 200 status code and success message', async () => {
        // Mock event, context, and callback
        const event = {} as any;
        const context = {} as any;
        const callback = () => {};
    
        // Call the handler
        const result = await handler(event, context, callback);
    
        // Parse the body to check the message
        const body = JSON.parse(result.body);
    
        // Assertions
        expect(result.statusCode).toBe(200);
        expect(body.message).toBe('success!');
      });
    });    
`,
  };
};

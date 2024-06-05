import {
  ComponentContext,
  ComponentFile,
  ComponentTemplate,
} from '@teambit/generator';
import { indexFile } from './files/index-file';
import { componentFile } from './files/component-file';
import { testFile } from './files/test-file';

export type AwsLambdaComponentTemplateOptions = {
  /**
   * name of the template
   */
  name?: string;

  /**
   * description of the template.
   */
  description?: string;

  /**
   * hide the template from the templates command.
   */
  hidden?: boolean;
};

export class AwsLambdaComponentTemplate implements ComponentTemplate {
  constructor(
    readonly name = 'aws-lambda',
    readonly description = 'a template for aws-lambda components',
    readonly hidden = false
  ) {}

  generateFiles(context: ComponentContext): ComponentFile[] {
    return [
      indexFile(context),
      compositionFile(context),
      componentFile(context),
      testFile(context),
    ];
  }

  /**
   * define the generated component configuration
   **/
  config = {
    'bitpulumi.development/envs/lambda-env': {},
    'teambit.envs/envs': {
      env: 'bitpulumi.development/envs/lambda-env',
    },
  };

  static from(options: AwsLambdaComponentTemplateOptions = {}) {
    return () =>
      new AwsLambdaComponentTemplate(
        options.name,
        options.description,
        options.hidden
      );
  }
}

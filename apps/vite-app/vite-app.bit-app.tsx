import { ViteReact } from '@bitdev/react.app-types.vite-react';

export default ViteReact.from({
  /**
   * name of your app.
   */
  name: 'vite-app',

  /**
   * determine whether to use ssr mode or not.
   */
  ssr: false,

  /**
   * peer dependencies to alias from the app component dependencies.
   * ensures a single instance for the dependency across the app graph.
   */
  // peers: [
  //   'react',
  //   'react-dom',
  //   'react-router-dom',
  //   'graphql',
  //   '@apollo/client'
  // ],

  /**
   * vite config for the browser target.
   * if config is empty or doesn't include
   * plugins,
   */
  // viteConfigPath: 'vite.config.js'

  /**
   * vite config for the node target.
   */
  // viteServerBuildConfigPath: 'vite-server.config.js',

  /**
   * configure port range for the dev server to use.
   */
  // portRange: [3000, 3200]

  /**
   * configure the server app root filename.
   * defaults to: `server.app-root`
   */
  // serverRoot: 'server.app-root',

  /**
   * name of the bit artifact of persist.
   * this later can be fetched, and used for deployment and execution.
   */
  artifactName: '',

  /**
   * pipeline for deployment of the app.
   */
  // deploy: (context) => {},
});

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

import { post } from './schemaTypes/post'
import { loadTestTool } from './src/load-test-tool'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'ppsg7ml5'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'watt'

export default defineConfig({
  name: 'default',
  title: 'Gateway dedup POC',
  projectId,
  dataset,
  plugins: [structureTool(), loadTestTool()],
  schema: {
    types: [post],
  },
})

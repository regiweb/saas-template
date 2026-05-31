import Fastify from 'fastify'

const app = Fastify({ logger: true })
const PORT = process.env.NODE_PORT || 3000

app.get('/health', async () => ({
  status: 'ok',
  service: 'node',
  version: '0.1.0'
}))

await app.listen({ port: PORT, host: '0.0.0.0' })

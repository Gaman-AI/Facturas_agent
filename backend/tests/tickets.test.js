import request from 'supertest'
import { app } from '../src/app.js'
import ticketsService from '../src/services/ticketsService.js'

jest.mock('../src/services/supabase.js', () => ({
  __esModule: true,
  default: {
    verifyToken: jest.fn().mockResolvedValue({ user: { id: 'test-user', email: 'test@example.com' }, error: null })
  }
}))

// Helper to set auth header
const auth = { Authorization: 'Bearer testtoken' }

jest.spyOn(ticketsService, 'createTicket')
jest.spyOn(ticketsService, 'getTicket')
jest.spyOn(ticketsService, 'listTickets')
jest.spyOn(ticketsService, 'deleteTicket')

describe('Tickets Routes', () => {
  test('POST /api/v1/tickets/upload without file returns 400', async () => {
    const res = await request(app).post('/api/v1/tickets/upload').set(auth)
    expect(res.status).toBe(400)
  })

  test('GET /api/v1/tickets/:id/status returns 404 for missing', async () => {
    ticketsService.getTicket.mockReturnValue(null)
    const res = await request(app).get('/api/v1/tickets/nonexistent/status').set(auth)
    expect(res.status).toBe(404)
  })

  test('GET /api/v1/tickets returns list', async () => {
    ticketsService.listTickets.mockReturnValue({ tickets: [], pagination: { page: 1, limit: 10, total: 0, total_pages: 1, has_next: false, has_prev: false } })
    const res = await request(app).get('/api/v1/tickets?page=1&limit=10&status=all&sort=created_at&order=desc').set(auth)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
}) 
import request from 'supertest'
import { app } from '../src/app.js'
import * as ocrService from '../src/services/ocrAzureService.js'

// Mock the analyzeInvoiceAzure function
jest.spyOn(ocrService, 'analyzeInvoiceAzure')

describe('OCR Routes', () => {
  test('GET /api/v1/ocr/health returns success', async () => {
    const res = await request(app).get('/api/v1/ocr/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.module).toBe('ocr')
  })

  test('POST /api/v1/ocr/azure without file returns 400', async () => {
    const res = await request(app).post('/api/v1/ocr/azure')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('POST /api/v1/ocr/azure with file returns data when service ok', async () => {
    ocrService.analyzeInvoiceAzure.mockResolvedValue({ ok: true, data: { invoice_id: 'X123', total: 100 } })

    const res = await request(app)
      .post('/api/v1/ocr/azure')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'test.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.invoice_id).toBe('X123')
  })

  test('POST /api/v1/ocr/azure propagates error from service', async () => {
    ocrService.analyzeInvoiceAzure.mockResolvedValue({ ok: false, error: 'Some azure error' })

    const res = await request(app)
      .post('/api/v1/ocr/azure')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'test.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(502)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/azure/i)
  })
}) 
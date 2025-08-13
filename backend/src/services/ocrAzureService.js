import axios from 'axios'
import config from '../config/index.js'

const { endpoint, apiKey, modelId, apiVersion } = config.azure.documentIntelligence

// RFC regex for Mexico
const RFC_REGEX = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/

/**
 * Analyze invoice using Azure Document Intelligence
 * @param {Buffer} fileBuffer - File bytes
 * @param {string} contentType - MIME type, e.g. application/pdf, image/png, image/jpeg
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>} Parsed result
 */
export async function analyzeInvoiceAzure(fileBuffer, contentType = 'application/pdf') {
  if (!endpoint || !apiKey) {
    return { ok: false, error: 'Azure Document Intelligence not configured' }
  }

  // Azure REST API - Analyze Document
  // 1) POST to begin analyze -> returns operation-location
  // 2) Poll GET until status == succeeded/failed
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/${encodeURIComponent(modelId)}:analyze?api-version=${encodeURIComponent(apiVersion)}`

  try {
    const startRes = await axios.post(
      analyzeUrl,
      fileBuffer,
      {
        headers: {
          'Content-Type': contentType,
          'Ocp-Apim-Subscription-Key': apiKey
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    )

    const operationLocation = startRes.headers['operation-location'] || startRes.headers['Operation-Location']
    if (!operationLocation) {
      return { ok: false, error: 'Missing operation-location header from Azure response' }
    }

    // Poll for result
    const maxAttempts = 30
    const delayMs = 1000

    let attempt = 0
    while (attempt < maxAttempts) {
      // eslint-disable-next-line no-await-in-loop
      const pollRes = await axios.get(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      })

      const status = pollRes.data.status
      if (status === 'succeeded') {
        return parseAzureResult(pollRes.data)
      }
      if (status === 'failed') {
        return { ok: false, error: `Azure analysis failed: ${JSON.stringify(pollRes.data.error || {})}` }
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, delayMs))
      attempt += 1
    }

    return { ok: false, error: 'Timeout waiting for Azure analysis result' }
  } catch (error) {
    const message = error?.response?.data ? JSON.stringify(error.response.data) : (error.message || 'Azure analysis error')
    return { ok: false, error: message }
  }
}

function parseAzureResult(resultJson) {
  try {
    const documents = resultJson?.analyzeResult?.documents || []
    if (!documents.length) {
      return { ok: false, error: 'No documents found in Azure result' }
    }

    const doc = documents[0]
    const fields = doc.fields || {}

    const safe = (key) => {
      const v = fields[key]
      return v && (v.value || v.content || v.text || v.valueString || v.valueDate || v.valueNumber) ? (v.value ?? v.content ?? v.text ?? v.valueString ?? v.valueDate ?? v.valueNumber) : null
    }

    const data = {
      vendor_name: safe('VendorName'),
      vendor_address: safe('VendorAddress'),
      customer_name: safe('CustomerName'),
      invoice_id: safe('InvoiceId'),
      invoice_date: safe('InvoiceDate'),
      subtotal: safe('SubTotal'),
      total_tax: safe('TotalTax'),
      total: safe('InvoiceTotal'),
      due_date: safe('DueDate')
    }

    // Try RFC via fields content
    for (const key of Object.keys(fields)) {
      const candidate = fields[key]
      const text = candidate?.content || candidate?.value || candidate?.text
      if (typeof text === 'string') {
        const match = text.match(RFC_REGEX)
        if (match) {
          data.rfc = match[1]
          break
        }
      }
    }

    // Also scan key-value pairs or lines if provided
    const paragraphs = resultJson?.analyzeResult?.content?.split('\n') || []
    if (!data.rfc && paragraphs.length) {
      for (const line of paragraphs) {
        const match = line.match(RFC_REGEX)
        if (match) {
          data.rfc = match[1]
          break
        }
      }
    }

    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: 'Failed to parse Azure result' }
  }
}

export default { analyzeInvoiceAzure } 
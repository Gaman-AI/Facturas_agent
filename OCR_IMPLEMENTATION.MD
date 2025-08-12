**Azure Document Intelligence** (formerly Form Recognizer) is an excellent, scalable solution for your use case.

For **Mexican vendor receipts/invoices**, Azure's `prebuilt-invoice` model or `custom-trained models` (for more control) can extract key fields including:

- **RFC (Mexican Tax ID)**
- **Invoice total / subtotal / IVA**
- **Vendor information, line items, dates, etc.**

---

## ✅ Recommended Setup: Azure Document Intelligence for OCR Extraction

### 📦 Prerequisites

1. Azure subscription
2. Resource: **Document Intelligence**
3. Required credentials:
    - `endpoint` (e.g., `https://<your-resource>.cognitiveservices.azure.com/`)
    - `key` (primary or secondary key)

---

## 🔧 Sample Backend Integration (Python + Azure SDK)

Install SDK:

```bash
pip install azure-ai-documentintelligence
```

### 🔑 Environment Variables (recommended for security)

```bash
# .env
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://&lt;your-resource&gt;.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=&lt;your-key&gt;
```

### 📄 Code: `ocr_azure.py`

```python
import os
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

endpoint = os.getenv("AZURE_DOC_INTELLIGENCE_ENDPOINT")
key = os.getenv("AZURE_DOC_INTELLIGENCE_KEY")
client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))

def analyze_invoice(file_bytes: bytes, content_type: str = "application/pdf") -&gt; dict:
    poller = client.begin_analyze_document(
        model_id="prebuilt-invoice",  # For invoices. Use "prebuilt-receipt" for POS receipts
        document=file_bytes,
        content_type=content_type,
    )
    result = poller.result()

    data = {}
    if not result.documents:
        return {"ok": False, "error": "No documents found"}

    doc = result.documents[0]

    fields = doc.fields
    def safe_get(field):
        return fields[field].value if field in fields and fields[field].value else None

    data = {
        "vendor_name": safe_get("VendorName"),
        "vendor_address": safe_get("VendorAddress"),
        "customer_name": safe_get("CustomerName"),
        "invoice_id": safe_get("InvoiceId"),
        "invoice_date": safe_get("InvoiceDate"),
        "subtotal": safe_get("SubTotal"),
        "total_tax": safe_get("TotalTax"),
        "total": safe_get("InvoiceTotal"),
        "due_date": safe_get("DueDate"),
    }

    # Custom logic: Try to extract RFC from all fields using regex
    import re
    rfc_pattern = r"\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b"
    for kv in doc.fields.values():
        if kv.content:
            match = re.search(rfc_pattern, kv.content)
            if match:
                data["rfc"] = match.group(1)
                break

    return {"ok": True, "data": data}
```

---

## 🔌 Example Flask Route

```python
# ocr_routes.py
from flask import Blueprint, request, jsonify
from ocr_azure import analyze_invoice

ocr_bp = Blueprint("ocr", __name__)

@ocr_bp.route("/ocr/azure", methods=["POST"])
def azure_ocr():
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "No file uploaded"})

    f = request.files["file"]
    bytes_data = f.read()
    content_type = f.content_type or "application/pdf"

    try:
        result = analyze_invoice(bytes_data, content_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
```

---

## 🧠 What if Azure misses the RFC or account number?

You can combine **Azure's structured extraction with fallback regex** for custom values:

```python
if not rfc_found:
    for kv in all_fields_or_lines:
        match = re.search(rfc_pattern, kv)
        if match:
            rfc_found = match.group(1)
```

---

## 📸 Optional: Use Custom Trained Model for Mexican Layouts

If `prebuilt-invoice` doesn't handle specific vendor formats:

- Upload samples (5–10 PDFs)
- Train a custom model in [Azure AI Studio](https://ai.azure.com/portal/ai-studio/)
- Replace `model_id="prebuilt-invoice"` with `model_id="<your-trained-model-id>"`

---

## 🔄 Frontend Integration

Simply `POST` your file from the frontend:

```tsx
const formData = new FormData();
formData.append("file", yourFile);
const res = await fetch("/ocr/azure", {
  method: "POST",
  body: formData,
});
const json = await res.json();
console.log("OCR Result", json);
```

---

## ✅ Summary

| Task | Tool / Method |
| --- | --- |
| OCR + Entity extraction | Azure`prebuilt-invoice`model |
| RFC / Account fallback | Regex (post-process fields) |
| Scale to new layouts | Azure Custom Model (train w/ 5–10) |
| Frontend integration | Simple file upload → API call |

---

Would you like:

- A **Dockerized Flask app** with this setup?
- A **custom model training walkthrough** for your top 3 vendors?
- A **Next.js React component** to upload and preview the result?
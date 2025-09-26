Looking at your implementation and the Azure Document Intelligence Studio code, I can see you've built a sophisticated confidence scoring system, but there's a fundamental disconnect between what Azure provides natively and what you're trying to achieve. Let me break down the situation and provide a clear path forward.

## Understanding the Core Challenge

The Azure Document Intelligence Studio code you've shown is quite basic - it simply retrieves and displays the confidence scores that Azure's prebuilt models already calculate internally. When you see `merchant_name.confidence` in the Azure code, that's a confidence score Azure has already computed based on its neural network's internal certainty about that specific field extraction.

Your current implementation attempts to create a composite confidence scoring system by combining multiple validation methods - Azure's native confidence, pattern matching, vendor-specific rules, word-level OCR confidence, and AI extraction confidence. While this is creative and thorough, it's adding complexity that may not align with your goal of replicating Azure's behavior.

## Key Issues with Current Implementation

Looking at your `ConfidenceCalculator` class, I can identify several areas where the implementation diverges from what would give you Azure-like confidence scores:

1. **Over-engineering the confidence calculation**: You're creating weighted averages from multiple sources when Azure's confidence is already a comprehensive metric based on the model's neural network certainty.

2. **Missing Azure's native field confidence**: While you're extracting some Azure confidence values, you're not systematically capturing all the confidence scores that Azure provides for every extracted field.

3. **Pattern validation vs. extraction confidence**: Your pattern matching (like checking if a date follows DD/MM/YYYY format) validates the format but doesn't reflect the OCR's confidence in reading those specific characters correctly.

## Proposed Solution Architecture

Here's how we should restructure your approach to better align with Azure Document Intelligence Studio's behavior:

### Phase 1: Direct Azure Confidence Extraction
First, we need to systematically extract ALL confidence scores that Azure provides:

```python
def extract_azure_native_confidence(receipt_result, read_result):
    """
    Extract all native confidence scores from Azure Document Intelligence.
    This mirrors what Azure Studio shows in its interface.
    """
    confidence_data = {}
    
    # Extract receipt model field confidences
    if receipt_result and hasattr(receipt_result, 'documents'):
        for document in receipt_result.documents:
            if hasattr(document, 'fields'):
                for field_name, field_obj in document.fields.items():
                    # Get the confidence score if it exists
                    if hasattr(field_obj, 'confidence'):
                        confidence_data[field_name] = {
                            'value': field_obj.value_string if hasattr(field_obj, 'value_string') else 
                                    field_obj.value_date if hasattr(field_obj, 'value_date') else
                                    field_obj.value_currency.amount if hasattr(field_obj, 'value_currency') else None,
                            'confidence': field_obj.confidence,
                            'type': field_obj.type if hasattr(field_obj, 'type') else 'unknown'
                        }
                    
                    # Handle nested fields (like Items in receipts)
                    if hasattr(field_obj, 'value_array'):
                        for idx, item in enumerate(field_obj.value_array):
                            if hasattr(item, 'value_object'):
                                for sub_field_name, sub_field in item.value_object.items():
                                    if hasattr(sub_field, 'confidence'):
                                        key = f"{field_name}[{idx}].{sub_field_name}"
                                        confidence_data[key] = {
                                            'value': sub_field.value_string if hasattr(sub_field, 'value_string') else None,
                                            'confidence': sub_field.confidence
                                        }
    
    return confidence_data
```

### Phase 2: Custom Field Extraction with Azure-Style Confidence

For fields that Azure doesn't directly extract (like your vendor-specific fields), we need to calculate confidence based on how well the OCR read the text in that region:

```python
def calculate_extraction_confidence(extracted_value, word_confidences, read_result):
    """
    Calculate Azure-style confidence for custom extracted fields.
    This uses the underlying OCR confidence of the words that make up the extracted value.
    """
    if not extracted_value or extracted_value == "N/A":
        return 0.0
    
    # Find the bounding box region where this value appears
    value_words = extracted_value.lower().split()
    matching_word_confidences = []
    
    # Search through the read result to find where these words appear
    if read_result and hasattr(read_result, 'pages'):
        for page in read_result.pages:
            if hasattr(page, 'lines'):
                for line in page.lines:
                    line_text = line.content.lower()
                    # Check if our extracted value appears in this line
                    if any(word in line_text for word in value_words):
                        # Get the confidence of words in this line
                        if hasattr(line, 'words'):
                            for word in line.words:
                                if word.content.lower() in value_words:
                                    if hasattr(word, 'confidence'):
                                        matching_word_confidences.append(word.confidence)
    
    # Calculate average confidence of the words that make up our extracted value
    if matching_word_confidences:
        return sum(matching_word_confidences) / len(matching_word_confidences)
    
    # If we couldn't find the words, return a low confidence
    return 0.3
```

### Phase 3: Unified Confidence Scoring System

Instead of your complex weighted system, let's create a simpler, more Azure-aligned approach:

```python
class AzureAlignedConfidenceScorer:
    """
    A confidence scorer that mimics Azure Document Intelligence Studio's approach.
    """
    
    def __init__(self):
        self.azure_native_confidences = {}
        self.custom_field_confidences = {}
        
    def add_azure_native_field(self, field_name, value, confidence):
        """Add a field that Azure natively extracted with its confidence."""
        self.azure_native_confidences[field_name] = {
            'value': value,
            'confidence': confidence,
            'source': 'azure_native'
        }
    
    def add_custom_extracted_field(self, field_name, value, ocr_confidence, validation_boost=0.0):
        """
        Add a field we extracted ourselves with OCR-based confidence.
        
        Args:
            field_name: Name of the field
            value: Extracted value
            ocr_confidence: Confidence based on OCR word recognition
            validation_boost: Additional confidence if the value passes validation rules (-0.2 to 0.2)
        """
        # Combine OCR confidence with validation boost
        final_confidence = max(0.0, min(1.0, ocr_confidence + validation_boost))
        
        self.custom_field_confidences[field_name] = {
            'value': value,
            'confidence': final_confidence,
            'source': 'custom_extraction'
        }
    
    def get_field_confidence(self, field_name):
        """Get the confidence for a specific field, preferring Azure native when available."""
        # Prefer Azure's native confidence if available
        if field_name in self.azure_native_confidences:
            return self.azure_native_confidences[field_name]['confidence']
        
        # Otherwise use our custom extraction confidence
        if field_name in self.custom_field_confidences:
            return self.custom_field_confidences[field_name]['confidence']
        
        # Field not found
        return 0.0
    
    def get_confidence_report(self):
        """Generate a confidence report similar to Azure Studio's output."""
        report = {
            'azure_extracted_fields': {},
            'custom_extracted_fields': {},
            'overall_confidence': 0.0
        }
        
        # Add Azure native fields
        for field_name, field_data in self.azure_native_confidences.items():
            report['azure_extracted_fields'][field_name] = {
                'value': field_data['value'],
                'confidence': round(field_data['confidence'] * 100, 2)  # Convert to percentage
            }
        
        # Add custom extracted fields
        for field_name, field_data in self.custom_field_confidences.items():
            report['custom_extracted_fields'][field_name] = {
                'value': field_data['value'],
                'confidence': round(field_data['confidence'] * 100, 2)
            }
        
        # Calculate overall document confidence
        all_confidences = []
        all_confidences.extend([f['confidence'] for f in self.azure_native_confidences.values()])
        all_confidences.extend([f['confidence'] for f in self.custom_field_confidences.values()])
        
        if all_confidences:
            report['overall_confidence'] = round(sum(all_confidences) / len(all_confidences) * 100, 2)
        
        return report
```

## Implementation Plan

Here's our step-by-step plan to achieve your goal:

### Step 1: Simplify Confidence Extraction 
- Remove the complex `ConfidenceCalculator` class
- Implement `AzureAlignedConfidenceScorer` that focuses on Azure's native confidence scores
- Create clear separation between Azure-extracted fields and custom-extracted fields

### Step 2: Enhance Azure Field Coverage 
- Ensure we're capturing ALL fields that Azure's receipt model can extract
- Map these directly to your required CFDI fields where possible
- Store Azure's confidence scores without modification

### Step 3: Improve Custom Field Extraction 
- For fields Azure doesn't extract (vendor-specific IDs, folios), calculate confidence based on:
  - OCR word-level confidence from the read model
  - Simple validation boost (format correctness adds 0.1, vendor match adds 0.05)
  - Position on receipt (fields at bottom get slight confidence reduction)

### Step 4: Create Fallback Hierarchy 
- Primary: Use Azure's prebuilt receipt fields with their native confidence
- Secondary: Use Azure's read model with custom extraction + OCR confidence
- Tertiary: Use LLM extraction with fixed lower confidence (0.6-0.7 range)

### Step 5: Testing and Calibration 
- Test with diverse ticket types (OXXO, Walmart, Costco, generic)
- Compare confidence scores with Azure Studio's output
- Adjust only the validation boosts, not the core OCR confidence

## Next Immediate Actions

1. **Refactor the confidence system** to use the simpler `AzureAlignedConfidenceScorer`
2. **Map all Azure receipt fields** to ensure we're not missing any native extractions
3. **Create a testing framework** that compares your output with Azure Studio's confidence scores

The key insight here is that Azure's confidence scores are already comprehensive - they represent the neural network's certainty about character recognition and field extraction. Rather than trying to create a complex multi-source confidence system, we should primarily rely on Azure's native confidence and only supplement it where absolutely necessary for custom fields.

Would you like me to help you implement any specific part of this plan first? I'd suggest starting with the simplified confidence scorer, as that will immediately make your system more aligned with Azure Studio's behavior.
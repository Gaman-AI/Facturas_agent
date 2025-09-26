# Azure-Aligned Confidence Scorer Implementation Guide

## Overview

The `AzureAlignedConfidenceScorer` class provides confidence scoring for ticket field extraction that aligns with Azure Document Intelligence Studio's methodologies. It evaluates both Azure's native field extractions and custom field extractions, providing comprehensive confidence scores for all ticket fields.

## Key Features

### 1. **Azure-Native Confidence Integration**
- Directly extracts confidence scores from Azure Document Intelligence's receipt and read models
- Preserves Azure's neural network-based confidence calculations
- Handles nested fields and complex document structures

### 2. **Custom Field Confidence Calculation**
- OCR word-level confidence analysis for custom extracted fields
- Pattern-based validation boosting
- Field-type specific confidence adjustments

### 3. **Comprehensive Confidence Reporting**
- Overall document confidence calculation
- Field-level confidence breakdown
- Confidence distribution analysis
- Multiple confidence sources tracking

## Implementation Architecture

### Core Classes

#### `FieldConfidence`
```python
@dataclass
class FieldConfidence:
    field_name: str
    value: str
    confidence: float
    source: str  # 'azure_native', 'custom_extraction', 'pattern_validation'
    level: ConfidenceLevel  # HIGH, MEDIUM, LOW, UNKNOWN
    validation_boosts: List[str]
    ocr_word_confidences: List[float]
```

#### `DocumentConfidenceReport`
```python
@dataclass
class DocumentConfidenceReport:
    overall_confidence: float
    total_fields: int
    high_confidence_fields: int
    medium_confidence_fields: int
    low_confidence_fields: int
    field_confidences: Dict[str, FieldConfidence]
    confidence_sources: int
```

#### `AzureAlignedConfidenceScorer`
The main class that handles confidence scoring for all ticket fields.

## Usage Examples

### Basic Usage

```python
from azure_aligned_confidence_scorer import AzureAlignedConfidenceScorer

# Initialize the scorer
scorer = AzureAlignedConfidenceScorer()

# Add Azure native fields (from Azure Document Intelligence results)
scorer.add_azure_native_field("MerchantName", "WALMART SUPERCENTER", 0.95)
scorer.add_azure_native_field("Total", 299.99, 0.87)

# Add custom extracted fields
scorer.add_custom_extracted_field("TC#", "12345678901234567890", 0.75, 0.1, "ticket_number")
scorer.add_custom_extracted_field("Card_Last_4_Digits", "1234", 0.85, 0.15, "card_digits")

# Generate confidence report
report = scorer.generate_confidence_report()
print(f"Overall confidence: {report.overall_confidence:.2f}")
```

### Complete Ticket Processing

```python
from ocr_functionality_with_confidence import extract_receipt_data_with_confidence

# Process an image with confidence scoring
result = extract_receipt_data_with_confidence("path/to/receipt.jpg")

# Access confidence scores
overall_confidence = result['overall_document_confidence']
total_confidence = result['Total_Confidence']
merchant_confidence = result['Comercio_Confidence']

print(f"Document confidence: {overall_confidence}%")
print(f"Total amount confidence: {total_confidence}%")
```

### Integration with Existing Code

The confidence scorer is designed to be a drop-in enhancement for your existing OCR pipeline:

```python
# In run_ocr.py - automatically uses confidence scoring
from ocr_functionality_with_confidence import extract_receipt_data_with_confidence

result = extract_receipt_data_with_confidence(image_path)
# Result now includes confidence scores for all fields
```

## Confidence Scoring Methodology

### 1. **Azure Native Fields** (Highest Priority)
- Uses Azure's neural network confidence scores directly
- No modification of Azure's confidence calculations
- Covers: MerchantName, TransactionDate, Total, Items, etc.

### 2. **Custom Extracted Fields** (Secondary Priority)
- **Base Confidence**: OCR word-level confidence from Azure's read model
- **Validation Boost**: Pattern matching and format validation (+0.05 to +0.2)
- **Field-Type Adjustments**: Specialized validation for dates, amounts, ticket numbers, etc.

### 3. **Confidence Levels**
- **HIGH** (80-100%): Reliable for automation
- **MEDIUM** (50-79%): May require validation
- **LOW** (0-49%): Requires human review

### 4. **Validation Boosting**

#### Date Fields
- DD/MM/YYYY format: +0.1 boost
- Length validation: +0.05 boost

#### Amount Fields
- Decimal format validation: +0.05 boost
- Currency symbol recognition: +0.05 boost

#### Ticket Numbers
- Length validation (12+ digits): +0.05 boost
- Pattern recognition: +0.1 boost

#### Card Digits
- Exactly 4 digits: +0.15 boost

## Field Mapping and Support

### Supported Field Types

| Field Type | Azure Native | Custom Extraction | Validation Patterns |
|------------|--------------|-------------------|-------------------|
| Merchant Name | ✅ MerchantName | ✅ Comercio | Text validation |
| Transaction Date | ✅ TransactionDate | ✅ Fecha | Date format patterns |
| Total Amount | ✅ Total | ✅ Total | Numeric/currency patterns |
| Ticket ID | ❌ | ✅ ID_Ticket | Long number patterns |
| Folio | ❌ | ✅ Mesa_Folio | Alphanumeric patterns |
| Store Info | ❌ | ✅ Store_Branch_Plaza | Text validation |
| Register Info | ❌ | ✅ Register_Station_Terminal | Alphanumeric patterns |
| Payment Type | ❌ | ✅ Payment_Type | Keyword matching |
| Card Digits | ❌ | ✅ Card_Last_4_Digits | 4-digit validation |

### Vendor-Specific Mappings

#### Walmart
- TC# → ID_Ticket
- TR# → Mesa_Folio

#### OXXO
- ID → ID_Ticket
- Fol_Vta → Mesa_Folio

#### Costco
- ID → ID_Ticket (long ticket number)
- Fol_Vta → Mesa_Folio (secondary folio)

## Configuration and Customization

### Field Mappings
```python
scorer.field_mappings = {
    'merchant_name': ['Comercio', 'comercio', 'MerchantName'],
    'transaction_date': ['Fecha', 'fecha', 'TransactionDate'],
    'total_amount': ['Total', 'total'],
    # Add custom mappings as needed
}
```

### Validation Patterns
```python
scorer.validation_patterns = {
    'date': [r'\d{2}/\d{2}/\d{4}', r'\d{4}-\d{2}-\d{2}'],
    'amount': [r'^\d+\.?\d*$', r'^\$?\d+\.?\d*$'],
    # Add custom patterns as needed
}
```

## Integration with Frontend

### Confidence Display
The frontend `DashboardDualPane.tsx` already supports confidence display:

```typescript
// Confidence scores are automatically included in the API response
interface TicketData {
  'Comercio_Confidence'?: number
  'Fecha_Confidence'?: number
  'Total_Confidence'?: number
  'overall_document_confidence'?: number
  'total_confidence_sources'?: number
}
```

### Visual Confidence Indicators
- **Green dot**: High confidence (80%+)
- **Yellow dot**: Medium confidence (50-79%)
- **Red dot**: Low confidence (0-49%)
- **Progress bar**: Visual confidence representation

## Testing and Validation

### Run the Test Suite
```bash
cd backend
python test_confidence_scorer.py
```

### Test Components
1. **Basic Functionality**: Core scorer operations
2. **Sample Data Scoring**: Realistic ticket data processing
3. **Field Validation**: Pattern matching and boosting
4. **Real Image Processing**: End-to-end testing with actual receipts

## Performance Considerations

### Optimization Tips
1. **Caching**: Cache confidence calculations for repeated processing
2. **Batch Processing**: Process multiple fields together
3. **Selective Scoring**: Skip confidence calculation for fields with high Azure native confidence

### Memory Usage
- Minimal memory overhead (~50KB per document)
- Efficient data structures using dataclasses
- Automatic cleanup of temporary data

## Troubleshooting

### Common Issues

#### Import Errors
```python
# Ensure proper path setup
sys.path.insert(0, str(Path(__file__).parent))
from azure_aligned_confidence_scorer import AzureAlignedConfidenceScorer
```

#### Low Confidence Scores
- Check OCR quality of input images
- Verify field validation patterns
- Review Azure API response structure

#### Missing Confidence Data
- Ensure Azure Document Intelligence results are passed correctly
- Check field name mappings
- Verify read model results contain word-level confidence

### Debug Logging
Enable detailed logging by checking stderr output:
```python
# Confidence scorer logs to stderr with [CONFIDENCE] prefix
print(f"[CONFIDENCE] Debug message", file=sys.stderr)
```

## Best Practices

### 1. **Confidence Thresholds**
- **Automation**: >= 80% confidence
- **Review Required**: 50-79% confidence  
- **Manual Processing**: < 50% confidence

### 2. **Human-in-the-Loop**
- Flag low-confidence fields for manual review
- Implement feedback loops to improve confidence over time
- Use confidence scores to prioritize review queues

### 3. **Quality Assurance**
- Monitor confidence score distributions
- Track confidence accuracy over time
- Adjust validation patterns based on real-world data

### 4. **Integration**
- Always include confidence scores in API responses
- Display confidence visually in the UI
- Use confidence for automated decision-making

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**: Train custom confidence models
2. **Historical Analysis**: Track confidence trends over time
3. **Advanced Validation**: Context-aware field validation
4. **Multi-Language Support**: Confidence scoring for non-English receipts

### Extension Points
- Custom validation pattern plugins
- Vendor-specific confidence adjustments
- Integration with other OCR providers
- Real-time confidence monitoring

## Support and Maintenance

### Version Compatibility
- Compatible with Azure Document Intelligence API v4.0+
- Requires Python 3.8+
- Tested with OpenAI GPT-3.5-turbo and GPT-4

### Updates and Patches
- Regular updates to validation patterns
- Azure API compatibility maintenance
- Performance optimizations based on usage patterns

For questions or issues, refer to the test suite and documentation, or review the implementation details in the source code.

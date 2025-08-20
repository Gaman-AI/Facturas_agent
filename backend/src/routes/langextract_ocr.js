const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'), false);
        }
    }
});

/**
 * @route POST /api/v1/ocr/langextract
 * @desc Process document with LangExtract OCR
 * @access Private
 */
router.post('/langextract', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FILE',
                    message: 'No file uploaded'
                }
            });
        }

        console.log(`[LANGEXTRACT-API] Processing file: ${req.file.filename}`);

        // Call Python script for LangExtract processing
        const pythonScript = path.join(__dirname, '../services/langextract_processor.py');
        const imagePath = req.file.path;

        const result = await runLangExtractProcessing(pythonScript, imagePath);

        // Clean up uploaded file
        fs.unlinkSync(imagePath);

        res.json({
            success: true,
            data: {
                processing_method: 'langextract',
                result: result,
                file_processed: req.file.originalname,
                processing_time: result.processing_time || 0
            }
        });

    } catch (error) {
        console.error('[LANGEXTRACT-API] Error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'PROCESSING_ERROR',
                message: 'Error processing document with LangExtract',
                details: error.message
            }
        });
    }
});

/**
 * @route POST /api/v1/ocr/hybrid
 * @desc Process document with hybrid OCR (Azure + LangExtract)
 * @access Private
 */
router.post('/hybrid', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FILE',
                    message: 'No file uploaded'
                }
            });
        }

        console.log(`[HYBRID-API] Processing file: ${req.file.filename}`);

        // Call Python script for hybrid processing
        const pythonScript = path.join(__dirname, '../services/hybrid_processor.py');
        const imagePath = req.file.path;

        const result = await runHybridProcessing(pythonScript, imagePath);

        // Clean up uploaded file
        fs.unlinkSync(imagePath);

        res.json({
            success: true,
            data: {
                processing_method: 'hybrid',
                result: result,
                file_processed: req.file.originalname,
                processing_time: result.processing_time || 0
            }
        });

    } catch (error) {
        console.error('[HYBRID-API] Error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'PROCESSING_ERROR',
                message: 'Error processing document with hybrid OCR',
                details: error.message
            }
        });
    }
});

/**
 * @route GET /api/v1/ocr/status
 * @desc Get OCR service status
 * @access Private
 */
router.get('/status', async (req, res) => {
    try {
        const pythonScript = path.join(__dirname, '../services/ocr_status.py');
        const status = await runStatusCheck(pythonScript);

        res.json({
            success: true,
            data: {
                services: status,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[OCR-STATUS-API] Error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'STATUS_CHECK_ERROR',
                message: 'Error checking OCR service status',
                details: error.message
            }
        });
    }
});

/**
 * @route POST /api/v1/ocr/visualize
 * @desc Create visualization for processed document
 * @access Private
 */
router.post('/visualize', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FILE',
                    message: 'No file uploaded'
                }
            });
        }

        console.log(`[VISUALIZE-API] Creating visualization for: ${req.file.filename}`);

        // Call Python script for visualization
        const pythonScript = path.join(__dirname, '../services/visualization_processor.py');
        const imagePath = req.file.path;

        const result = await runVisualizationProcessing(pythonScript, imagePath);

        // Clean up uploaded file
        fs.unlinkSync(imagePath);

        res.json({
            success: true,
            data: {
                visualization_url: result.visualization_path,
                result: result,
                file_processed: req.file.originalname
            }
        });

    } catch (error) {
        console.error('[VISUALIZE-API] Error:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: {
                code: 'VISUALIZATION_ERROR',
                message: 'Error creating visualization',
                details: error.message
            }
        });
    }
});

// Helper functions to run Python scripts
function runLangExtractProcessing(scriptPath, imagePath) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const pythonProcess = spawn('python', [scriptPath, imagePath]);
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            const processingTime = Date.now() - startTime;
            
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    result.processing_time = processingTime;
                    resolve(result);
                } catch (parseError) {
                    reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}

function runHybridProcessing(scriptPath, imagePath) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const pythonProcess = spawn('python', [scriptPath, imagePath]);
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            const processingTime = Date.now() - startTime;
            
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    result.processing_time = processingTime;
                    resolve(result);
                } catch (parseError) {
                    reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}

function runStatusCheck(scriptPath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath]);
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (parseError) {
                    reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}

function runVisualizationProcessing(scriptPath, imagePath) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [scriptPath, imagePath]);
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (parseError) {
                    reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                }
            } else {
                reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}

module.exports = router; 
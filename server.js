const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueId + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

// Document Types
const DOCUMENT_TYPES = [
    "Rental Agreement",
    "NDA (Non-Disclosure Agreement)",
    "Court Order",
    "Employment Contract",
    "Sale Deed",
    "Power of Attorney",
    "Other Legal Document"
];

// Extract text from different file types
async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    try {
        if (ext === '.pdf') {
            return await extractTextFromPDF(filePath);
        } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            return await extractTextFromImage(filePath);
        } else if (ext === '.docx') {
            return await extractTextFromDocx(filePath);
        } else {
            throw new Error(`Unsupported file format: ${ext}`);
        }
    } catch (error) {
        throw new Error(`Error extracting text: ${error.message}`);
    }
}

async function extractTextFromPDF(filePath) {
    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extract(filePath);
    let text = '';
    data.pages.forEach(page => {
        page.content.forEach(item => {
            if (item.str) text += item.str + ' ';
        });
    });
    return text.trim();
}

async function extractTextFromImage(filePath) {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng+hin+tam+tel+ben+mar+guj+kan+mal+ori+pan+asm', {
        logger: m => console.log(m) // Optional: Log Tesseract progress
    });
    return text.trim();
}

async function extractTextFromDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
}

async function detectDocumentType(text) {
    try {
        const docTypesList = DOCUMENT_TYPES.map(type => `- ${type}`).join('\n');
        const prompt = `
        Analyze the following legal document text and classify it into one of these types:
        ${docTypesList}
        
        Return ONLY the document type name, nothing else.
        
        Document Text:
        ${text.slice(0, 10000)}
        `;
        
        const result = await model.generateContent(prompt);
        const detectedType = result.response.text().trim();
        console.log(`Gemini Response (Document Type): ${detectedType}`);
        return detectedType;
    } catch (error) {
        console.error(`AI document type detection failed: ${error.message}`);
        return "Unknown Document Type";
    }
}

async function detectLanguage(text) {
    try {
        const prompt = `
        Analyze the following text and identify its primary language.
        Focus on common Indian languages like Hindi, Tamil, Telugu, etc.
        Return the language code (e.g., 'en' for English, 'hi' for Hindi, 'ta' for Tamil) and the full language name in parentheses (e.g., 'en (English)').
        If unsure, return 'unknown (Unknown)'.
        
        Text:
        ${text.slice(0, 5000)}
        `;
        
        const result = await model.generateContent(prompt);
        const detectedLang = result.response.text().trim();
        console.log(`Gemini Response (Language): ${detectedLang}`);
        return detectedLang;
    } catch (error) {
        console.error(`AI language detection failed: ${error.message}`);
        return "unknown (Unknown)";
    }
}

async function analyzeDocument(text, languageCode = "en") {
    const prompt = `
    You are a legal AI assistant. Analyze the following legal document and identify key clauses.
    Highlight:
    - Risky Clauses (⚠️)
    - Safe Clauses (✅)
    - Critical Clauses (❗)
    
    Provide explanations in the language corresponding to the language code '${languageCode}' (e.g., 'en' for English, 'hi' for Hindi, 'ta' for Tamil).
    If the language code is 'unknown', default to English.
    Keep the explanations simple and clear.
    
    Document Text:
    ${text.slice(0, 10000)}
    `;
    
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return `Analysis failed: ${error.message}`;
    }
}

// Process Document Route
app.post('/process-document', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
        // Step 1: Extract text
        const text = await extractText(filePath);
        if (!text) {
            throw new Error('No text could be extracted from the document');
        }

        // Step 2: Detect language
        const language = await detectLanguage(text);
        const [languageCode, languageName] = language.includes(' (') 
            ? language.split(' (') 
            : [language, 'Unknown'];
        const cleanedLanguageName = languageName.replace(')', '');

        // Step 3: Detect document type
        const docType = await detectDocumentType(text);

        // Step 4: Analyze the document
        const analysis = await analyzeDocument(text, languageCode);

        // Clean up: Remove the temporary file
        fs.unlinkSync(filePath);

        // Send response
        res.json({
            status: 'success',
            type: docType,
            language_code: languageCode,
            language_name: cleanedLanguageName,
            text: text,
            analysis: analysis,
            file_name: fileName,
            message: `Document processed and analyzed successfully. Type: ${docType}, Language: ${cleanedLanguageName}`
        });
    } catch (error) {
        // Clean up in case of error
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
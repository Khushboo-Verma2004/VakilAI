const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const Tesseract = require('tesseract.js');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdf = require('html-pdf'); 
require('dotenv').config();

// Initialize Express app
const app = express();
const port = 3000;

// PDF generation options (moved up with other configurations)
const pdfOptions = {
  format: 'A4',
  orientation: 'portrait',
  border: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in'
  },
  timeout: 60000 
};

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

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
    limits: { fileSize: 10 * 1024 * 1024 }, 
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
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found in environment variables');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    systemInstruction: {
      role: "system",
      content: "You are VakilAI, a legal assistant specializing in Indian law. Provide accurate, concise analysis with IPC references where applicable."
    },
    temperature: 0.3
});

const DOCUMENT_TYPES = [
    "Rental Agreement",
    "NDA (Non-Disclosure Agreement)",
    "Court Order",
    "Employment Contract",
    "Sale Deed",
    "Power of Attorney",
    "Other Legal Document"
];

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
        logger: m => console.log(m) /
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

async function generateDocumentSummary(text, languageCode = "en") {
    const prompt = `
    You are a legal AI assistant. Analyze the following legal document and generate a concise summary in the language corresponding to the language code '${languageCode}' (e.g., 'en' for English, 'hi' for Hindi, 'ta' for Tamil). If the language code is 'unknown', default to English.

    The summary should include:
    - Overall Risk: High/Medium/Low (mention the number of risky clauses and unfair terms, if any)
    - Key Issues: A bullet list of 3-5 key issues or risky clauses
    - Tenant Responsibilities: A short description of responsibilities imposed on the tenant (if applicable)

    Format the summary as follows:
    OVERALL RISK: [High/Medium/Low] ([X risky clauses, Y unfair terms])
    KEY ISSUES:
    - [Issue 1]
    - [Issue 2]
    - [Issue 3]
    TENANT RESPONSIBLE FOR: [Description of tenant responsibilities]

    Document Text:
    ${text.slice(0, 10000)}
    `;

    try {
        const result = await model.generateContent(prompt);
        const summary = result.response.text();
        console.log(`Generated Summary (${languageCode}):`, summary);
        return summary;
    } catch (error) {
        console.error(`Summary generation failed for language ${languageCode}: ${error.message}`);
        throw new Error(`Failed to generate summary: ${error.message}`);
    }
}

app.post('/process-document', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
        const text = await extractText(filePath);
        if (!text) {
            throw new Error('No text could be extracted from the document');
        }

        const language = await detectLanguage(text);
        const [languageCode, languageName] = language.includes(' (') 
            ? language.split(' (') 
            : [language, 'Unknown'];
        const cleanedLanguageName = languageName.replace(')', '');

        const docType = await detectDocumentType(text);
        const analysis = await analyzeDocument(text, languageCode);
        const summary = await generateDocumentSummary(text, languageCode);

        fs.unlinkSync(filePath);

        res.json({
            status: 'success',
            type: docType,
            language_code: languageCode,
            language_name: cleanedLanguageName,
            text: text,
            analysis: analysis,
            summary: summary,
            file_name: fileName,
            message: `Document processed and analyzed successfully. Type: ${docType}, Language: ${cleanedLanguageName}`
        });
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/generate-summary', express.json(), async (req, res) => {
    const { text, languageCode } = req.body;
    if (!text || !languageCode) {
        return res.status(400).json({ error: 'Missing required fields: text and languageCode are required' });
    }

    try {
        const summary = await generateDocumentSummary(text, languageCode);
        res.status(200).json({ summary });
    } catch (error) {
        res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
    }
});

app.post('/generate-pdf', express.json(), async (req, res) => {
    try {
        const { analysis, summary, documentType, language } = req.body;
        
        if (!analysis || !summary) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Missing required fields: analysis and summary are required'
            });
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>VakilAI Legal Analysis</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; }
                .header { color: #4a6fa5; text-align: center; margin-bottom: 20px; }
                .section { margin-bottom: 25px; }
                h1 { font-size: 22px; }
                h2 { font-size: 18px; color: #166088; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .danger { color: #d64045; font-weight: bold; }
                .warning { color: #ff9f1c; }
                .safe { color: #2e933c; }
                pre { 
                    white-space: pre-wrap; 
                    background: #f8f9fa; 
                    padding: 15px; 
                    border-radius: 5px;
                    border-left: 4px solid #4a6fa5;
                }
                .footer { 
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>VakilAI Legal Document Analysis Report</h1>
            </div>
            
            <div class="section">
                <h2>Document Information</h2>
                <p><strong>Type:</strong> ${documentType || 'Not specified'}</p>
                <p><strong>Language:</strong> ${language || 'Not detected'}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
                <h2>Detailed Analysis</h2>
                <pre>${analysis}</pre>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <pre>${summary}</pre>
            </div>
            
            <div class="footer">
                <p>Generated by VakilAI - AI-Powered Legal Assistant</p>
            </div>
        </body>
        </html>
        `;

        pdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
            if (err) {
                console.error('PDF Generation Error:', err);
                return res.status(500).json({ 
                    status: 'error',
                    message: 'Failed to generate PDF document',
                    error: err.message 
                });
            }
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="vakilai-legal-analysis.pdf"');
            res.setHeader('Content-Length', buffer.length);
            res.send(buffer);
        });

    } catch (error) {
        console.error('PDF Endpoint Error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Internal server error during PDF generation',
            error: error.message 
        });
    }
});
app.post('/chatbot-query', express.json(), async (req, res) => {
    try {
        const { question, documentText, history } = req.body;
        
        const prompt = `
        You are VakilAI, a legal assistant chatbot. The user has uploaded a document with the following content:
        ${documentText.slice(0, 10000)}  // Limit context size
        
        Conversation history:
        ${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
        
        Current question: ${question}
        
        Provide a concise, helpful answer based on the document content and conversation history.
        Focus on legal aspects and be precise with your answers.
        If you reference specific clauses, mention their section numbers if available.
        `;

        const result = await model.generateContent(prompt);
        const answer = result.response.text();
        
        res.json({ answer });
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ error: 'Failed to process chatbot query' });
    }
});
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadContainer = document.getElementById('upload-container');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('file-info');
    const analysisContainer = document.getElementById('analysis-container');
    const documentTypeDisplay = document.getElementById('document-type');
    const documentPreview = document.getElementById('document-preview');
    const analysisSidebar = document.getElementById('analysis-sidebar');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorDisplay = document.getElementById('error-display');

    // Drag and Drop Handlers
    if (uploadContainer) {
        uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadContainer.classList.add('active');
        });

        uploadContainer.addEventListener('dragleave', () => {
            uploadContainer.classList.remove('active');
        });

        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadContainer.classList.remove('active');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileUpload();
            }
        });
    }

    // File Selection Handler
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Main File Upload Function with AI Analysis
    async function handleFileUpload() {
        const file = fileInput.files[0];
        if (!file) {
            console.log("No file selected");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showError('Error: File size exceeds 10MB limit');
            return;
        }

        // Show loading state
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        loadingIndicator.style.display = 'block';
        errorDisplay.style.display = 'none';
        fileInfo.textContent = `Processing: ${file.name}...`;

        try {
            // First extract text from the file
            const extractedText = await extractTextFromFile(file);
            
            // Then send to AI for analysis
            const analysisResult = await analyzeDocumentWithAI(extractedText, file.name);
            
            // Display the results
            displayAnalysis({
                status: 'success',
                type: analysisResult.document_type || detectDocumentType(file.name),
                language_name: analysisResult.language || 'English',
                language_code: analysisResult.language_code || 'en',
                text: extractedText,
                analysis: analysisResult.analysis,
                clauses: analysisResult.clauses,
                summary: analysisResult.summary,
                message: 'Document processed successfully'
            });
            
        } catch (error) {
            console.error('Processing error:', error);
            showError(`Error: ${error.message}`);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Select File';
            loadingIndicator.style.display = 'none';
        }
    }

    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
        fileInfo.textContent = 'Upload failed';
    }

    // Helper function to detect document type
    function detectDocumentType(filename) {
        const lowerName = filename.toLowerCase();
        if (lowerName.includes('court') || lowerName.includes('order') || lowerName.includes('judgment')) {
            return "Court Order";
        } else if (lowerName.includes('rental') || lowerName.includes('lease')) {
            return "Rental Agreement";
        } else if (lowerName.includes('contract') || lowerName.includes('agreement')) {
            return "Contract";
        } else if (lowerName.includes('will') || lowerName.includes('testament')) {
            return "Will/Testament";
        } else {
            return "Legal Document";
        }
    }

    // Helper function to extract text
    async function extractTextFromFile(file) {
        // In a real implementation, you would use:
        // - PDF.js for PDFs
        // - Office.js or similar for Word docs
        // - OCR for images
        
        // For demo purposes, we'll simulate text extraction
        return new Promise((resolve) => {
            setTimeout(() => {
                if (file.type === "application/pdf") {
                    resolve("Sample Legal Document\n\nParties:\n1. John Doe (Plaintiff)\n2. Jane Smith (Defendant)\n\nTerms:\n1. The defendant shall pay $1000 per month.\n2. This agreement is valid for 12 months.\n3. Early termination requires 30 days notice.\n\nSignatures:\n___________________\n___________________");
                } else {
                    resolve("This is a sample text extracted from the uploaded document.\n\nImportant clauses:\n- Payment terms\n- Termination conditions\n- Liability limitations");
                }
            }, 500);
        });
    }

    // Function to call AI analysis API
    async function analyzeDocumentWithAI(text, filename) {
        // In a real implementation, this would call your backend API
        // which would then call an AI service like OpenAI, Anthropic, etc.
        
        // For demo purposes, we'll simulate an API response
        return new Promise((resolve) => {
            setTimeout(() => {
                const docType = detectDocumentType(filename);
                const isContract = docType.includes('Agreement') || docType.includes('Contract');
                
                resolve({
                    document_type: docType,
                    language: 'English',
                    language_code: 'en',
                    analysis: generateAIAnalysis(text, isContract),
                    clauses: identifyKeyClauses(text, isContract),
                    summary: generateSummary(text, isContract)
                });
            }, 1500);
        });
    }

    // AI-generated analysis (simulated)
    function generateAIAnalysis(text, isContract) {
        const issues = [];
        
        if (text.includes('termination') && !text.includes('notice period')) {
            issues.push("⚠️ Termination clause missing notice period requirement");
        }
        
        if (text.includes('$') && !text.includes('payment terms')) {
            issues.push("❗ Payment amount specified but no clear payment terms");
        }
        
        if (text.includes('indemnify') || text.includes('liable')) {
            issues.push("⚠️ Liability clause detected - review carefully");
        }
        
        if (isContract && !text.includes('governing law')) {
            issues.push("❗ Governing law clause not found");
        }
        
        if (text.includes('signature')) {
            issues.push("✅ Signature section properly included");
        } else {
            issues.push("⚠️ Signature section missing");
        }
        
        return issues.join('\n');
    }

    // Identify key clauses (simulated AI)
    function identifyKeyClauses(text, isContract) {
        const clauses = [];
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;
            
            if (line.toLowerCase().includes('terminat')) {
                clauses.push({
                    text: line,
                    type: 'termination',
                    risk: line.includes('days') ? 'low' : 'medium',
                    explanation: line.includes('days') ? 
                        'Proper notice period specified' : 
                        'Notice period not clearly defined'
                });
            }
            
            if (line.toLowerCase().includes('pay') || line.toLowerCase().includes('$')) {
                clauses.push({
                    text: line,
                    type: 'payment',
                    risk: line.includes('date') ? 'low' : 'medium',
                    explanation: line.includes('date') ? 
                        'Payment terms clearly specified' : 
                        'Payment due date not specified'
                });
            }
            
            if (line.toLowerCase().includes('liable') || line.toLowerCase().includes('responsib')) {
                clauses.push({
                    text: line,
                    type: 'liability',
                    risk: 'high',
                    explanation: 'Liability clause - review carefully'
                });
            }
        });
        
        return clauses;
    }

    // Generate summary (simulated AI)
    function generateSummary(text, isContract) {
        let summary = "Document Summary:\n\n";
        
        if (isContract) {
            summary += "• This appears to be a contractual agreement\n";
            summary += "• Contains standard clauses but some may need review\n";
            summary += "• Pay special attention to termination and payment terms\n";
        } else {
            summary += "• Legal document with multiple provisions\n";
            summary += "• Contains obligations and responsibilities\n";
            summary += "• Review all clauses for completeness\n";
        }
        
        summary += "\nKey Recommendations:\n";
        summary += "1. Verify all party information\n";
        summary += "2. Confirm dates and monetary amounts\n";
        summary += "3. Consult legal expert for final review\n";
        
        return summary;
    }

    // Display Analysis Results
    function displayAnalysis(result) {
        console.log("Analysis Result:", result);

        // Update document type and language
        if (documentTypeDisplay) {
            documentTypeDisplay.textContent = `Document Type: ${result.type} | Language: ${result.language_name} (${result.language_code})`;
        }

        // Update document preview with highlighted clauses
        if (documentPreview) {
            let formattedText = formatDocumentText(result.text, result.type);
            
            // Highlight clauses in the text
            if (result.clauses && result.clauses.length) {
                result.clauses.forEach(clause => {
                    const escapedText = clause.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(escapedText, 'gi');
                    const highlightClass = `highlight-${clause.type} ${clause.risk}-risk`;
                    
                    formattedText = formattedText.replace(regex, match => 
                        `<span class="clause-highlight ${highlightClass}" data-type="${clause.type}" 
                         data-risk="${clause.risk}" title="${clause.explanation}">${match}</span>`
                    );
                });
            }
            
            documentPreview.innerHTML = `
                <div class="document-content">
                    <h3>${result.type}</h3>
                    <div class="extracted-text">
                        ${formattedText}
                    </div>
                </div>
            `;
            
            // Add click handlers for highlighted clauses
            document.querySelectorAll('.clause-highlight').forEach(el => {
                el.addEventListener('click', () => showClauseDetails(el));
            });
        }

        // Update analysis sidebar
        if (analysisSidebar) {
            let analysisHTML = `
                <h3>Document Analysis</h3>
                <div class="analysis-results">
                    ${parseAnalysis(result.analysis)}
                </div>
                
                <div class="summary-section">
                    <h3>AI Summary</h3>
                    <div class="summary-content">
                        ${result.summary.split('\n').map(line => `<p>${line}</p>`).join('')}
                    </div>
                </div>
                
                <div class="actions">
                    <button class="action-btn" id="generate-notice">
                        <i class="fas fa-file-alt"></i> Generate Legal Notice
                    </button>
                    <button class="action-btn" id="find-lawyer">
                        <i class="fas fa-gavel"></i> Find Legal Assistance
                    </button>
                </div>
            `;
            
            analysisSidebar.innerHTML = analysisHTML;
            
            // Add action button handlers
            document.getElementById('generate-notice')?.addEventListener('click', () => {
                alert('In full implementation, this would generate a legal notice based on the analysis');
            });
            
            document.getElementById('find-lawyer')?.addEventListener('click', () => {
                alert('In full implementation, this would connect you with legal professionals');
            });
        }

        // Show analysis section
        if (analysisContainer) {
            analysisContainer.style.display = 'block';
            window.scrollTo({
                top: analysisContainer.offsetTop,
                behavior: 'smooth'
            });
        }

        fileInfo.textContent = result.message || 'Analysis complete';
    }

    // Show detailed clause information
    function showClauseDetails(element) {
        const type = element.dataset.type;
        const risk = element.dataset.risk;
        const explanation = element.title;
        
        // Highlight the clicked clause
        document.querySelectorAll('.clause-highlight').forEach(el => {
            el.classList.remove('active');
        });
        element.classList.add('active');
        
        // Show details in the sidebar
        const detailsContainer = analysisSidebar.querySelector('.clause-details-container') || 
            document.createElement('div');
            
        detailsContainer.className = 'clause-details-container';
        detailsContainer.innerHTML = `
            <div class="clause-details ${risk}-risk">
                <h4>${type.charAt(0).toUpperCase() + type.slice(1)} Clause</h4>
                <p><strong>Risk Level:</strong> <span class="risk-tag ${risk}">${risk}</span></p>
                <p><strong>Explanation:</strong> ${explanation}</p>
                <p><strong>Full Text:</strong> "${element.textContent}"</p>
                <button class="action-btn small explain-btn" data-clause-type="${type}">
                    <i class="fas fa-info-circle"></i> Explain Like I'm 5
                </button>
            </div>
        `;
        
        // Add explain button handler
        detailsContainer.querySelector('.explain-btn')?.addEventListener('click', () => {
            const simpleExplanation = getSimpleExplanation(type);
            alert(`Simple Explanation:\n\n${simpleExplanation}`);
        });
        
        if (!analysisSidebar.querySelector('.clause-details-container')) {
            analysisSidebar.insertBefore(detailsContainer, analysisSidebar.querySelector('.summary-section'));
        }
    }

    // Get simple explanation of clause types
    function getSimpleExplanation(type) {
        const explanations = {
            'termination': 'This part talks about how the agreement can end. It should say how much notice you need to give before stopping.',
            'payment': 'This is about money - how much, when, and how payments should be made. Make sure the amounts and dates are clear.',
            'liability': 'This says who is responsible if something goes wrong. Be careful with these parts as they might make you responsible for things.'
        };
        
        return explanations[type] || 'This is an important part of the document that you should understand before agreeing.';
    }

    // Function to format the extracted text
    function formatDocumentText(text, docType) {
        if (!text) return "<p>No text extracted from the document.</p>";

        const lines = text.split('\n').filter(line => line.trim() !== '');
        let formattedHtml = '';

        if (docType === "Court Order") {
            let inOrderSection = false;
            lines.forEach((line, index) => {
                line = line.trim();
                if (index === 0 && line.toUpperCase().includes("COURT")) {
                    formattedHtml += `<h4 style="color: var(--primary); font-weight: bold;">${line}</h4>`;
                } else if (line.toLowerCase().startsWith("case no")) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (line.toLowerCase().includes(" vs. ")) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (line.toLowerCase().startsWith("date")) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (line.toUpperCase() === "ORDER") {
                    inOrderSection = true;
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (inOrderSection && /^\d+\./.test(line)) {
                    formattedHtml += `<p style="font-weight: bold; margin-top: 10px;">${line}</p>`;
                } else {
                    formattedHtml += `<p>${line}</p>`;
                }
            });
        } else if (docType.includes("Agreement") || docType.includes("Contract")) {
            lines.forEach((line, index) => {
                line = line.trim();
                if (line.toUpperCase().includes("PARTIES:")) {
                    formattedHtml += `<h4 style="font-weight: bold; color: var(--primary);">${line}</h4>`;
                } else if (line.toUpperCase().includes("TERMS:") || line.toUpperCase().includes("CONDITIONS:")) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (/^\d+\./.test(line)) {
                    formattedHtml += `<p style="font-weight: bold;">${line}</p>`;
                } else if (line.includes(":")) {
                    const [label, value] = line.split(":");
                    formattedHtml += `<p><strong>${label}:</strong>${value}</p>`;
                } else {
                    formattedHtml += `<p>${line}</p>`;
                }
            });
        } else {
            lines.forEach(line => {
                line = line.trim();
                formattedHtml += `<p>${line}</p>`;
            });
        }
        return formattedHtml;
    }

    // Function to parse analysis and create color-coded HTML
    function parseAnalysis(analysis) {
        if (!analysis) return '<p>No analysis available</p>';
        
        const lines = analysis.split('\n');
        let html = '';
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.includes('⚠️')) {
                html += `<div class="clause-details danger"><p>${line.replace('⚠️', '<span class="icon">⚠️</span>')}</p></div>`;
            } else if (line.includes('✅')) {
                html += `<div class="clause-details safe"><p>${line.replace('✅', '<span class="icon">✅</span>')}</p></div>`;
            } else if (line.includes('❗')) {
                html += `<div class="clause-details warning"><p>${line.replace('❗', '<span class="icon">❗</span>')}</p></div>`;
            } else {
                html += `<p>${line}</p>`;
            }
        });
        return html;
    }

    // Main Language Selector
    const mainLanguageSelector = document.getElementById('main-language');
    if (mainLanguageSelector) {
        mainLanguageSelector.addEventListener('change', function() {
            alert(`In full implementation, UI would switch to ${this.value.toUpperCase()}`);
        });
    }

    // About Us Modal functionality
    const aboutLink = document.querySelector('footer a[href="#about"]');
    const modal = document.getElementById('about-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (aboutLink && modal && closeModal) {
        aboutLink.addEventListener('click', function(e) {
            e.preventDefault();
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });
        
        closeModal.addEventListener('click', function() {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }
});
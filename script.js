// public/script.js

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

    // Main File Upload Function
    async function handleFileUpload() {
        const file = fileInput.files[0];
        if (!file) {
            console.log("No file selected");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            fileInfo.textContent = 'Error: File size exceeds 10MB limit';
            return;
        }

        fileInfo.textContent = `Processing: ${file.name}...`;
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const formData = new FormData();
            formData.append('document', file);

            const response = await fetch('/process-document', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log("Server Response:", result);

            if (result.status === 'error') {
                throw new Error(result.message);
            }

            displayAnalysis(result);
            
        } catch (error) {
            fileInfo.textContent = `Error: ${error.message}`;
            console.error('Processing error:', error);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Select File';
        }
    }

    // Function to detect if text is in Hindi (Devanagari script) - for formatting
    function isHindi(text) {
        const hindiRegex = /[\u0900-\u097F]/;
        return hindiRegex.test(text);
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
                if (isHindi(line)) return; // Skip Hindi lines for now
                if (index === 0 && line.toUpperCase().includes("COURT")) {
                    formattedHtml += `<h4 style="color: gold; font-weight: bold;">${line}</h4>`;
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
        } else if (docType === "Rental Agreement") {
            lines.forEach((line, index) => {
                line = line.trim();
                if (isHindi(line)) return;
                if (line.toUpperCase().startsWith("LANDLORD:") || line.toUpperCase().startsWith("TENANT:")) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else if (/^\d+\./.test(line)) {
                    formattedHtml += `<h4 style="font-weight: bold;">${line}</h4>`;
                } else {
                    formattedHtml += `<p>${line}</p>`;
                }
            });
        } else {
            lines.forEach(line => {
                line = line.trim();
                if (isHindi(line)) return;
                formattedHtml += `<p>${line}</p>`;
            });
        }
        return formattedHtml;
    }

    // Function to parse analysis and create color-coded HTML
    function parseAnalysis(analysis) {
        const lines = analysis.split('\n');
        let html = '';
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.includes('⚠️')) {
                html += `<div class="clause-details tag-danger"><p>${line.replace('⚠️', '<span class="icon">⚠️</span>')}</p></div>`;
            } else if (line.includes('✅')) {
                html += `<div class="clause-details tag-safe"><p>${line.replace('✅', '<span class="icon">✅</span>')}</p></div>`;
            } else if (line.includes('❗')) {
                html += `<div class="clause-details tag-warning"><p>${line.replace('❗', '<span class="icon">❗</span>')}</p></div>`;
            } else {
                html += `<p>${line}</p>`;
            }
        });
        return html;
    }

    // Download clause analysis as PDF
    function downloadAnalysisAsPDF(analysisText) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Clause Analysis Report", 10, 10);
        const lines = analysisText.split('\n');
        let yPosition = 20;
        lines.forEach(line => {
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 10;
            }
            doc.text(line, 10, yPosition);
            yPosition += 10;
        });
        doc.save('clause-analysis-report.pdf');
    }

    // Display Analysis Results
    async function displayAnalysis(result) {
        console.log("Received Result:", result);

        // Update document type and language
        if (documentTypeDisplay) {
            documentTypeDisplay.textContent = `Document Type: ${result.type || 'Not Detected'} | Language: ${result.language_name || 'Unknown'} (${result.language_code || 'unknown'})`;
        }

        // Update document preview
        if (documentPreview) {
            const formattedText = formatDocumentText(result.text, result.type);
            documentPreview.innerHTML = `
                <div class="document-content">
                    <h3>${result.type || 'Unknown Document'}</h3>
                    <div class="extracted-text">
                    ${formattedText}
                    </div>
                </div>
            `;
        }

        // Update analysis sidebar
        if (analysisSidebar) {
            const parsedAnalysis = parseAnalysis(result.analysis);
            analysisSidebar.innerHTML = `
                <h3>Clause Analysis</h3>
                ${parsedAnalysis || '<p>No analysis available.</p>'}
                
                <div class="summary-section">
                    <h3>Document Summary</h3>
                    <div class="language-toggle">
                        <button class="lang-btn active" data-lang="en">English</button>
                        <button class="lang-btn" data-lang="hi">Hindi</button>
                        <button class="lang-btn" data-lang="ta">Tamil</button>
                        <button class="lang-btn" data-lang="te">Telugu</button>
                    </div>
                    <div id="summary-content" class="summary-content">
                        <pre>${result.summary || 'Waiting for summary...'}</pre>
                    </div>
                    <button class="voice-btn" data-lang="en">
                        <i class="fas fa-volume-up"></i> Read Summary
                    </button>
                    <button id="download-pdf" class="download-btn">
                        <i class="fas fa-file-pdf"></i> Download Analysis
                    </button>
                </div>
            `;

            // Add PDF download functionality
            document.getElementById('download-pdf').addEventListener('click', async function() {
                try {
                    // Show loading state
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                    this.disabled = true;
                    
                    // Get all analysis data
                    const analysisData = {
                        analysis: document.querySelector('.analysis-sidebar').innerText,
                        summary: document.getElementById('summary-content').innerText,
                        documentType: documentTypeDisplay.textContent,
                        language: document.getElementById('main-language').value
                    };

                    // Call backend to generate PDF
                    const response = await fetch('/generate-pdf', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(analysisData)
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Server responded with status ${response.status}`);
                    }

                    // Create download link
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'vakilai-legal-analysis.pdf';
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);
                    
                } catch (error) {
                    console.error('PDF download failed:', error);
                    alert('Failed to generate PDF. Please try again.');
                } finally {
                    // Reset button state
                    const btn = document.getElementById('download-pdf');
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-file-pdf"></i> Download Analysis';
                        btn.disabled = false;
                    }
                }
            });

            // Add voice functionality
            const voiceBtn = document.querySelector('.voice-btn');
            voiceBtn.addEventListener('click', function() {
                const lang = this.getAttribute('data-lang');
                const summaryText = document.getElementById('summary-content').textContent;
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(summaryText);
                    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : 'en-US';
                    window.speechSynthesis.speak(utterance);
                } else {
                    alert('Text-to-speech not supported in your browser');
                }
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

        fileInfo.textContent = result.message || 'Processing complete';
    }
    // Add this to your existing script.js
document.getElementById('download-pdf').addEventListener('click', async function() {
    try {
        // Get all the analysis data
        const analysisText = document.querySelector('.analysis-sidebar').innerText;
        const summaryText = summaryContent.innerText;
        const docType = documentType.textContent;
        const language = mainLanguageSelector.value;
        
        // Show loading state
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        this.disabled = true;
        
        // Send data to server to generate PDF
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                analysis: analysisText,
                summary: summaryText,
                documentType: docType,
                language: language
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vakilai-legal-analysis.pdf';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Failed to download PDF: ' + error.message);
    } finally {
        // Reset button
        this.innerHTML = '<i class="fas fa-file-pdf"></i> Download Analysis';
        this.disabled = false;
    }
});
// Add this to your existing script.js
document.getElementById('download-pdf')?.addEventListener('click', async function() {
    const btn = this;
    try {
        // Show loading state
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        btn.disabled = true;
        
        // Get all analysis data
        const analysisData = {
            analysis: document.querySelector('.analysis-sidebar').innerText,
            summary: document.getElementById('summary-content').innerText,
            documentType: document.getElementById('document-type').textContent,
            language: document.getElementById('main-language').value
        };

        // Call backend to generate PDF
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(analysisData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate PDF');
        }

        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vakilai-legal-analysis.pdf';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
    } catch (error) {
        console.error('PDF Download Error:', error);
        alert(`PDF generation failed: ${error.message}`);
    } finally {
        // Reset button state
        btn.innerHTML = '<i class="fas fa-file-pdf"></i> Download Analysis';
        btn.disabled = false;
    }
});
    // Main Language Selector (retained from original code)
    const mainLanguageSelector = document.getElementById('main-language');
    if (mainLanguageSelector) {
        mainLanguageSelector.addEventListener('change', function() {
            alert(`In full implementation, UI would switch to ${this.value.toUpperCase()}`);
        });
    }
});

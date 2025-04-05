let currentDocumentText = '';
let chatHistory = [];

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
    const mainLanguageSelector = document.getElementById('main-language');

    // Initialize Chatbot
    initializeChatbot();

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

    // Language Selector
    if (mainLanguageSelector) {
        mainLanguageSelector.addEventListener('change', function() {
            alert(`In full implementation, UI would switch to ${this.value.toUpperCase()}`);
        });
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

    // Text Processing Functions
    function isHindi(text) {
        const hindiRegex = /[\u0900-\u097F]/;
        return hindiRegex.test(text);
    }

    function formatDocumentText(text, docType) {
        if (!text) return "<p>No text extracted from the document.</p>";

        const lines = text.split('\n').filter(line => line.trim() !== '');
        let formattedHtml = '';

        if (docType === "Court Order") {
            let inOrderSection = false;
            lines.forEach((line, index) => {
                line = line.trim();
                if (isHindi(line)) return;
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

    // Chatbot Functions
    function initializeChatbot() {
        const toggleBtn = document.getElementById('toggle-chatbot');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleChatbot);
        }
    }

    function setupChatbot(documentText) {
        currentDocumentText = documentText;
        chatHistory = [];
        
        const chatbotContainer = document.getElementById('chatbot-container');
        const chatbotMessages = document.getElementById('chatbot-messages');
        const chatbotInput = document.getElementById('chatbot-input-field');
        const chatbotSend = document.getElementById('chatbot-send');
        const closeChatbot = document.getElementById('close-chatbot');

        // Show chatbot
        chatbotContainer.classList.remove('chatbot-hidden');
        chatbotContainer.classList.add('chatbot-visible');

        // Add welcome message
        addBotMessage("Hello! I'm your VakilAI assistant. Ask me anything about the document you just uploaded.");

        // Event listeners
        chatbotSend.addEventListener('click', sendMessage);
        chatbotInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());
        closeChatbot.addEventListener('click', () => toggleChatbot(false));

        async function sendMessage() {
            const message = chatbotInput.value.trim();
            if (!message) return;

            addUserMessage(message);
            chatbotInput.value = '';

            try {
                const response = await fetch('/chatbot-query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: message,
                        documentText: currentDocumentText,
                        history: chatHistory
                    })
                });

                const data = await response.json();
                addBotMessage(data.answer);
                chatHistory.push({role: 'assistant', content: data.answer});
            } catch (error) {
                console.error('Chatbot error:', error);
                addBotMessage("Sorry, I'm having trouble answering that. Please try again.");
            }
        }

        function addUserMessage(message) {
            chatHistory.push({role: 'user', content: message});
            addMessage(message, 'user-message');
        }

        function addBotMessage(message) {
            addMessage(message, 'bot-message');
        }

        function addMessage(message, className) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('chat-message', className);
            messageDiv.textContent = message;
            chatbotMessages.appendChild(messageDiv);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }
    }

    function toggleChatbot(show = null) {
        const chatbot = document.getElementById('chatbot-container');
        const shouldShow = show !== null ? show : chatbot.classList.contains('chatbot-hidden');
        
        if (shouldShow) {
            chatbot.classList.remove('chatbot-hidden');
            chatbot.classList.add('chatbot-visible');
        } else {
            chatbot.classList.remove('chatbot-visible');
            chatbot.classList.add('chatbot-hidden');
        }
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

            // Set up event listeners
            setupPdfDownload();
            setupVoiceButton();
        }

        // Initialize chatbot with document text
        setupChatbot(result.text);

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

    function setupPdfDownload() {
        const downloadBtn = document.getElementById('download-pdf');
        if (!downloadBtn) return;
    
        downloadBtn.addEventListener('click', async function() {
            const btn = this;
            try {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                btn.disabled = true;
                
                // Safely get the language value with fallback
                const languageSelector = document.getElementById('main-language');
                const selectedLanguage = languageSelector ? languageSelector.value : 'en';
                
                // Get all the necessary data for the PDF
                const analysisData = {
                    analysis: document.querySelector('.analysis-sidebar')?.innerHTML || '',
                    summary: document.getElementById('summary-content')?.innerText || '',
                    documentType: document.getElementById('document-type')?.textContent || 'Unknown Document Type',
                    language: selectedLanguage
                };
    
                // Make the request to generate PDF
                const response = await fetch('/generate-pdf', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/pdf' 
                    },
                    body: JSON.stringify(analysisData)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
    
                // Create blob from response
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Create download link and trigger click
                const a = document.createElement('a');
                a.href = url;
                a.download = 'vakilai-legal-analysis.pdf';
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
            } catch (error) {
                console.error('PDF Download Error:', error);
                alert(`Failed to generate PDF: ${error.message}`);
            } finally {
                btn.innerHTML = '<i class="fas fa-file-pdf"></i> Download Analysis';
                btn.disabled = false;
            }
        });
    }
    function setupVoiceButton() {
        const voiceBtn = document.querySelector('.voice-btn');
        if (!voiceBtn) return;

        voiceBtn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            const summaryText = document.getElementById('summary-content').textContent;
            
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(summaryText);
                utterance.lang = lang === 'hi' ? 'hi-IN' : 
                                  lang === 'ta' ? 'ta-IN' : 
                                  lang === 'te' ? 'te-IN' : 'en-US';
                window.speechSynthesis.speak(utterance);
            } else {
                alert('Text-to-speech not supported in your browser');
            }
        });
    }
});
// ==UserScript==
// @name         IXL auto-answer
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  ITS VIBECODED VIBECODED AIAIAIAAIAIAIAIAIIAIAIAIAIAIAIAI
// @match        https://*.ixl.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      generativelanguage.googleapis.com
// @connect      api.deepseek.com
// ==/UserScript==

(function() {
    'use strict';

    // --- Model Configuration ---
    const MODELS = {
        gemini: [
            { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended)' },
            { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
            { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
            { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
        ],
        deepseek: [
            { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash' },
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
            { id: 'deepseek-chat', name: 'DeepSeek Chat (V3.2)' },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
        ],
        openai: [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
            { id: 'gpt-4o', name: 'GPT-4o (Smart)' }
        ],
        anthropic: [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
        ]
    };

    // --- Dynamic UI Injection ---
    const style = document.createElement('style');
    style.textContent = `
        #ai-solver-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            width: 320px;
            background: #1e1e2f;
            color: #f1f1f1;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 2px #ff4b4b;
            opacity: 1.0;
            transition: opacity 0.15s ease;
            user-select: none;
            overflow: hidden;
        }
        #ai-solver-panel.click-through {
            pointer-events: none !important;
            opacity: 0.3 !important;
        }
        .ai-panel-header {
            background: linear-gradient(135deg, #ff4b4b, #9024ff);
            padding: 10px 14px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 0.5px;
        }
        .ai-panel-header span {
            pointer-events: none;
        }
        .ai-tab-bar {
            display: flex;
            background: #141420;
            border-bottom: 1px solid #2d2d42;
        }
        .ai-tab-btn {
            flex: 1;
            padding: 8px 4px;
            background: transparent;
            border: none;
            color: #8a8a9e;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .ai-tab-btn.active {
            color: #00e5ff;
            border-bottom: 2px solid #00e5ff;
            background: #1e1e2f;
        }
        .ai-tab-content {
            padding: 12px;
            display: none;
            max-height: 380px;
            overflow-y: auto;
        }
        .ai-tab-content.active {
            display: block;
        }
        .ai-label {
            font-size: 11px;
            color: #a0a0b5;
            margin-bottom: 4px;
            display: block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        .ai-select, .ai-input {
            width: 100%;
            padding: 7px 9px;
            margin-bottom: 10px;
            background: #28283d;
            color: #fff;
            border: 1px solid #3d3d5c;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 12px;
            outline: none;
        }
        .ai-select:focus, .ai-input:focus {
            border-color: #00e5ff;
        }
        .ai-btn-group {
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
        }
        .ai-btn {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            color: #fff;
            transition: transform 0.1s ease, filter 0.2s ease;
        }
        .ai-btn:active {
            transform: scale(0.97);
        }
        .ai-btn-primary { background: linear-gradient(135deg, #00c853, #00e676); color: #000; }
        .ai-btn-secondary { background: #3d3d5c; }
        .ai-btn-test { background: linear-gradient(135deg, #00b0ff, #00e5ff); color: #000; }
        .ai-btn-danger { background: linear-gradient(135deg, #ff1744, #ff5252); }
        .ai-status-box {
            margin-top: 8px;
            padding: 8px;
            background: #141420;
            border-radius: 6px;
            border: 1px solid #2d2d42;
            font-size: 11px;
            color: #b0b0cc;
            word-break: break-word;
            max-height: 80px;
            overflow-y: auto;
            line-height: 1.4;
        }
        .ai-info-card {
            background: #252538;
            border-left: 3px solid #ff9100;
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.4;
            color: #d1d1e0;
            margin-bottom: 8px;
        }
        .ai-hotkey-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dashed #2d2d42;
            font-size: 11px;
        }
        .ai-kbd {
            background: #2d2d42;
            padding: 2px 6px;
            border-radius: 4px;
            color: #00e5ff;
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);

    const panelContainer = document.createElement('div');
    panelContainer.innerHTML = `
        <div id="ai-solver-panel">
            <div class="ai-panel-header" id="ai-panel-drag-handle">
                <span>⚡ IXL Multi-AI Solver</span>
                <span style="font-size: 10px; opacity: 0.8;" id="ai-opacity-indicator">100%</span>
            </div>

            <div class="ai-tab-bar">
                <button class="ai-tab-btn active" data-tab="tab-controls">Controls</button>
                <button class="ai-tab-btn" data-tab="tab-keys">API Keys</button>
                <button class="ai-tab-btn" data-tab="tab-hotkeys">Hotkeys</button>
                <button class="ai-tab-btn" data-tab="tab-about">About</button>
            </div>

            <!-- TAB 1: CONTROLS -->
            <div id="tab-controls" class="ai-tab-content active">
                <label class="ai-label">Provider</label>
                <select id="ai-provider" class="ai-select">
                    <option value="gemini">Gemini (Google)</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">ChatGPT (OpenAI)</option>
                    <option value="anthropic">Claude (Anthropic)</option>
                </select>

                <label class="ai-label">Model</label>
                <select id="ai-model" class="ai-select"></select>

                <div class="ai-btn-group">
                    <button id="ai-solve-btn" class="ai-btn ai-btn-primary">Solve Current</button>
                    <button id="ai-toggle-auto" class="ai-btn ai-btn-secondary">Auto: OFF</button>
                </div>

                <div id="ai-status" class="ai-status-box">Status: Idle</div>
            </div>

            <!-- TAB 2: API KEYS -->
            <div id="tab-keys" class="ai-tab-content">
                <label class="ai-label">API Key for Active Provider</label>
                <input type="password" id="ai-api-key" class="ai-input" placeholder="Paste key here..." />

                <div class="ai-btn-group">
                    <button id="ai-test-key-btn" class="ai-btn ai-btn-test">Test Key</button>
                    <button id="ai-delete-key-btn" class="ai-btn ai-btn-danger">Clear Key</button>
                </div>
                <div class="ai-info-card">Keys are saved locally in your script manager storage per provider.</div>
            </div>

            <!-- TAB 3: HOTKEYS -->
            <div id="tab-hotkeys" class="ai-tab-content">
                <div class="ai-hotkey-row"><span>Hide / Unhide Panel</span><span class="ai-kbd">Right Shift</span></div>
                <div class="ai-hotkey-row"><span>Toggle Click-Through</span><span class="ai-kbd">Alt + Shift + T</span></div>
                <div class="ai-hotkey-row"><span>Increase Transparency</span><span class="ai-kbd">Alt + =</span></div>
                <div class="ai-hotkey-row"><span>Decrease Transparency</span><span class="ai-kbd">Alt + -</span></div>
            </div>

            <!-- TAB 4: ABOUT & LIMITATIONS -->
            <div id="tab-about" class="ai-tab-content">
                <div class="ai-info-card" style="border-left-color: #00e5ff;">
                    <b>Work In Progress (WIP)</b><br>
                    Designed primarily for text & fill-in-the-blank input fields. It currently struggles with complex image-based geometry or graphical selection tools.
                </div>
                <div class="ai-info-card" style="border-left-color: #ff1744;">
                    <b>Disclaimer</b><br>
                    This tool is created strictly for technical research and educational automation concepts. We do not promote or condone academic dishonesty.
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(panelContainer);

    // --- UI State & Elements ---
    const mainPanel = document.getElementById('ai-solver-panel');
    const dragHandle = document.getElementById('ai-panel-drag-handle');
    const providerSelect = document.getElementById('ai-provider');
    const modelSelect = document.getElementById('ai-model');
    const apiKeyInput = document.getElementById('ai-api-key');
    const statusDiv = document.getElementById('ai-status');
    const toggleAutoBtn = document.getElementById('ai-toggle-auto');
    const opacityIndicator = document.getElementById('ai-opacity-indicator');

    let opacityLevel = 1.0;
    let isClickThrough = false;

    // Tab Switching
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.ai-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Draggable Functionality
    let isDragging = false, offsetPX = 0, offsetPY = 0;
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetPX = e.clientX - mainPanel.offsetLeft;
        offsetPY = e.clientY - mainPanel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        mainPanel.style.left = (e.clientX - offsetPX) + 'px';
        mainPanel.style.top = (e.clientY - offsetPY) + 'px';
        mainPanel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    // Key Hotkeys
    document.addEventListener('keydown', (e) => {
        // Right Shift -> Hide / Unhide
        if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
            mainPanel.style.display = (mainPanel.style.display === 'none') ? 'block' : 'none';
        }
        // Alt + Shift + T -> Toggle Click-Through
        if (e.altKey && e.shiftKey && e.code === 'KeyT') {
            isClickThrough = !isClickThrough;
            mainPanel.classList.toggle('click-through', isClickThrough);
        }
        // Alt + '=' -> More See-Through
        if (e.altKey && (e.key === '=' || e.key === '+')) {
            opacityLevel = Math.max(0.2, opacityLevel - 0.15);
            mainPanel.style.opacity = opacityLevel.toFixed(2);
            opacityIndicator.innerText = Math.round(opacityLevel * 100) + '%';
        }
        // Alt + '-' -> Less See-Through
        if (e.altKey && e.key === '-') {
            opacityLevel = Math.min(1.0, opacityLevel + 0.15);
            mainPanel.style.opacity = opacityLevel.toFixed(2);
            opacityIndicator.innerText = Math.round(opacityLevel * 100) + '%';
        }
    });

    // --- Model Dropdown Synchronization ---
    function updateModelDropdown(provider, savedModel = null) {
        modelSelect.innerHTML = '';
        const list = MODELS[provider] || [];

        list.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = m.name;
            modelSelect.appendChild(opt);
        });

        if (savedModel && list.some(m => m.id === savedModel)) {
            modelSelect.value = savedModel;
        } else if (list.length > 0) {
            modelSelect.value = list[0].id;
            GM_setValue('ai_model_' + provider, list[0].id);
        }
    }

    const savedProvider = GM_getValue('ai_provider', 'gemini');
    providerSelect.value = savedProvider;
    updateModelDropdown(savedProvider, GM_getValue('ai_model_' + savedProvider));
    apiKeyInput.value = GM_getValue('ai_key_' + savedProvider, '');

    providerSelect.addEventListener('change', () => {
        const prov = providerSelect.value;
        GM_setValue('ai_provider', prov);
        updateModelDropdown(prov, GM_getValue('ai_model_' + prov));
        apiKeyInput.value = GM_getValue('ai_key_' + prov, '');
    });

    modelSelect.addEventListener('change', () => {
        GM_setValue('ai_model_' + providerSelect.value, modelSelect.value);
    });

    apiKeyInput.addEventListener('input', () => {
        GM_setValue('ai_key_' + providerSelect.value, apiKeyInput.value.trim());
    });

    // --- API Key Action Buttons ---
    document.getElementById('ai-delete-key-btn').addEventListener('click', () => {
        const prov = providerSelect.value;
        GM_deleteValue('ai_key_' + prov);
        apiKeyInput.value = '';
        statusDiv.innerText = `Status: Key cleared for ${prov}.`;
    });

    document.getElementById('ai-test-key-btn').addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const prov = providerSelect.value;
        if (!apiKey) {
            statusDiv.innerHTML = `<span style="color: #ff5252;">Test Failed: API Key field is empty.</span>`;
            return;
        }
        statusDiv.innerText = `Status: Testing key for ${prov}...`;

        // Dummy payload to check key validity
        if (prov === 'gemini') {
            GM_xmlhttpRequest({
                method: "POST",
                url: `https://generativelanguage.googleapis.com/v1beta/models/${modelSelect.value}:generateContent?key=${apiKey}`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
                onload: (res) => {
                    statusDiv.innerHTML = res.status === 200
                        ? `<span style="color: #00e676;">Key Validated! (${res.status})</span>`
                        : `<span style="color: #ff5252;">Key Invalid (${res.status})</span>`;
                }
            });
        } else {
            statusDiv.innerText = "Status: Key saved (Full test endpoint ready).";
        }
    });

    // --- Core Automation Logic ---
    let autoMode = false;
    let isSolving = false;
    let lastProcessedQuestion = "";

    toggleAutoBtn.addEventListener('click', () => {
        autoMode = !autoMode;
        toggleAutoBtn.style.background = autoMode ? 'linear-gradient(135deg, #00b0ff, #00e5ff)' : '#3d3d5c';
        toggleAutoBtn.style.color = autoMode ? '#000' : '#fff';
        toggleAutoBtn.innerText = autoMode ? 'Auto: ON' : 'Auto: OFF';

        if (!autoMode) {
            isSolving = false;
            statusDiv.innerText = "Status: Auto-solve stopped immediately.";
        }
    });

    window.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);

    function isChallengeZoneActive() {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('entering the challenge zone') ||
               bodyText.includes('are you ready');
    }

    function getQuestionContent() {
        const questionNode = document.querySelector('.question-content') ||
                             document.querySelector('.value-content') ||
                             document.querySelector('.problem-container');

        if (questionNode) {
            const clone = questionNode.cloneNode(true);
            clone.querySelectorAll(
                '.example-link, .video-link, .work-it-out, script, style, .choices'
            ).forEach(el => el.remove());

            return clone.innerText
                .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
                .replace(/\s+/g, ' ')
                .trim();
        }

        return document.body.innerText.replace(
            /[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-'
        );
    }

    function applyAnswerToPage(answerText) {
        const cleaned = answerText
            .replace(/```[a-z]*\n?/g, '')
            .replace(/```/g, '')
            .trim();

        const inputFields = Array.from(document.querySelectorAll(
            'input[type="text"], .fill-in, textarea'
        )).filter(field =>
            !field.closest('#ai-solver-panel') &&
            field.getClientRects().length > 0 &&
            !field.disabled
        );

        if (inputFields.length === 0) {
            isSolving = false;
            return;
        }

        let answers;
        if (inputFields.length === 1) {
            answers = [cleaned];
        } else {
            answers = cleaned
                .split(/\r?\n|\s*\|\s*/)
                .map(answer => answer.trim())
                .filter(Boolean);
        }

        if (answers.length < inputFields.length) {
            statusDiv.innerText = `Need ${inputFields.length} answers, received ${answers.length}.`;
            isSolving = false;
            return;
        }

        const fieldsToFill = inputFields.slice(0, answers.length);

        fieldsToFill.forEach((inputField, index) => {
            const answer = answers[index];
            inputField.focus();
            inputField.click();

            const prototype = inputField instanceof HTMLTextAreaElement
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;

            const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

            if (nativeSetter) {
                nativeSetter.call(inputField, '');
            } else {
                inputField.value = '';
            }

            inputField.dispatchEvent(new Event('input', { bubbles: true }));

            if (nativeSetter) {
                nativeSetter.call(inputField, answer);
            } else {
                inputField.value = answer;
            }

            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const lastInput = fieldsToFill[fieldsToFill.length - 1];
        statusDiv.innerText = "Answers set: " + answers.slice(0, fieldsToFill.length).join(" | ") + " (Submitting...)";

        setTimeout(() => {
            const enterOptions = {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                bubbles: true, cancelable: true
            };
            lastInput.dispatchEvent(new KeyboardEvent('keydown', enterOptions));
            lastInput.dispatchEvent(new KeyboardEvent('keypress', enterOptions));
            lastInput.dispatchEvent(new KeyboardEvent('keyup', enterOptions));

            setTimeout(() => { isSolving = false; }, 1200);
        }, 800);
    }

    function handleResponse(res, parseCallback) {
        if (res.status !== 200) {
            isSolving = false;
            statusDiv.innerHTML = `<span style="color: #ff5252;">API Error (${res.status}): ${res.responseText.slice(0, 120)}</span>`;
            return;
        }

        try {
            const data = JSON.parse(res.responseText);
            const answer = parseCallback(data);

            if (!answer) {
                isSolving = false;
                statusDiv.innerHTML = `<span style="color: #ff5252;">Error: Empty response.</span>`;
                return;
            }

            applyAnswerToPage(answer);
        } catch (e) {
            isSolving = false;
            statusDiv.innerHTML = `<span style="color: #ff5252;">Parse Error: ${e.message}</span>`;
        }
    }

    function solveQuestion() {
        if (isSolving || isChallengeZoneActive()) return;

        const gotItBtn = Array.from(document.querySelectorAll('button, a'))
            .find(b => b.innerText.trim().toLowerCase() === 'got it');

        if (gotItBtn) {
            gotItBtn.click();
            lastProcessedQuestion = "";
            statusDiv.innerText = "Status: Cleared explanation screen.";
            return;
        }

        const inputField = document.querySelector('input[type="text"]') ||
                           document.querySelector('.fill-in') ||
                           document.querySelector('textarea');

        if (inputField && inputField.disabled) return;

        const provider = providerSelect.value;
        const model = modelSelect.value;
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            statusDiv.innerText = "Status: API Key missing!";
            return;
        }

        const rawQuestion = getQuestionContent();
        if (!rawQuestion || rawQuestion === lastProcessedQuestion) return;

        isSolving = true;
        lastProcessedQuestion = rawQuestion;
        statusDiv.innerText = `Asking ${provider} (${model})...`;

        const visibleInputs = Array.from(document.querySelectorAll(
            'input[type="text"], .fill-in, textarea'
        )).filter(field =>
            !field.closest('#ai-solver-panel') &&
            field.getClientRects().length > 0 &&
            !field.disabled
        );

        const prompt = visibleInputs.length > 1
            ? `Solve this math problem completely accurately. Please do not only double check your answer but also verify it against other sources if possible, as we do not want to get any questions wrong if possible. There are ${visibleInputs.length} answer boxes. Output ONLY the answers in order, one answer per line, with no words or explanations.\n\nExpression:\n${rawQuestion}`
            : `Solve this math expression completely accurately. Double-check your reasoning and verify your answer before responding. Recalculate if necessary. Output ONLY the final numeric or short answer (e.g. -16, 0, or 12) with zero words, letters, or punctuation.\n\nExpression:\n${rawQuestion}`;

        const requestOptions = {
            timeout: 15000,
            ontimeout: () => {
                isSolving = false;
                statusDiv.innerHTML = `<span style="color: #ff5252;">Error: Timed out (15s).</span>`;
            },
            onerror: () => {
                isSolving = false;
                statusDiv.innerHTML = `<span style="color: #ff5252;">Error: Network failed.</span>`;
            }
        };

        if (provider === 'gemini') {
            GM_xmlhttpRequest({
                ...requestOptions,
                method: "POST",
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                onload: (res) => handleResponse(res, (d) => d.candidates?.[0]?.content?.parts?.[0]?.text)
            });
        } else if (provider === 'deepseek') {
            GM_xmlhttpRequest({
                ...requestOptions,
                method: "POST",
                url: "https://api.deepseek.com/chat/completions",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                data: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                }),
                onload: (res) => handleResponse(res, (d) => d.choices?.[0]?.message?.content)
            });
        } else if (provider === 'openai') {
            GM_xmlhttpRequest({
                ...requestOptions,
                method: "POST",
                url: "https://api.openai.com/v1/chat/completions",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                data: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }]
                }),
                onload: (res) => handleResponse(res, (d) => d.choices?.[0]?.message?.content)
            });
        } else if (provider === 'anthropic') {
            GM_xmlhttpRequest({
                ...requestOptions,
                method: "POST",
                url: "https://api.anthropic.com/v1/messages",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                data: JSON.stringify({
                    model: model,
                    max_tokens: 100,
                    messages: [{ role: "user", content: prompt }]
                }),
                onload: (res) => handleResponse(res, (d) => d.content?.[0]?.text)
            });
        }
    }

    document.getElementById('ai-solve-btn').addEventListener('click', () => {
        lastProcessedQuestion = "";
        solveQuestion();
    });

    // Background loop monitoring
    setInterval(() => {
        const gotItBtn = Array.from(document.querySelectorAll('button, a'))
            .find(b => b.innerText.trim().toLowerCase() === 'got it');

        if (gotItBtn) {
            gotItBtn.click();
            lastProcessedQuestion = "";
            isSolving = false;
            return;
        }

        if (!autoMode) {
            isSolving = false;
            return;
        }

        if (isChallengeZoneActive()) {
            statusDiv.innerText = "Status: Challenge Zone countdown... pausing.";
            isSolving = false;
            lastProcessedQuestion = "";
            return;
        }

        if (isSolving) return;

        const currentQ = getQuestionContent();
        if (currentQ && currentQ !== lastProcessedQuestion) {
            solveQuestion();
        }
    }, 1200);

})();

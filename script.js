document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const formatBtn = document.getElementById('formatBtn');
    const minifyBtn = document.getElementById('minifyBtn');
    const compareBtn = document.getElementById('compareBtn');
    const clearBtn = document.getElementById('clearBtn');
    const themeToggle = document.getElementById('themeToggle');
    const backBtn = document.getElementById('backBtn');
    const sortKeysToggle = document.getElementById('sortKeysToggle');
    
    // Editors
    const jsonLeft = document.getElementById('jsonLeft');
    const jsonRight = document.getElementById('jsonRight');
    const statusLeft = document.getElementById('statusLeft');
    const statusRight = document.getElementById('statusRight');
    
    // Tools
    const uploadLeft = document.getElementById('uploadLeft');
    const uploadLeftBtn = document.getElementById('uploadLeftBtn');
    const downloadLeftBtn = document.getElementById('downloadLeftBtn');
    const copyLeftBtn = document.getElementById('copyLeftBtn');

    const uploadRight = document.getElementById('uploadRight');
    const uploadRightBtn = document.getElementById('uploadRightBtn');
    const downloadRightBtn = document.getElementById('downloadRightBtn');
    const copyRightBtn = document.getElementById('copyRightBtn');

    // Views
    const editorView = document.getElementById('editorView');
    const diffView = document.getElementById('diffView');
    
    // Diff Panels
    const diffLeft = document.getElementById('diffLeft');
    const diffRight = document.getElementById('diffRight');
    const statAdd = document.getElementById('statAdd');
    const statDel = document.getElementById('statDel');
    const statMod = document.getElementById('statMod');

    const toastContainer = document.getElementById('toastContainer');

    // --- Toast Notifications ---
    function showToast(message, icon = 'check-circle') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- Theme Management ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    function showStatus(el, message, type) {
        el.textContent = message;
        el.className = `status show ${type}`;
    }

    // --- Core Utilities ---
    const sortObjectKeys = (o) => {
        if (o === null || typeof o !== 'object') return o;
        if (Array.isArray(o)) return o.map(sortObjectKeys);
        return Object.keys(o).sort().reduce((acc, key) => {
            acc[key] = sortObjectKeys(o[key]);
            return acc;
        }, {});
    };

    function processJSON(textarea, statusElement, action = 'format') {
        const rawValue = textarea.value.trim();
        if (!rawValue) {
            statusElement.className = 'status';
            return;
        }
        try {
            const parsed = JSON.parse(rawValue);
            const finalObject = sortKeysToggle.checked ? sortObjectKeys(parsed) : parsed;
            
            if (action === 'format') {
                textarea.value = JSON.stringify(finalObject, null, 2);
                showToast("Formatted successfully", "wand-magic-sparkles");
            } else if (action === 'minify') {
                textarea.value = JSON.stringify(finalObject);
                showToast("Minified successfully", "compress");
            }
            showStatus(statusElement, 'Valid JSON ✓', 'success');
        } catch (e) {
            showStatus(statusElement, 'Invalid JSON ✗', 'error');
            showToast("Invalid JSON syntax", "triangle-exclamation");
        }
    }

    function handleFileUpload(input, textarea, statusElement) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            textarea.value = e.target.result;
            processJSON(textarea, statusElement, 'format');
            input.value = ''; // Reset
        };
        reader.readAsText(file);
    }

    function downloadFile(content, fileName) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    function copyToClipboard(text) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast("Copied to clipboard!", "copy");
        });
    }

    // --- Event Listeners ---
    clearBtn.addEventListener('click', () => {
        jsonLeft.value = '';
        jsonRight.value = '';
        statusLeft.className = 'status';
        statusRight.className = 'status';
        diffLeft.innerHTML = '';
        diffRight.innerHTML = '';
        showToast("Editors cleared", "trash-can");
    });

    formatBtn.addEventListener('click', () => {
        processJSON(jsonLeft, statusLeft, 'format');
        processJSON(jsonRight, statusRight, 'format');
    });

    minifyBtn.addEventListener('click', () => {
        processJSON(jsonLeft, statusLeft, 'minify');
        processJSON(jsonRight, statusRight, 'minify');
    });

    // Tool Buttons Listeners
    uploadLeftBtn.addEventListener('click', () => uploadLeft.click());
    uploadRightBtn.addEventListener('click', () => uploadRight.click());
    
    uploadLeft.addEventListener('change', () => handleFileUpload(uploadLeft, jsonLeft, statusLeft));
    uploadRight.addEventListener('change', () => handleFileUpload(uploadRight, jsonRight, statusRight));

    downloadLeftBtn.addEventListener('click', () => {
        if (!jsonLeft.value) return showToast("Nothing to download", "info-circle");
        downloadFile(jsonLeft.value, "original.json");
    });
    downloadRightBtn.addEventListener('click', () => {
        if (!jsonRight.value) return showToast("Nothing to download", "info-circle");
        downloadFile(jsonRight.value, "target.json");
    });

    copyLeftBtn.addEventListener('click', () => copyToClipboard(jsonLeft.value));
    copyRightBtn.addEventListener('click', () => copyToClipboard(jsonRight.value));

    // Handle Tab Key for indentation
    [jsonLeft, jsonRight].forEach(textarea => {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 2;
            }
        });
    });

    // --- Diff Engine ---
    backBtn.addEventListener('click', () => {
        diffView.classList.add('hidden');
        editorView.classList.remove('hidden');
    });

    compareBtn.addEventListener('click', () => {
        let obj1, obj2;
        let valid = true;

        if (!jsonLeft.value.trim()) jsonLeft.value = '{}';
        if (!jsonRight.value.trim()) jsonRight.value = '{}';

        try {
            obj1 = JSON.parse(jsonLeft.value);
            showStatus(statusLeft, 'Valid JSON ✓', 'success');
        } catch (e) {
            showStatus(statusLeft, 'Invalid JSON ✗', 'error');
            valid = false;
        }

        try {
            obj2 = JSON.parse(jsonRight.value);
            showStatus(statusRight, 'Valid JSON ✓', 'success');
        } catch (e) {
            showStatus(statusRight, 'Invalid JSON ✗', 'error');
            valid = false;
        }

        if (!valid) {
            showToast("Cannot compare invalid JSON", "triangle-exclamation");
            return;
        }

        const processObj = (o) => sortKeysToggle.checked ? sortObjectKeys(o) : o;

        const str1 = JSON.stringify(processObj(obj1), null, 2);
        const str2 = JSON.stringify(processObj(obj2), null, 2);

        jsonLeft.value = str1;
        jsonRight.value = str2;

        renderSideBySideDiff(str1, str2);
        
        editorView.classList.add('hidden');
        diffView.classList.remove('hidden');
        showToast("Analysis complete", "chart-bar");
    });

    function createDiffLine(text, type, lineNum) {
        const div = document.createElement('div');
        let typeClass = text === null ? 'empty' : (type === 'removed' ? 'removed' : (type === 'added' ? 'added' : (type === 'changed' ? 'changed' : '')));
        div.className = `diff-line ${typeClass}`;
        
        const numDiv = document.createElement('div');
        numDiv.className = 'line-num';
        numDiv.textContent = lineNum !== null ? lineNum : '';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'line-content';
        contentDiv.textContent = text !== null ? text : ' ';

        div.appendChild(numDiv);
        div.appendChild(contentDiv);
        return div;
    }

    function renderSideBySideDiff(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');
        
        const diffLines = calculateLCSDiff(lines1, lines2);
        
        diffLeft.innerHTML = '';
        diffRight.innerHTML = '';
        
        let addCount = 0; let delCount = 0; let modCount = 0;
        let leftLineNum = 1; let rightLineNum = 1;

        const fragLeft = document.createDocumentFragment();
        const fragRight = document.createDocumentFragment();

        diffLines.forEach(line => {
            let lNum = null; let rNum = null;
            if (line.left !== null) lNum = leftLineNum++;
            if (line.right !== null) rNum = rightLineNum++;

            const divL = createDiffLine(line.left, line.type === 'added' ? 'empty' : line.type, lNum);
            const divR = createDiffLine(line.right, line.type === 'removed' ? 'empty' : line.type, rNum);

            if (line.type === 'added') addCount++;
            if (line.type === 'removed') delCount++;
            if (line.type === 'changed') modCount++;

            fragLeft.appendChild(divL);
            fragRight.appendChild(divR);
        });

        diffLeft.appendChild(fragLeft);
        diffRight.appendChild(fragRight);

        statAdd.textContent = addCount;
        statDel.textContent = delCount;
        statMod.textContent = modCount;
    }

    function calculateLCSDiff(lines1, lines2) {
        const m = lines1.length;
        const n = lines2.length;
        
        if (m * n > 10000000) {
            const maxLen = Math.max(m, n);
            const basic = [];
            for (let i=0; i<maxLen; i++) {
                if (i < m && i < n) {
                    if (lines1[i] === lines2[i]) basic.push({type: 'unchanged', left: lines1[i], right: lines2[i]});
                    else basic.push({type: 'changed', left: lines1[i], right: lines2[i]});
                } else if (i < m) { basic.push({type: 'removed', left: lines1[i], right: null});
                } else { basic.push({type: 'added', left: null, right: lines2[i]}); }
            }
            return basic;
        }

        const dp = new Array(m + 1);
        for (let i = 0; i <= m; i++) dp[i] = new Int32Array(n + 1);

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (lines1[i - 1] === lines2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }

        const path = [];
        let i = m; let j = n;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
                path.unshift({ type: 'unchanged', left: lines1[i - 1], right: lines2[j - 1] });
                i--; j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                path.unshift({ type: 'added', left: null, right: lines2[j - 1] });
                j--;
            } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
                path.unshift({ type: 'removed', left: lines1[i - 1], right: null });
                i--;
            }
        }

        for(let k = 0; k < path.length; k++) {
            if (path[k].type === 'removed' && k + 1 < path.length && path[k+1].type === 'added') {
                path[k].type = 'changed';
                path[k].right = path[k+1].right;
                path.splice(k+1, 1);
            }
        }

        return path;
    }
    
    // Auto-scroll sync handling
    function syncScroll(elements) {
        let isSyncingLeftScroll = false;
        let isSyncingRightScroll = false;

        elements[0].addEventListener('scroll', function(e) {
            if (!isSyncingLeftScroll) {
                isSyncingRightScroll = true;
                const percentage = this.scrollTop / (this.scrollHeight - this.clientHeight);
                elements[1].scrollTop = percentage * (elements[1].scrollHeight - elements[1].clientHeight);
                elements[1].scrollLeft = this.scrollLeft;
            }
            isSyncingLeftScroll = false;
        });

        elements[1].addEventListener('scroll', function(e) {
            if (!isSyncingRightScroll) {
                isSyncingLeftScroll = true;
                const percentage = this.scrollTop / (this.scrollHeight - this.clientHeight);
                elements[0].scrollTop = percentage * (elements[0].scrollHeight - elements[0].clientHeight);
                elements[0].scrollLeft = this.scrollLeft;
            }
            isSyncingRightScroll = false;
        });
    }

    syncScroll([jsonLeft, jsonRight]);
    syncScroll([diffLeft, diffRight]);

});

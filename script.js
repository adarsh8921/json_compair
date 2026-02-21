document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const formatBtn = document.getElementById('formatBtn');
    const compareBtn = document.getElementById('compareBtn');
    const clearBtn = document.getElementById('clearBtn');
    const themeToggle = document.getElementById('themeToggle');
    const backBtn = document.getElementById('backBtn');
    
    const jsonLeft = document.getElementById('jsonLeft');
    const jsonRight = document.getElementById('jsonRight');
    const statusLeft = document.getElementById('statusLeft');
    const statusRight = document.getElementById('statusRight');
    
    const editorView = document.getElementById('editorView');
    const diffView = document.getElementById('diffView');
    
    const diffLeft = document.getElementById('diffLeft');
    const diffRight = document.getElementById('diffRight');
    const diffContentContainer = document.querySelector('.diff-content');
    
    const statAdd = document.getElementById('statAdd');
    const statDel = document.getElementById('statDel');
    const statMod = document.getElementById('statMod');

    // Setup Theme
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark for premium feel
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
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }
    
    function showStatus(el, message, type) {
        el.textContent = message;
        el.className = `status show ${type}`;
    }

    // Handlers
    clearBtn.addEventListener('click', () => {
        jsonLeft.value = '';
        jsonRight.value = '';
        statusLeft.className = 'status';
        statusRight.className = 'status';
        diffLeft.innerHTML = '';
        diffRight.innerHTML = '';
    });

    formatBtn.addEventListener('click', () => {
        formatJSON(jsonLeft, statusLeft);
        formatJSON(jsonRight, statusRight);
    });

    // Handle Tab Key in textareas for indentation
    [jsonLeft, jsonRight].forEach(textarea => {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                // set textarea value to: text before caret + tab + text after caret
                this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
                // put caret at right position again
                this.selectionStart = this.selectionEnd = start + 2;
            }
        });
    });

    function formatJSON(textarea, statusElement) {
        if (!textarea.value.trim()) {
            statusElement.className = 'status';
            return;
        }
        try {
            const parsed = JSON.parse(textarea.value);
            // Optional: Sort keys alphabetically for neatness
            const sortObject = (o) => {
                if (o === null || typeof o !== 'object') return o;
                if (Array.isArray(o)) return o.map(sortObject);
                return Object.keys(o).sort().reduce((acc, key) => {
                    acc[key] = sortObject(o[key]);
                    return acc;
                }, {});
            };
            
            textarea.value = JSON.stringify(sortObject(parsed), null, 2);
            showStatus(statusElement, 'Valid JSON ✓', 'success');
        } catch (e) {
            showStatus(statusElement, 'Invalid JSON ✗', 'error');
        }
    }

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

        if (!valid) return;

        const sortObject = (o) => {
            if (o === null || typeof o !== 'object') return o;
            if (Array.isArray(o)) return o.map(sortObject);
            return Object.keys(o).sort().reduce((acc, key) => {
                acc[key] = sortObject(o[key]);
                return acc;
            }, {});
        };

        const str1 = JSON.stringify(sortObject(obj1), null, 2);
        const str2 = JSON.stringify(sortObject(obj2), null, 2);

        // Update Textareas with formatted values
        jsonLeft.value = str1;
        jsonRight.value = str2;

        renderSideBySideDiff(str1, str2);
        
        editorView.classList.add('hidden');
        diffView.classList.remove('hidden');
    });

    function createDiffLine(text, type, lineNum) {
        const div = document.createElement('div');
        let typeClass = '';
        if (text === null) {
            typeClass = 'empty';
        } else {
            typeClass = type === 'removed' ? 'removed' : (type === 'added' ? 'added' : (type === 'changed' ? 'changed' : ''));
        }
        
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
        
        let addCount = 0;
        let delCount = 0;
        let modCount = 0;
        
        let leftLineNum = 1;
        let rightLineNum = 1;

        const fragLeft = document.createDocumentFragment();
        const fragRight = document.createDocumentFragment();

        diffLines.forEach(line => {
            let lNum = null;
            let rNum = null;
            
            if (line.left !== null) {
                lNum = leftLineNum++;
            }
            if (line.right !== null) {
                rNum = rightLineNum++;
            }

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
            alert("JSON is too large for detailed side-by-side diff. Showing basic comparison.");
            const maxLen = Math.max(m, n);
            const basic = [];
            for (let i=0; i<maxLen; i++) {
                if (i < m && i < n) {
                    if (lines1[i] === lines2[i]) basic.push({type: 'unchanged', left: lines1[i], right: lines2[i]});
                    else basic.push({type: 'changed', left: lines1[i], right: lines2[i]});
                } else if (i < m) {
                    basic.push({type: 'removed', left: lines1[i], right: null});
                } else {
                    basic.push({type: 'added', left: null, right: lines2[i]});
                }
            }
            return basic;
        }

        const dp = new Array(m + 1);
        for (let i = 0; i <= m; i++) {
            dp[i] = new Int32Array(n + 1);
        }

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (lines1[i - 1] === lines2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        const path = [];
        let i = m;
        let j = n;

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
                path.unshift({ type: 'unchanged', left: lines1[i - 1], right: lines2[j - 1] });
                i--;
                j--;
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
    
    // Sync scroll for textareas
    function syncScroll(elements) {
        elements.forEach(el => {
            el.addEventListener('scroll', (e) => {
                elements.forEach(target => {
                    if (target !== e.target) {
                        const maxScrollSource = e.target.scrollHeight - e.target.clientHeight;
                        const maxScrollTarget = target.scrollHeight - target.clientHeight;
                        
                        if (maxScrollSource > 0) {
                            const percentage = e.target.scrollTop / maxScrollSource;
                            target.scrollTop = percentage * maxScrollTarget;
                        }
                        target.scrollLeft = e.target.scrollLeft;
                    }
                });
            });
        });
    }

    syncScroll([jsonLeft, jsonRight]);
    syncScroll([diffLeft, diffRight]);

});

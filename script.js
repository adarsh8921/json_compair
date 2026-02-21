document.addEventListener('DOMContentLoaded', () => {
    // --- State and Cache ---
    let parsedLeft = null;
    let parsedRight = null;

    // --- DOM Elements ---
    const elements = {
        formatBtn: document.getElementById('formatBtn'),
        minifyBtn: document.getElementById('minifyBtn'),
        compareBtn: document.getElementById('compareBtn'),
        clearBtn: document.getElementById('clearBtn'),
        themeToggle: document.getElementById('themeToggle'),
        backBtn: document.getElementById('backBtn'),
        sortKeysToggle: document.getElementById('sortKeysToggle'),
        
        // Panels
        jsonLeft: document.getElementById('jsonLeft'),
        jsonRight: document.getElementById('jsonRight'),
        linesLeft: document.getElementById('linesLeft'),
        linesRight: document.getElementById('linesRight'),
        statusLeft: document.getElementById('statusLeft'),
        statusRight: document.getElementById('statusRight'),
        statsLeft: document.getElementById('statsLeftMini'),
        statsRight: document.getElementById('statsRightMini'),
        
        // Tabs & Views
        editorView: document.getElementById('editorView'),
        diffView: document.getElementById('diffView'),
        treeContentLeft: document.getElementById('treeContentLeft'),
        treeContentRight: document.getElementById('treeContentRight'),
        
        // Diff Output
        diffLeft: document.getElementById('diffLeft'),
        diffRight: document.getElementById('diffRight'),
        statAdd: document.getElementById('statAdd'),
        statDel: document.getElementById('statDel'),
        statMod: document.getElementById('statMod'),

        toastWrapper: document.getElementById('toastContainer')
    };

    // --- UI Toasts ---
    function showToast(message, icon = 'check-circle') {
        const toast = document.createElement('div');
        toast.className = 't-msg';
        toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
        elements.toastWrapper.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('t-exit');
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    }

    // --- Theme Setup ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    elements.themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        elements.themeToggle.querySelector('i').className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
    elements.themeToggle.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    // --- Tab Switching Logic ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            // Find parent to scope tabs
            const parent = e.currentTarget.closest('.editor-card');
            
            // Reassign active button
            parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Toggle view layers
            parent.querySelectorAll('.view-layer').forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            // If they just switched to visual tree, generate it
            if (targetId.startsWith('tree')) {
                const side = targetId.replace('tree', ''); // "Left" or "Right"
                renderVisualTree(side);
            }
        });
    });

    // --- Status and Stats UI ---
    function setStatus(side, isValid, message) {
        const statusEl = elements[`status${side}`];
        statusEl.className = `status-indicator ${isValid ? 'success' : 'error'}`;
        statusEl.querySelector('.status-text').textContent = message;
    }

    function updateStats(side) {
        const textarea = elements[`json${side}`];
        const val = textarea.value;
        const lines = val === '' ? 0 : val.split('\n').length;
        const bytes = new Blob([val]).size;
        elements[`stats${side}`].textContent = `${lines.toLocaleString()} lines • ${bytes.toLocaleString()} bytes`;
        // Sync Line Numbers
        updateLineNumbers(textarea, elements[`lines${side}`]);
    }

    function updateLineNumbers(textarea, gutter) {
        const lines = textarea.value === '' ? 1 : textarea.value.split('\n').length;
        let arr = [];
        for (let i = 1; i <= lines; i++) arr.push(i);
        gutter.textContent = arr.join('\n');
    }

    function parseAdvancedError(e, text) {
        const msg = e.message;
        const match = msg.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1], 10);
            const excerpt = text.substring(0, pos);
            const lines = excerpt.split('\n');
            const row = lines.length;
            const col = lines[lines.length - 1].length + 1;
            return `L${row}, Col ${col}: Invalid Syntax`;
        }
        return 'Invalid JSON';
    }

    // Live Validation on type
    ['Left', 'Right'].forEach(side => {
        const area = elements[`json${side}`];
        area.addEventListener('input', () => {
            updateStats(side);
            validateSide(side);
        });
        
        // Setup initial state
        updateStats(side);
    });

    function validateSide(side) {
        const txt = elements[`json${side}`].value.trim();
        if (!txt) {
            setStatus(side, true, 'Ready');
            if(side === 'Left') parsedLeft = null;
            if(side === 'Right') parsedRight = null;
            return true;
        }
        try {
            const parsed = JSON.parse(txt);
            setStatus(side, true, 'Valid JSON');
            if(side === 'Left') parsedLeft = parsed;
            if(side === 'Right') parsedRight = parsed;
            return true;
        } catch (e) {
            setStatus(side, false, parseAdvancedError(e, txt));
            if(side === 'Left') parsedLeft = null;
            if(side === 'Right') parsedRight = null;
            return false;
        }
    }

    // --- JSON Processing tools ---
    const sortObjectKeys = (o) => {
        if (o === null || typeof o !== 'object') return o;
        if (Array.isArray(o)) return o.map(sortObjectKeys);
        return Object.keys(o).sort().reduce((acc, key) => {
            acc[key] = sortObjectKeys(o[key]);
            return acc;
        }, {});
    };

    function executeTransformation(action) {
        ['Left', 'Right'].forEach(side => {
            const val = elements[`json${side}`].value.trim();
            if(!val) return;
            if(validateSide(side)) {
                let obj = side === 'Left' ? parsedLeft : parsedRight;
                if (elements.sortKeysToggle.checked) obj = sortObjectKeys(obj);
                
                if (action === 'format') {
                    elements[`json${side}`].value = JSON.stringify(obj, null, 2);
                } else {
                    elements[`json${side}`].value = JSON.stringify(obj);
                }
                updateStats(side);
                validateSide(side);
            }
        });
        showToast(`${action === 'format' ? 'Formatted' : 'Minified'} successfully`, action==='format' ? 'wand-magic-sparkles' : 'compress-alt');
    }

    elements.formatBtn.addEventListener('click', () => executeTransformation('format'));
    elements.minifyBtn.addEventListener('click', () => executeTransformation('minify'));

    elements.clearBtn.addEventListener('click', () => {
        elements.jsonLeft.value = '';
        elements.jsonRight.value = '';
        ['Left', 'Right'].forEach(s => {
            updateStats(s);
            validateSide(s);
            elements[`treeContent${s}`].innerHTML = `<div class="empty-tree-state"><i class="fas fa-sitemap"></i><p>Provide valid JSON to view the structure tree.</p></div>`;
        });
        showToast("Workspaces cleared", "trash-can");
    });

    // --- Scroll Syncing Logic ---
    function syncScrollAreas(primary, target, targetGutter) {
        const factor = target.scrollHeight - target.clientHeight;
        if (factor > 0) {
            const perc = primary.scrollTop / (primary.scrollHeight - primary.clientHeight);
            target.scrollTop = perc * factor;
            if (targetGutter) targetGutter.scrollTop = perc * factor;
        }
        target.scrollLeft = primary.scrollLeft;
    }

    let isSyncSrcLeft = false;
    let isSyncSrcRight = false;

    // Code Editor syncs
    elements.jsonLeft.addEventListener('scroll', function() {
        elements.linesLeft.scrollTop = this.scrollTop; // sync native gutter
        if (!isSyncSrcLeft && !elements.diffView.classList.contains('hidden') === false) { // Don't sync cross panels if Diff view is open
            isSyncSrcRight = true;
            syncScrollAreas(this, elements.jsonRight, elements.linesRight);
        }
        isSyncSrcLeft = false;
    });

    elements.jsonRight.addEventListener('scroll', function() {
        elements.linesRight.scrollTop = this.scrollTop; 
        if (!isSyncSrcRight && !elements.diffView.classList.contains('hidden') === false) {
            isSyncSrcLeft = true;
            syncScrollAreas(this, elements.jsonLeft, elements.linesLeft);
        }
        isSyncSrcRight = false;
    });

    // Handle Tab key
    [elements.jsonLeft, elements.jsonRight].forEach(el => {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = this.selectionStart;
                this.value = this.value.substring(0, s) + "  " + this.value.substring(this.selectionEnd);
                this.selectionEnd = s + 2;
                updateStats(el.id.includes('Left') ? 'Left' : 'Right');
            }
        });
    });


    // --- Visual Tree Renderer Tool ---
    function renderVisualTree(side) {
        if (!validateSide(side)) return;
        
        const obj = side === 'Left' ? parsedLeft : parsedRight;
        if (obj === null) return;
        
        const contentArea = elements[`treeContent${side}`];
        
        // Massive recursive builder as string
        function buildTreeHTML(key, value, isLast) {
            let type = typeof value;
            if (value === null) type = 'null';
            else if (Array.isArray(value)) type = 'array';
        
            let html = `<div class="json-node">`;
            let keyStr = key !== null ? `<span class="j-key">"${key}"</span><span class="j-bracket">: </span>` : '';
            
            if (type === 'object') {
                const keys = Object.keys(value);
                if (keys.length === 0) return html + keyStr + `<span class="j-bracket">{}</span>${isLast?'':','}</div>`;
                html += `<span class="j-toggle"><i class="fas fa-caret-down"></i></span>`;
                html += keyStr + `<span class="j-bracket">{</span><div class="j-children">`;
                keys.forEach((k, i) => html += buildTreeHTML(k, value[k], i === keys.length - 1));
                html += `</div><span class="j-bracket">}</span>${isLast?'':','}`;
            } else if (type === 'array') {
                if (value.length === 0) return html + keyStr + `<span class="j-bracket">[]</span>${isLast?'':','}</div>`;
                html += `<span class="j-toggle"><i class="fas fa-caret-down"></i></span>`;
                html += keyStr + `<span class="j-bracket">[</span><div class="j-children">`;
                value.forEach((v, i) => html += buildTreeHTML(null, v, i === value.length - 1));
                html += `</div><span class="j-bracket">]</span>${isLast?'':','}`;
            } else {
                let vStr = '';
                if (type === 'string') vStr = `<span class="j-str">"${value.replace(/"/g, '\\"')}"</span>`;
                else if (type === 'number') vStr = `<span class="j-num">${value}</span>`;
                else if (type === 'boolean') vStr = `<span class="j-bool">${value}</span>`;
                else if (type === 'null') vStr = `<span class="j-null">null</span>`;
                html += keyStr + vStr + (isLast?'':',');
            }
            return html + `</div>`;
        }

        contentArea.innerHTML = `<div style="padding-bottom: 2rem;">${buildTreeHTML(null, obj, true)}</div>`;
    }

    // Toggle tree carets via Event Delegation
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.j-toggle')) {
            const toggle = e.target.closest('.j-toggle');
            toggle.classList.toggle('collapsed');
            const children = toggle.parentElement.querySelector('.j-children');
            if (children) children.classList.toggle('hidden-node');
        }
    });

    // --- File Utilities ---
    ['Left', 'Right'].forEach(side => {
        const fileIn = document.getElementById(`upload${side}`);
        document.getElementById(`upload${side}Btn`).addEventListener('click', () => fileIn.click());
        
        fileIn.addEventListener('change', (e) => {
            const f = e.target.files[0];
            if(!f) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                elements[`json${side}`].value = re.target.result;
                updateStats(side);
                validateSide(side);
                fileIn.value = '';
                showToast(`Loaded ${f.name}`);
            };
            reader.readAsText(f);
        });

        document.getElementById(`download${side}Btn`).addEventListener('click', () => {
            const v = elements[`json${side}`].value;
            if(!v) return showToast('Nothing to download');
            const b = new Blob([v], {type: 'application/json'});
            const url = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = url;
            a.download = `exported_${side.toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById(`copy${side}Btn`).addEventListener('click', () => {
            const v = elements[`json${side}`].value;
            if(!v) return;
            navigator.clipboard.writeText(v).then(() => showToast('Copied to clipboard', 'copy'));
        });
    });


    // --- Advanced Diff Engine ---
    elements.backBtn.addEventListener('click', () => {
        elements.diffView.classList.add('hidden');
        elements.editorView.classList.remove('hidden');
    });

    elements.compareBtn.addEventListener('click', () => {
        if (!elements.jsonLeft.value.trim()) elements.jsonLeft.value = '{}';
        if (!elements.jsonRight.value.trim()) elements.jsonRight.value = '{}';

        const vl = validateSide('Left');
        const vr = validateSide('Right');
        if (!vl || !vr) return showToast('Fix JSON errors before comparing', 'triangle-exclamation');

        // Normalize JSON formats
        const prL = elements.sortKeysToggle.checked ? sortObjectKeys(parsedLeft) : parsedLeft;
        const prR = elements.sortKeysToggle.checked ? sortObjectKeys(parsedRight) : parsedRight;
        
        const txt1 = JSON.stringify(prL, null, 2);
        const txt2 = JSON.stringify(prR, null, 2);

        // Update to formatted views to make diff perfectly match text
        elements.jsonLeft.value = txt1;
        elements.jsonRight.value = txt2;
        updateStats('Left');
        updateStats('Right');
        
        renderDiffEngine(txt1, txt2);
        
        elements.editorView.classList.add('hidden');
        elements.diffView.classList.remove('hidden');
        showToast('Diff Analysis Complete', 'code-commit');
    });

    function createDiffDiv(txt, type, num) {
        const div = document.createElement('div');
        const cls = txt === null ? 'emp' : type;
        div.className = `d-line ${cls}`;

        const nDiv = document.createElement('div');
        nDiv.className = 'd-num';
        nDiv.textContent = num;

        const cDiv = document.createElement('div');
        cDiv.className = 'd-content';
        cDiv.textContent = txt !== null ? txt : ' ';

        div.appendChild(nDiv); div.appendChild(cDiv);
        return div;
    }

    function renderDiffEngine(str1, str2) {
        const l1 = str1.split('\n');
        const l2 = str2.split('\n');
        
        const diffArr = calculateLCS(l1, l2);
        
        elements.diffLeft.innerHTML = '';
        elements.diffRight.innerHTML = '';
        
        let adds = 0, dels = 0, mods = 0;
        let p1 = 1, p2 = 1;

        const fragL = document.createDocumentFragment();
        const fragR = document.createDocumentFragment();

        diffArr.forEach(d => {
            let num1 = '', num2 = '';
            if (d.left !== null) num1 = p1++;
            if (d.right !== null) num2 = p2++;

            const dL = createDiffDiv(d.left, d.type === 'added' ? 'emp' : (d.type === 'removed' ? 'del' : (d.type === 'changed' ? 'mod' : '')), num1);
            const dR = createDiffDiv(d.right, d.type === 'removed' ? 'emp' : (d.type === 'added' ? 'add' : (d.type === 'changed' ? 'mod' : '')), num2);

            fragL.appendChild(dL);
            fragR.appendChild(dR);

            if(d.type === 'added') adds++;
            if(d.type === 'removed') dels++;
            if(d.type === 'changed') mods++;
        });

        elements.diffLeft.appendChild(fragL);
        elements.diffRight.appendChild(fragR);

        elements.statAdd.textContent = adds;
        elements.statDel.textContent = dels;
        elements.statMod.textContent = mods;
        
        // Setup Diff Sync Scrollers
        elements.diffLeft.addEventListener('scroll', function() {
            elements.diffRight.scrollTop = this.scrollTop;
            elements.diffRight.scrollLeft = this.scrollLeft;
        });
        elements.diffRight.addEventListener('scroll', function() {
            elements.diffLeft.scrollTop = this.scrollTop;
            elements.diffLeft.scrollLeft = this.scrollLeft;
        });
    }

    function calculateLCS(lines1, lines2) {
        const m = lines1.length, n = lines2.length;
        if (m*n > 5000000) { // Safety ceiling for gigantic datasets
            const max = Math.max(m, n);
            const res = [];
            for (let i=0; i<max; i++) {
                if (i<m && i<n) res.push({type: lines1[i]===lines2[i]?'unchanged':'changed', left:lines1[i], right:lines2[i]});
                else if(i<m) res.push({type: 'removed', left:lines1[i], right:null});
                else res.push({type: 'added', left:null, right:lines2[i]});
            }
            return res;
        }

        const dp = Array(m+1).fill(0).map(()=>new Int32Array(n+1));
        for(let i=1;i<=m;i++){
            for(let j=1;j<=n;j++){
                if(lines1[i-1]===lines2[j-1]) dp[i][j] = dp[i-1][j-1]+1;
                else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
        
        const path = [];
        let i=m, j=n;
        while(i>0 || j>0){
            if (i>0 && j>0 && lines1[i-1]===lines2[j-1]) {
                path.unshift({type:'unchanged', left:lines1[i-1], right:lines2[j-1]});
                i--; j--;
            } else if (j>0 && (i===0 || dp[i][j-1]>=dp[i-1][j])) {
                path.unshift({type:'added', left:null, right:lines2[j-1]});
                j--;
            } else if (i>0 && (j===0 || dp[i][j-1]<dp[i-1][j])) {
                path.unshift({type:'removed', left:lines1[i-1], right:null});
                i--;
            }
        }

        // Refine remove+add into mod
        for(let k=0; k<path.length-1; k++) {
            if(path[k].type==='removed' && path[k+1].type==='added') {
                path[k].type = 'changed';
                path[k].right = path[k+1].right;
                path.splice(k+1, 1);
            }
        }
        return path;
    }
});

let simulationIntervals = [];

function clearSimulations() {
    simulationIntervals.forEach(id => clearTimeout(id));
    simulationIntervals = [];
}

function showTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    event.target.classList.add('active');
}


function simulatePaging() {
    clearSimulations();
    
    const refRaw = document.getElementById("ref-string").value.trim();
    const frameCount = parseInt(document.getElementById("frame-count").value);
    const algo = document.getElementById("algo-paging").value;

    if (!refRaw) { alert("Please enter a reference string"); return; }
    
    const pages = refRaw.split(/\s+/).map(Number);
    let frames = Array(frameCount).fill(null);
    let history = []; 
    let status = [];  
    let hits = 0, misses = 0;

    let pointer = 0; 
    let refBits = Array(frameCount).fill(0); 

   
    pages.forEach((page, timeStep) => {
        let isHit = false;
        let hitIndex = frames.indexOf(page);

        if (hitIndex !== -1) {
            isHit = true;
            hits++;
            if(algo === "SC") refBits[hitIndex] = 1; 
        } else {
            misses++;
            let replaceIdx = -1;

            if (frames.includes(null)) {
                replaceIdx = frames.indexOf(null);
                if(algo === "FIFO" || algo === "SC") {
                    replaceIdx = pointer;
                    pointer = (pointer + 1) % frameCount;
                }
            } else {
                if(algo === "FIFO") {
                    replaceIdx = pointer;
                    pointer = (pointer + 1) % frameCount;
                } 
                else if (algo === "LRU") {
                    let lastUses = frames.map(f => pages.slice(0, timeStep).lastIndexOf(f));
                    replaceIdx = lastUses.indexOf(Math.min(...lastUses));
                }
                else if (algo === "OPT") {
                    let nextUses = frames.map(f => {
                        let next = pages.slice(timeStep + 1).indexOf(f);
                        return next === -1 ? Infinity : next;
                    });
                    replaceIdx = nextUses.indexOf(Math.max(...nextUses));
                }
                else if (algo === "SC") {
                    while(true) {
                        if(refBits[pointer] === 0) {
                            replaceIdx = pointer;
                            pointer = (pointer + 1) % frameCount;
                            break;
                        }
                        refBits[pointer] = 0;
                        pointer = (pointer + 1) % frameCount;
                    }
                }
            }
            frames[replaceIdx] = page;
            if(algo === "SC") refBits[replaceIdx] = 0; 
        }

        history.push([...frames]);
        status.push(isHit ? "Hit" : "Miss");
    });

    renderPaging(pages, history, status, hits, misses, frameCount);
}

function renderPaging(pages, history, status, hits, misses, frameCount) {
    const container = document.getElementById("paging-result");
    const stats = document.getElementById("paging-stats");
    
    
    let html = `<table class="grid-table">`;
    
    
    html += `<tr><th style="background:#e5e7eb; color:#374151">Ref</th>`;
    pages.forEach((p, i) => html += `<th class="hidden-cell col-${i}">${p}</th>`);
    html += `</tr>`;

    
    for (let f = 0; f < frameCount; f++) {
        html += `<tr><td style="font-weight:900; color:#4f46e5">Frame ${f+1}</td>`;
        history.forEach((stepFrames, timeIndex) => {
            let val = stepFrames[f] === null ? '-' : stepFrames[f];
            html += `<td class="hidden-cell col-${timeIndex}">${val}</td>`;
        });
        html += `</tr>`;
    }

    
    html += `<tr><td style="font-weight:900">Status</td>`;
    status.forEach((s, i) => {
        let className = s === "Hit" ? "hit" : "miss";
        html += `<td class="status-cell ${className} hidden-cell col-${i}">${s}</td>`;
    });
    html += `</tr></table>`;

    container.innerHTML = html;
    stats.innerHTML = "";

    
    pages.forEach((_, colIndex) => {
        let timeoutId = setTimeout(() => {
            
            let cells = document.querySelectorAll(`.col-${colIndex}`);
            cells.forEach(c => c.classList.remove('hidden-cell'));
            cells.forEach(c => c.classList.add('reveal-cell'));
            
            
            if(colIndex === pages.length - 1) {
                let total = hits + misses;
                let ratio = total === 0 ? 0 : ((hits/total)*100).toFixed(2);
                stats.innerHTML = `
                    <div class="stat-box"><div class="stat-val">${hits}</div><div class="stat-label">Hits</div></div>
                    <div class="stat-box"><div class="stat-val">${misses}</div><div class="stat-label">Misses</div></div>
                    <div class="stat-box"><div class="stat-val">${ratio}%</div><div class="stat-label">Hit Ratio</div></div>
                `;
            }
        }, colIndex * 600);
        simulationIntervals.push(timeoutId);
    });
}


function simulateMemory() {
    clearSimulations();

    const blockRaw = document.getElementById("block-sizes").value.trim();
    const procRaw = document.getElementById("process-sizes").value.trim();
    const algo = document.getElementById("algo-mem").value;

    if(!blockRaw || !procRaw) { alert("Enter data"); return; }

    let blocks = blockRaw.split(/\s+/).map(Number);
    let originalBlocks = [...blocks];
    let processes = procRaw.split(/\s+/).map(Number);
    let allocation = Array(processes.length).fill(-1); 
    let blockBusy = Array(blocks.length).fill(false);
    
    let nextFitPtr = 0;

    
    processes.forEach((pSize, pIdx) => {
        let bestIdx = -1;

        if(algo === "FF") {
            bestIdx = blocks.findIndex((b, i) => !blockBusy[i] && b >= pSize);
        }
        else if(algo === "NF") {
            let count = 0;
            let i = nextFitPtr;
            while(count < blocks.length) {
                if(!blockBusy[i] && blocks[i] >= pSize) {
                    bestIdx = i;
                    nextFitPtr = i;
                    break;
                }
                i = (i + 1) % blocks.length;
                count++;
            }
        }
        else if(algo === "BF") {
            let minDiff = Infinity;
            blocks.forEach((b, i) => {
                if(!blockBusy[i] && b >= pSize && (b - pSize) < minDiff) {
                    minDiff = b - pSize;
                    bestIdx = i;
                }
            });
        }
        else if(algo === "WF") {
            let maxDiff = -1;
            blocks.forEach((b, i) => {
                if(!blockBusy[i] && b >= pSize && (b - pSize) > maxDiff) {
                    maxDiff = b - pSize;
                    bestIdx = i;
                }
            });
        }

        if(bestIdx !== -1) {
            allocation[pIdx] = bestIdx;
            blockBusy[bestIdx] = true;
        }
    });

    renderMemory(processes, allocation, originalBlocks);
}

function renderMemory(processes, allocation, blocks) {
    const container = document.getElementById("memory-result");
    const stats = document.getElementById("memory-stats");

    
    let html = `<table class="grid-table" style="width:100%; text-align:left">
        <tr style="background:#f3f4f6">
            <th>Process ID</th>
            <th>Size</th>
            <th>Block Allocated</th>
            <th>Block Size</th>
            <th>Internal Fragmentation</th>
            <th>Status</th>
        </tr>`;

    
    let rowsData = [];
    let allocatedCount = 0;

    processes.forEach((p, i) => {
        let blockIdx = allocation[i];
        let status = blockIdx !== -1 ? "Allocated" : "Not Allocated";
        let statusClass = blockIdx !== -1 ? "hit" : "miss";
        let blockNo = blockIdx !== -1 ? blockIdx + 1 : "-";
        let blockSize = blockIdx !== -1 ? blocks[blockIdx] : "-";
        let frag = blockIdx !== -1 ? (blocks[blockIdx] - p) : "-";

        if(blockIdx !== -1) allocatedCount++;

        rowsData.push(`
            <tr class="hidden-cell row-${i}">
                <td>P-${i+1}</td>
                <td>${p}</td>
                <td>${blockNo}</td>
                <td>${blockSize}</td>
                <td>${frag}</td>
                <td><span class="status-cell ${statusClass}" style="padding:4px 8px; border-radius:4px">${status}</span></td>
            </tr>
        `);
    });

    
    html += `<tbody id="mem-body"></tbody></table>`;
    container.innerHTML = html;
    
    const tbody = document.getElementById("mem-body");
    stats.innerHTML = "";

   
    rowsData.forEach((rowHtml, index) => {
        let timeoutId = setTimeout(() => {
            
            tbody.insertAdjacentHTML('beforeend', rowHtml);
            
            
            let row = tbody.lastElementChild;
            requestAnimationFrame(() => {
                row.classList.remove('hidden-cell');
                row.classList.add('reveal-cell');
            });

            
            if(index === rowsData.length - 1) {
                stats.innerHTML = `
                    <div class="stat-box"><div class="stat-val">${allocatedCount}</div><div class="stat-label">Allocated</div></div>
                    <div class="stat-box"><div class="stat-val">${processes.length - allocatedCount}</div><div class="stat-label">Waiting</div></div>
                `;
            }

        }, index * 800);
        simulationIntervals.push(timeoutId);
    });
}
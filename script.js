// ---- TABS LOGIC ----
function openTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');

    contents.forEach(c => c.classList.remove('active-content'));
    buttons.forEach(b => b.classList.remove('active'));

    document.getElementById(tabName).classList.add('active-content');
    event.currentTarget.classList.add('active');
}

// ==========================================
//  PART 1: PAGE REPLACEMENT ALGORITHM
// ==========================================

function simulatePageReplacement() {
    const refInput = document.getElementById("reference").value;
    const framesInput = document.getElementById("frames").value;
    
    if(!refInput || !framesInput) {
        alert("Please enter reference string and frame count.");
        return;
    }

    const ref = refInput.trim().split(/\s+/).map(Number);
    const frameCount = parseInt(framesInput);
    const algo = document.getElementById("algorithm").value;

    let frames = Array(frameCount).fill(null);
    let refBits = Array(frameCount).fill(0);
    let pointer = 0; // FIFO/NextFit pointer
    let hits = 0;
    let misses = 0;
    const steps = [];

    ref.forEach((page, index) => {
        let status = "Hit";

        if (frames.includes(page)) {
            hits++;
            if (algo === "SC") {
                refBits[frames.indexOf(page)] = 1;
            }
            if (algo === "LRU") {
                // For LRU, strictly speaking, we don't move data, but logic relies on history
                // No change to frames array needed on hit for standard visual representation
            }
        } else {
            misses++;
            status = "Miss";

            if (frames.includes(null)) {
                // If there is empty space, just fill it
                const emptyIdx = frames.indexOf(null);
                frames[emptyIdx] = page;
                if(algo === "FIFO" || algo === "SC") {
                    // FIFO pointer logic usually waits until full, but for visualizers:
                    // If we fill purely sequentially, pointer management depends on implementation.
                    // Here we let pointer stay 0 until full, or increment?
                    // Let's increment pointer to keep FIFO strict circular queue
                     pointer = (pointer + 1) % frameCount; 
                     // NOTE: Standard FIFO usually fills 0,1,2 then starts replacing 0. 
                     // My fix: If we just filled index 'emptyIdx', ensuring pointer tracks correctly involves just incrementing.
                }
            } 
            else {
                // Page Replacement Needed
                if (algo === "FIFO") {
                    frames[pointer] = page;
                    pointer = (pointer + 1) % frameCount;
                }
                else if (algo === "LRU") {
                    let lruIndex = 0;
                    let min = Infinity;
                    frames.forEach((f, i) => {
                        let lastUsed = ref.slice(0, index).lastIndexOf(f);
                        if (lastUsed < min) {
                            min = lastUsed;
                            lruIndex = i;
                        }
                    });
                    frames[lruIndex] = page;
                }
                else if (algo === "OPT") {
                    let farthest = -1;
                    let replaceIndex = 0;
                    frames.forEach((f, i) => {
                        let nextUse = ref.slice(index + 1).indexOf(f);
                        if (nextUse === -1) {
                            replaceIndex = i;
                            farthest = Infinity;
                        } else if (nextUse > farthest) {
                            farthest = nextUse;
                            replaceIndex = i;
                        }
                    });
                    frames[replaceIndex] = page;
                }
                else if (algo === "SC") {
                    while (true) {
                        if (refBits[pointer] === 0) {
                            frames[pointer] = page;
                            refBits[pointer] = 1; // New pages get a second chance initially? Usually No, but referenced ones do.
                            // Standard SC: Replace found 0, set its R=1? No, set new page to R=0 or R=1 depending on variant. 
                            // Usually new page enters with R=0. But if it's hit, R=1.
                            refBits[pointer] = 0; // Reset for new page
                            pointer = (pointer + 1) % frameCount;
                            break;
                        } else {
                            refBits[pointer] = 0; // Give second chance
                            pointer = (pointer + 1) % frameCount;
                        }
                    }
                }
            }
        }

        steps.push({
            page,
            frames: [...frames],
            refBits: [...refBits],
            status
        });
    });

    renderPagingTable(steps, frameCount, algo, hits, misses);
}

function renderPagingTable(steps, frameCount, algo, hits, misses) {
    let tableHTML = "<table><tr><th>Page</th>";
    for (let i = 0; i < frameCount; i++) tableHTML += `<th>Frame ${i+1}</th>`;
    tableHTML += "<th>Status</th></tr></table>";

    document.getElementById("output-paging").innerHTML = tableHTML;
    const table = document.querySelector("#output-paging table");

    steps.forEach((step, index) => {
        setTimeout(() => {
            const row = document.createElement("tr");
            row.classList.add("step-row");
            row.innerHTML = `<td>${step.page}</td>`;

            step.frames.forEach((f, i) => {
                let cellContent = f !== null ? f : "-";
                if (algo === "SC") {
                    cellContent += `<span class="ref-bit">R=${step.refBits[i]}</span>`;
                }
                row.innerHTML += `<td>${cellContent}</td>`;
            });

            row.innerHTML += `<td class="${step.status === 'Hit' ? 'hit' : 'miss'}">${step.status}</td>`;
            table.appendChild(row);

            requestAnimationFrame(() => row.classList.add("show"));
        }, index * 500);
    });

    const total = hits + misses;
    document.getElementById("summary-paging").innerHTML = `
        Hits: ${hits} | Misses: ${misses} <br>
        Hit Ratio: ${(hits / total).toFixed(2)} | Miss Ratio: ${(misses / total).toFixed(2)}
    `;
}


// ==========================================
//  PART 2: MEMORY ALLOCATION ALGORITHM
// ==========================================

function simulateMemoryAllocation() {
    const blockSizeInput = document.getElementById("block-sizes").value;
    const procSizeInput = document.getElementById("process-sizes").value;

    if(!blockSizeInput || !procSizeInput) {
        alert("Please enter block sizes and process sizes.");
        return;
    }

    // Clone arrays because we modify blocks (mark them as busy)
    // We assume Fixed Partitioning: A block can hold 1 process.
    let originalBlocks = blockSizeInput.trim().split(/\s+/).map(Number);
    let processes = procSizeInput.trim().split(/\s+/).map(Number);
    let algo = document.getElementById("mem-algorithm").value;

    let blocks = [...originalBlocks]; // Size of blocks
    let allocation = new Array(processes.length).fill(-1); // Stores block index for each process
    let blockStatus = new Array(blocks.length).fill(false); // false = free, true = busy
    
    // For Next Fit
    let lastAllocatedIndex = 0;

    let steps = [];

    processes.forEach((process, pIndex) => {
        let bestIdx = -1;

        if (algo === "FF") { // First Fit
            for (let i = 0; i < blocks.length; i++) {
                if (!blockStatus[i] && blocks[i] >= process) {
                    bestIdx = i;
                    break;
                }
            }
        } 
        else if (algo === "NF") { // Next Fit
            let count = 0;
            let i = lastAllocatedIndex;
            
            // Search circularly starting from lastAllocatedIndex
            while (count < blocks.length) {
                if (!blockStatus[i] && blocks[i] >= process) {
                    bestIdx = i;
                    lastAllocatedIndex = i; // Update pointer
                    break;
                }
                i = (i + 1) % blocks.length;
                count++;
            }
        }
        else if (algo === "BF") { // Best Fit
            let minFrag = Infinity;
            for (let i = 0; i < blocks.length; i++) {
                if (!blockStatus[i] && blocks[i] >= process) {
                    let frag = blocks[i] - process;
                    if (frag < minFrag) {
                        minFrag = frag;
                        bestIdx = i;
                    }
                }
            }
        }
        else if (algo === "WF") { // Worst Fit
            let maxFrag = -1;
            for (let i = 0; i < blocks.length; i++) {
                if (!blockStatus[i] && blocks[i] >= process) {
                    let frag = blocks[i] - process;
                    if (frag > maxFrag) {
                        maxFrag = frag;
                        bestIdx = i;
                    }
                }
            }
        }

        // Save Step
        let status = "Not Allocated";
        let frag = "-";
        let blockId = "-";
        let blockSize = "-";

        if (bestIdx !== -1) {
            blockStatus[bestIdx] = true; // Mark block as busy
            allocation[pIndex] = bestIdx;
            
            status = "Allocated";
            blockId = bestIdx + 1; // 1-based index for display
            blockSize = blocks[bestIdx];
            frag = blockSize - process;
        }

        steps.push({
            pId: pIndex + 1,
            pSize: process,
            blockId: blockId,
            blockSize: blockSize,
            frag: frag,
            status: status
        });
    });

    renderMemoryTable(steps);
}

function renderMemoryTable(steps) {
    let tableHTML = `
        <table>
            <tr>
                <th>Process No.</th>
                <th>Process Size</th>
                <th>Block No.</th>
                <th>Block Size</th>
                <th>Fragment</th>
                <th>Status</th>
            </tr>
        </table>`;

    document.getElementById("output-memory").innerHTML = tableHTML;
    const table = document.querySelector("#output-memory table");

    steps.forEach((step, index) => {
        setTimeout(() => {
            const row = document.createElement("tr");
            row.classList.add("step-row");

            row.innerHTML = `
                <td>${step.pId}</td>
                <td>${step.pSize}</td>
                <td>${step.blockId}</td>
                <td>${step.blockSize}</td>
                <td>${step.frag}</td>
                <td class="${step.status === 'Allocated' ? 'allocated' : 'not-allocated'}">${step.status}</td>
            `;

            table.appendChild(row);
            requestAnimationFrame(() => row.classList.add("show"));
        }, index * 500); // Animation delay
    });
    
    // Calculate simple stats
    const allocatedCount = steps.filter(s => s.status === "Allocated").length;
    document.getElementById("summary-memory").innerHTML = `
        Total Processes: ${steps.length} <br>
        Allocated: ${allocatedCount} <br>
        Not Allocated: ${steps.length - allocatedCount}
    `;
}
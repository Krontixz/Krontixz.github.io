const krontixzFileInput = document.getElementById('krontixz-file-upload');
const krontixzActionButtons = document.getElementById('krontixz-action-buttons');
const krontixzRawBtn = document.getElementById('krontixz-raw-btn');
const krontixzDecodedBtn = document.getElementById('krontixz-decoded-btn');
const krontixzRawSection = document.getElementById('krontixz-raw-section');
const krontixzDecodedSection = document.getElementById('krontixz-decoded-section');
const krontixzHexOutput = document.getElementById('krontixz-hex-output');
const krontixzTextEditor = document.getElementById('krontixz-text-editor');
const krontixzSaveBytecodeBtn = document.getElementById('krontixz-save-bytecode-btn');
const krontixzDownloadBtn = document.getElementById('krontixz-download-btn');

let krontixzCurrentFileBuffer = null;
let krontixzCurrentFileName = 'file.bin';

function krontixzInitDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('krontixz_db', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function krontixzStoreFile(buffer, name) {
    const db = await krontixzInitDB();
    const transaction = db.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    store.put({ buffer: buffer, name: name }, 'current_file');
}

krontixzFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    krontixzCurrentFileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    krontixzCurrentFileBuffer = arrayBuffer;
    
    await krontixzStoreFile(arrayBuffer, file.name);
    
    krontixzActionButtons.style.display = 'flex';
    krontixzRawSection.style.display = 'none';
    krontixzDecodedSection.style.display = 'none';
});

krontixzRawBtn.addEventListener('click', () => {
    if (!krontixzCurrentFileBuffer) return;
    
    krontixzDecodedSection.style.display = 'none';
    krontixzRawSection.style.display = 'block';
    
    const bytes = new Uint8Array(krontixzCurrentFileBuffer);
    let hexString = '';
    
    for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        const offset = i.toString(16).padStart(8, '0');
        
        let hexPart = '';
        let asciiPart = '';
        
        for (let j = 0; j < 16; j++) {
            if (j < chunk.length) {
                hexPart += chunk[j].toString(16).padStart(2, '0') + ' ';
                const char = chunk[j];
                asciiPart += (char >= 32 && char <= 126) ? String.fromCharCode(char) : '.';
            } else {
                hexPart += '   ';
            }
        }
        
        hexString += `${offset}  ${hexPart} |${asciiPart}|\n`;
    }
    
    krontixzHexOutput.textContent = hexString;
});

krontixzDecodedBtn.addEventListener('click', () => {
    if (!krontixzCurrentFileBuffer) return;
    
    krontixzRawSection.style.display = 'none';
    krontixzDecodedSection.style.display = 'block';
    
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(krontixzCurrentFileBuffer);
    krontixzTextEditor.value = text;
});

krontixzSaveBytecodeBtn.addEventListener('click', async () => {
    const text = krontixzTextEditor.value;
    const encoder = new TextEncoder();
    krontixzCurrentFileBuffer = encoder.encode(text).buffer;
    await krontixzStoreFile(krontixzCurrentFileBuffer, krontixzCurrentFileName);
    alert('Successfully re-encoded into bytecode format in memory!');
});

krontixzDownloadBtn.addEventListener('click', () => {
    if (!krontixzCurrentFileBuffer) return;
    
    const text = krontixzTextEditor.value;
    const encoder = new TextEncoder();
    const bufferToDownload = encoder.encode(text);
    
    const blob = new Blob([bufferToDownload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = krontixzCurrentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

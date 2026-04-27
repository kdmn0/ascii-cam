// ASCII Karakterler - parlaklığa göre sıralanmış (açık → koyu)
const ASCII_CHARS = ' .,;:=|!/+*#%@█';

// DOM Elementleri
const video = document.getElementById('video');
const canvas = document.getElementById('tempCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const asciiCanvas = document.getElementById('asciiCanvas');
const statusDiv = document.getElementById('status');

// Kontroller
const brightnessSlider = document.getElementById('brightness');
const textColorInput = document.getElementById('textColor');
const bgColorInput = document.getElementById('bgColor');
const captureBtn = document.getElementById('captureBtn');
const timerCheckbox = document.getElementById('timerCheckbox');
const exportTxtBtn = document.getElementById('exportTxt');
const exportJpgBtn = document.getElementById('exportJpg');
const exportPngBtn = document.getElementById('exportPng');

// Değişkenler
let isMovieMode = true;
let isCapturing = false;
let brightness = -30;
let charScale = 6;
let timerActive = false;
let lastCapturedImage = null;
let showingCapture = false;

// Başlatma
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            setupCanvas();
            statusDiv.textContent = '✓ Kamera aktif';
            statusDiv.className = 'status success';
            if (isMovieMode) {
                renderASCII();
            }
        };
    } catch (error) {
        statusDiv.textContent = '✗ Kamera erişimi reddedildi: ' + error.message;
        statusDiv.className = 'status error';
    }
}

function setupCanvas() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Video en boy oranını asciiCanvas'a uygula
    const aspectRatio = video.videoWidth / video.videoHeight;
    asciiCanvas.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    
    adjustCharScale();
}

function adjustCharScale() {
    const containerWidth = asciiCanvas.offsetWidth - 20;
    const containerHeight = asciiCanvas.offsetHeight - 20;
    
    const charWidth = 4.5;
    const charHeight = 7.7;
    
    // Container'a sığabilecek max karakter sayısı
    const maxCharsWidth = Math.floor(containerWidth / charWidth);
    const maxCharsHeight = Math.floor(containerHeight / charHeight);
    
    // Video boyutunu target karakter sayısına map et
    const pixelSampleWidth = Math.max(1, Math.floor(canvas.width / maxCharsWidth));
    const pixelSampleHeight = Math.max(1, Math.floor(canvas.height / maxCharsHeight));
    
    charScale = pixelSampleWidth;
    window.pixelSampleHeight = pixelSampleHeight;
    window.maxCharsWidth = maxCharsWidth;
    window.maxCharsHeight = maxCharsHeight;
}

function renderASCII() {
    if (showingCapture) {
        requestAnimationFrame(renderASCII);
        return;
    }
    
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const asciiArt = convertToASCII(imageData);
    displayASCII(asciiArt);
    
    requestAnimationFrame(renderASCII);
}

function convertToASCII(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelSampleWidth = Math.floor(charScale);
    const pixelSampleHeight = window.pixelSampleHeight || pixelSampleWidth;
    const maxCharsWidth = window.maxCharsWidth || Math.floor(width / pixelSampleWidth);
    const maxCharsHeight = window.maxCharsHeight || Math.floor(height / pixelSampleHeight);
    
    let ascii = '';
    
    for (let line = 0; line < maxCharsHeight; line++) {
        const y = Math.floor(line * height / maxCharsHeight);
        for (let col = 0; col < maxCharsWidth; col++) {
            const x = Math.floor(col * width / maxCharsWidth);
            const index = (y * width + x) * 4;
            
            // Gri tonlama
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const gray = (r + g + b) / 3;
            
            // Parlaklık ayarlaması
            const adjusted = Math.min(255, Math.max(0, gray + brightness * 2.55));
            
            // ASCII karakterine dönüştür
            const charIndex = Math.floor((adjusted / 255) * (ASCII_CHARS.length - 1));
            ascii += ASCII_CHARS[charIndex];
        }
        ascii += '\n';
    }
    
    return ascii;
}

function displayASCII(ascii) {
    const textColor = textColorInput.value;
    const bgColor = bgColorInput.value;
    
    asciiCanvas.style.color = textColor;
    asciiCanvas.style.backgroundColor = bgColor;
    asciiCanvas.textContent = ascii;
}

function capturePhoto() {
    if (!video.srcObject) {
        statusDiv.textContent = '✗ Kamera hazır değil';
        statusDiv.className = 'status error';
        return;
    }
    
    isCapturing = true;
    
    let countdown = 3;
    const countdownInterval = setInterval(() => {
        if (countdown > 0) {
            statusDiv.textContent = countdown;
            statusDiv.className = 'status';
            countdown--;
        } else {
            clearInterval(countdownInterval);
            
            // Fotoğraf çek
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            ctx.drawImage(video, 0, 0);
            ctx.restore();
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const asciiArt = convertToASCII(imageData);
            displayASCII(asciiArt);
            lastCapturedImage = asciiArt;
            showingCapture = true;
            
            statusDiv.textContent = '\u2713 Fotoğraf çekildi';
            statusDiv.className = 'status success';
            isCapturing = false;
            
            // 2 saniye sonra video'ya dön
            setTimeout(() => {
                showingCapture = false;
            }, 2000);
        }
    }, 1000);
}

// Event Listeners
brightnessSlider.addEventListener('input', (e) => {
    brightness = parseInt(e.target.value);
    document.getElementById('brightnessValue').textContent = brightness > 0 ? '+' + brightness : brightness;
});

textColorInput.addEventListener('input', () => {
    if (lastCapturedImage && showingCapture) {
        displayASCII(lastCapturedImage);
    }
});

bgColorInput.addEventListener('input', () => {
    if (lastCapturedImage && showingCapture) {
        displayASCII(lastCapturedImage);
    }
});

captureBtn.addEventListener('click', () => {
    if (timerCheckbox && timerCheckbox.checked) {
        capturePhoto();
    } else {
        // Hemen çek
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.drawImage(video, 0, 0);
        ctx.restore();
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const asciiArt = convertToASCII(imageData);
        displayASCII(asciiArt);
        lastCapturedImage = asciiArt;
        showingCapture = true;
        statusDiv.textContent = '\u2713 Fotoğraf çekildi';
        statusDiv.className = 'status success';
        
        // 2 saniye sonra video'ya dön
        setTimeout(() => {
            showingCapture = false;
        }, 2000);
    }
});

// Dışa aktarma fonksiyonları
function downloadTxt() {
    if (!lastCapturedImage) {
        statusDiv.textContent = '✗ Kaydedilecek fotoğraf yok';
        statusDiv.className = 'status error';
        return;
    }
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(lastCapturedImage));
    element.setAttribute('download', 'ascii_' + Date.now() + '.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    statusDiv.textContent = '✓ .txt dosyası indirildi';
    statusDiv.className = 'status success';
}

function downloadAsImage(format) {
    if (!lastCapturedImage) {
        statusDiv.textContent = '✗ Kaydedilecek fotoğraf yok';
        statusDiv.className = 'status error';
        return;
    }
    
    // Canvas'a ASCII sanatını çiz
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const fontSize = parseInt(charScale) + 2;
    const lineHeight = fontSize + 2;
    const lines = lastCapturedImage.split('\n');
    
    tempCanvas.width = 800;
    tempCanvas.height = lines.length * lineHeight;
    
    const bgColor = bgColorInput.value;
    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.font = `${fontSize}px 'Courier New', monospace`;
    tempCtx.fillStyle = textColorInput.value;
    
    lines.forEach((line, index) => {
        tempCtx.fillText(line, 10, (index + 1) * lineHeight);
    });
    
    const element = document.createElement('a');
    element.setAttribute('href', tempCanvas.toDataURL('image/' + format));
    element.setAttribute('download', 'ascii_' + Date.now() + '.' + format);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    statusDiv.textContent = '✓ .' + format + ' dosyası indirildi';
    statusDiv.className = 'status success';
}

exportTxtBtn.addEventListener('click', downloadTxt);
exportJpgBtn.addEventListener('click', () => downloadAsImage('jpg'));
exportPngBtn.addEventListener('click', () => downloadAsImage('png'));

// Klavye Kısayolları
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        captureBtn.click();
    } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadTxt();
    } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        brightness = 0;
        charScale = 6;
        brightnessSlider.value = 0;
        document.getElementById('brightnessValue').textContent = '0';
        statusDiv.textContent = '✓ Ayarlar sıfırlandı';
        statusDiv.className = 'status success';
    }
});

// Pencere yeniden boyutlandırıldığında karakterleri ayarla
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        adjustCharScale();
        if (isMovieMode) {
            renderASCII();
        } else if (lastCapturedImage) {
            displayASCII(lastCapturedImage);
        }
    }, 300);
});

// Başlatma
init();

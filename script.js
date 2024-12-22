document.documentElement.style.visibility = 'hidden'; // 初始隐藏页面

let isDarkMode = false;
let currentBgColor = null; // 存储当前背景色

// 从图片中获取主色调
function getImageColor(imgUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                
                // 增加采样点数量
                const sampleCount = 20;
                let r = 0, g = 0, b = 0;
                let validSamples = 0;
                
                for(let i = 0; i < sampleCount; i++) {
                    const randomPixel = Math.floor(Math.random() * (imageData.length / 4)) * 4;
                    // 跳过接近白色的像
                    if (imageData[randomPixel] < 240 || 
                        imageData[randomPixel + 1] < 240 || 
                        imageData[randomPixel + 2] < 240) {
                        r += imageData[randomPixel];
                        g += imageData[randomPixel + 1];
                        b += imageData[randomPixel + 2];
                        validSamples++;
                    }
                }
                
                if (validSamples === 0) {
                    // 如果所有采样点都接近白色，重新采样
                    reject(new Error('Invalid color sample'));
                    return;
                }
                
                // 计算平均值并调整亮度
                r = Math.min(255, Math.floor((r / validSamples) + 50));
                g = Math.min(255, Math.floor((g / validSamples) + 50));
                b = Math.min(255, Math.floor((b / validSamples) + 50));
                
                resolve({r, g, b});
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imgUrl;
    });
}

// 等待背景图片加载完成
function waitForBackgroundImage() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkImage = () => {
            const container = document.querySelector('.login-container');
            if (container) {
                const computedStyle = window.getComputedStyle(container);
                const bgImage = computedStyle.backgroundImage;
                if (bgImage && bgImage !== 'none') {
                    const url = bgImage.slice(5, -2);
                    resolve(url);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkImage, 200);
                } else {
                    reject(new Error('Background image not found'));
                }
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkImage, 200);
            } else {
                reject(new Error('Container not found'));
            }
        };
        checkImage();
    });
}

// 设置网页背景色
function setPageBackground(color) {
    const root = document.documentElement;
    const {r, g, b} = color;
    
    currentBgColor = color;
    
    if (!isDarkMode) {
        // 计算最终颜色（浅色模式）
        const finalColor = `rgb(${r}, ${g}, ${b})`;
        
        // 设置所有背景相关的颜色为完全相同的颜色
        root.style.setProperty('--page-bg', finalColor);
        root.style.setProperty('--gradient-start', finalColor);
        root.style.setProperty('--gradient-end', finalColor);
        
        // 设置标签栏颜色
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', finalColor);
        }
    } else {
        // 深色模式下的颜色处理
        const darkR = Math.floor(r * 0.3);
        const darkG = Math.floor(g * 0.3);
        const darkB = Math.floor(b * 0.3);
        const darkColor = `rgb(${darkR}, ${darkG}, ${darkB})`;
        
        // 设置标签栏颜色
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', darkColor);
        }
    }
}

function setTheme(dark) {
    const wasLight = !isDarkMode;
    isDarkMode = dark;
    const root = document.documentElement;
    
    root.style.visibility = 'hidden';
    
    if (isDarkMode) {
        root.setAttribute('data-theme', 'dark');
        root.style.removeProperty('--page-bg');
        root.style.removeProperty('--gradient-start');
        root.style.removeProperty('--gradient-end');
        
        // 深色模式下也获取背景颜色（仅用于标签栏）
        if (currentBgColor) {
            setPageBackground(currentBgColor);
            root.style.visibility = 'visible';
        } else {
            waitForBackgroundImage()
                .then(getImageColor)
                .then(setPageBackground)
                .finally(() => {
                    root.style.visibility = 'visible';
                });
        }
    } else {
        root.setAttribute('data-theme', 'light');
        if (currentBgColor) {
            setPageBackground(currentBgColor);
            root.style.visibility = 'visible';
        } else {
            waitForBackgroundImage()
                .then(getImageColor)
                .then(setPageBackground)
                .finally(() => {
                    root.style.visibility = 'visible';
                });
        }
    }
}

// 初始化主题（只在页面加载时执行一次）
function initTheme() {
    const hour = new Date().getHours();
    // 修改时间范围：19:00 - 07:00 为深色模式
    isDarkMode = hour >= 19 || hour < 7;
    setTheme(isDarkMode);
}

// 页面加载时设置背景色（修改为不论深浅模式都获取颜色）
window.addEventListener('load', () => {
    const trySetBackground = () => {
        waitForBackgroundImage()
            .then(getImageColor)
            .then(setPageBackground)
            .catch(error => {
                console.log('Retrying color extraction...', error);
                setTimeout(trySetBackground, 500);
            })
            .finally(() => {
                document.documentElement.style.visibility = 'visible';
            });
    };
    
    trySetBackground();
});

// 添加按钮点击事件
document.getElementById('theme-toggle').addEventListener('click', () => {
    setTheme(!isDarkMode);
});

// 页面加载时初始化主题（只执行一次）
initTheme();

// 移除自动切换的定时器
// setInterval(autoSetTheme, 60000); 
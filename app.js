/* -------------------------------------------------------------
   app.js  |  EPUB 閱讀器核心邏輯
----------------------------------------------------------------
   主要功能：
   1.  EPUB 載入與渲染 (使用 epub.js)
   2.  分頁 / 卷軸閱讀模式切換
   3.  翻頁控制、閱讀進度、章節標題顯示
   4.  目錄 (TOC) 生成與跳轉
   5.  書籤 / 筆記 / 劃重點 (記憶體內管理)
   6.  全文搜尋
   7.  個性化設定 (字體大小、行距、字體家族、頁面邊距、主題)
   8.  手勢翻頁、快捷鍵
   9.  演示模式
   ----------------------------------------------------------- */

// -------------- DOM 快速選擇工具 --------------
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// -------------- 畫面區域 --------------
const welcomeScreen  = $('#welcome-screen');
const loadingScreen  = $('#loading-screen');
const readerScreen   = $('#reader-screen');

// -------------- Welcome 畫面元素 --------------
const uploadArea     = $('#upload-area');
const fileInput      = $('#file-input');
const uploadBtn      = $('#upload-btn');
const demoBtn        = $('#demo-btn');

// -------------- Loading 畫面元素 --------------
const loadingText    = $('#loading-text');
const loadingBar     = $('#loading-progress');

// -------------- Reader 主要元素 --------------
const viewer         = $('#viewer');
const bookTitleEl    = $('#book-title');
const prevBtn        = $('#prev-btn');
const nextBtn        = $('#next-btn');
const progressSlider = $('#progress-slider');
const currentChapterEl = $('#current-chapter');
const readingProgressEl = $('#reading-progress');

// 工具列按鈕
const backBtn        = $('#back-btn');
const tocBtn         = $('#toc-btn');
const bookmarkMainBtn= $('#bookmark-btn');
const settingsBtn    = $('#settings-btn');
const searchBtn      = $('#search-btn');

// 側邊欄與面板
const tocSidebar     = $('#toc-sidebar');
const tocList        = $('#toc-list');
const bookmarkSidebar= $('#bookmark-sidebar');
const closeTocBtn    = $('#close-toc');
const closeBookmarkBtn = $('#close-bookmark');
const searchPanel    = $('#search-panel');
const searchInput    = $('#search-input');
const searchExecute  = $('#search-execute');
const closeSearchBtn = $('#close-search');
const searchResults  = $('#search-results');

const settingsPanel  = $('#settings-panel');
const closeSettingsBtn = $('#close-settings');

// 個性化設定元素
const readingModeRadios = $$('input[name="reading-mode"]');
const fontSizeSlider = $('#font-size-slider');
const fontSizeValue  = $('#font-size-value');
const fontFamilySelect = $('#font-family-select');
const lineHeightSlider = $('#line-height-slider');
const lineHeightValue  = $('#line-height-value');
const marginSlider   = $('#margin-slider');
const marginValue    = $('#margin-value');
const themeButtons   = $$('.theme-btn');

// 書籤/筆記/高亮
const tabButtons     = $$('.tab-btn');
const bookmarksList  = $('#bookmarks-list');
const notesList      = $('#notes-list');
const highlightsList = $('#highlights-list');

// 選取工具 & 筆記 modal
const selectionTooltip = $('#selection-tooltip');
const highlightBtn   = $('#highlight-btn');
const noteBtn        = $('#note-btn');
const copyBtn        = $('#copy-btn');
const speakBtn       = $('#speak-btn');
const noteModal      = $('#note-modal');
const selectedTextDisplay = $('#selected-text-display');
const noteTextarea   = $('#note-textarea');
const closeNoteModal = $('#close-note-modal');
const cancelNoteBtn  = $('#cancel-note');
const saveNoteBtn    = $('#save-note');

// -------------- 全局狀態 --------------
let book           = null;        // epubjs Book 實例
let rendition      = null;        // epubjs Rendition
let currentLocation= null;        // 當前 CFI 位址
let flowMode       = 'paginated'; // paginated | scrolled
let bookmarks      = [];          // {cfi, label}
let notes          = [];          // {cfi, text, excerpt}
let highlights     = [];          // {cfi, excerpt}
let isDemoMode     = false;       // 是否為演示模式

// -------------- 演示內容 --------------
const demoContent = `
<!DOCTYPE html>
<html>
<head>
    <title>EPUB 閱讀器演示</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>歡迎使用 EPUB 閱讀器</h1>
    <p>這是一個功能豐富的現代化 EPUB 閱讀器演示。</p>
    
    <h2>主要功能</h2>
    <p>本閱讀器具備以下主要功能：</p>
    
    <h3>📖 多種閱讀模式</h3>
    <p>支援分頁模式和卷軸模式，讓您可以根據個人喜好選擇最舒適的閱讀方式。分頁模式模擬傳統書籍的翻頁體驗，而卷軸模式則提供連續滾動的閱讀體驗。</p>
    
    <h3>🔍 智能搜尋功能</h3>
    <p>內建強大的全文搜尋功能，可以快速找到您需要的內容。搜尋結果會高亮顯示，並提供上下文預覽，讓您快速定位到相關段落。</p>
    
    <h3>📝 筆記與書籤</h3>
    <p>您可以輕鬆添加書籤、做筆記、劃重點。所有的註解都會自動保存，方便您下次閱讀時快速回到重要內容。</p>
    
    <h3>🎨 個性化設定</h3>
    <p>提供豐富的個性化選項，包括：</p>
    <ul>
        <li>字體大小調整</li>
        <li>多種字體選擇</li>
        <li>行距設定</li>
        <li>頁面邊距調整</li>
        <li>多種閱讀主題（明亮、黑暗、護眼）</li>
    </ul>
    
    <h3>⌨️ 快捷鍵支援</h3>
    <p>支援常用快捷鍵操作：</p>
    <ul>
        <li>左右方向鍵：翻頁</li>
        <li>Ctrl+F：搜尋</li>
        <li>Ctrl+B：添加書籤</li>
        <li>ESC：關閉面板</li>
    </ul>
    
    <h3>📱 響應式設計</h3>
    <p>完美適配桌面、平板和手機設備，無論您使用什麼設備都能獲得優質的閱讀體驗。在移動設備上支援手勢翻頁操作。</p>
    
    <h2>使用技巧</h2>
    
    <h3>文字選取功能</h3>
    <p>選取任何文字段落，會出現工具提示，您可以：</p>
    <ul>
        <li>🖍️ 劃重點：為重要內容添加高亮</li>
        <li>📝 做筆記：記錄您的想法和見解</li>
        <li>📋 複製：將文字複製到剪貼簿</li>
        <li>🔊 朗讀：使用文字轉語音功能</li>
    </ul>
    
    <h3>導航技巧</h3>
    <p>使用頂部的目錄按鈕可以快速跳轉到不同章節。進度條不僅顯示閱讀進度，還可以拖拽快速跳轉到任意位置。</p>
    
    <h3>閱讀統計</h3>
    <p>底部進度條會實時顯示您的閱讀進度百分比和當前章節信息，幫助您掌握閱讀狀況。</p>
    
    <h2>開始使用</h2>
    <p>現在您可以試用所有功能：</p>
    <ol>
        <li>點擊右上角的設定按鈕調整閱讀偏好</li>
        <li>使用搜尋功能查找特定內容</li>
        <li>選取這段文字體驗筆記和劃重點功能</li>
        <li>雙擊書籤按鈕添加書籤</li>
        <li>使用左右箭頭鍵或底部按鈕翻頁</li>
    </ol>
    
    <p>這只是一個演示內容，展示了閱讀器的各項功能。在實際使用中，您可以載入任何 EPUB 格式的電子書，享受完整的數位閱讀體驗。</p>
    
    <h2>技術特點</h2>
    <p>本閱讀器採用現代 Web 技術構建，包括：</p>
    <ul>
        <li>基於 EPUB.js 的強大渲染引擎</li>
        <li>現代 CSS Grid 和 Flexbox 佈局</li>
        <li>ES6+ JavaScript 功能</li>
        <li>響應式設計原則</li>
        <li>無障礙功能支援</li>
    </ul>
    
    <p>感謝您使用我們的 EPUB 閱讀器！</p>
</body>
</html>
`;

// -------------- 初始化 --------------
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('正在初始化 EPUB 閱讀器...');
    
    // 檢查 epub.js 是否載入
    if (typeof ePub === 'undefined') {
        console.error('EPUB.js 未載入');
        alert('載入失敗：EPUB.js 庫未找到');
        return;
    }
    
    // 綁定事件
    bindEvents();
    
    // 初始化設定值
    initializeSettings();
    
    // 初始主題
    initTheme();
    
    console.log('EPUB 閱讀器初始化完成');
}

/* -------------------------------------------------------------
   事件綁定
---------------------------------------------------------------- */
function bindEvents() {
    // 文件上傳事件
    if (uploadArea) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.classList.contains('upload-icon') || e.target.classList.contains('upload-text')) {
                fileInput.click();
            }
        });
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }

    if (demoBtn) {
        demoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadDemoContent();
        });
    }

    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleFile(e.target.files[0]);
            }
        });
    }

    // 閱讀器控制事件
    if (backBtn) backBtn.addEventListener('click', () => showScreen(welcomeScreen));
    if (prevBtn) prevBtn.addEventListener('click', () => rendition && rendition.prev());
    if (nextBtn) nextBtn.addEventListener('click', () => rendition && rendition.next());
    
    if (progressSlider) {
        progressSlider.addEventListener('input', () => {
            if (book && rendition) {
                const percent = parseFloat(progressSlider.value) / 100;
                if (isDemoMode) {
                    // 演示模式的簡單進度處理
                    const totalPages = 10; // 假設10頁
                    const currentPage = Math.floor(percent * totalPages);
                    updateDemoProgress(percent);
                } else {
                    const cfi = book.locations.cfiFromPercentage(percent);
                    rendition.display(cfi);
                }
            }
        });
    }

    // 側邊欄和面板控制
    bindSidebarEvents();
    bindSettingsEvents();
    bindSelectionEvents();
    bindNoteModalEvents();

    // Tab 切換
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            $$('.tab-content').forEach(c => c.classList.remove('active'));
            const targetTab = $(`#${tab}-tab`);
            if (targetTab) targetTab.classList.add('active');
        });
    });

    // 快捷鍵
    document.addEventListener('keydown', handleKeydown);
}

function bindSidebarEvents() {
    if (tocBtn) {
        tocBtn.addEventListener('click', () => {
            tocSidebar.classList.add('active');
        });
    }
    if (closeTocBtn) {
        closeTocBtn.addEventListener('click', () => {
            tocSidebar.classList.remove('active');
        });
    }

    if (bookmarkMainBtn) {
        bookmarkMainBtn.addEventListener('click', () => {
            bookmarkSidebar.classList.add('active');
            renderBookmarks();
        });
        bookmarkMainBtn.addEventListener('dblclick', addBookmark);
    }
    if (closeBookmarkBtn) {
        closeBookmarkBtn.addEventListener('click', () => {
            bookmarkSidebar.classList.remove('active');
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchPanel.classList.remove('hidden');
            if (searchInput) searchInput.focus();
        });
    }
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            searchPanel.classList.add('hidden');
        });
    }
    if (searchExecute) searchExecute.addEventListener('click', executeSearch);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });
    }
}

/* -------------------------------------------------------------
   演示模式
---------------------------------------------------------------- */
function loadDemoContent() {
    isDemoMode = true;
    showScreen(loadingScreen);
    updateLoading('正在載入演示內容...', 20);
    
    // 模擬載入過程
    setTimeout(() => {
        updateLoading('正在初始化閱讀器...', 60);
        setTimeout(() => {
            updateLoading('完成!', 100);
            setTimeout(() => {
                initDemoMode();
            }, 500);
        }, 500);
    }, 1000);
}

function initDemoMode() {
    // 設定書名
    if (bookTitleEl) {
        bookTitleEl.textContent = 'EPUB 閱讀器演示';
    }
    
    // 創建演示內容
    if (viewer) {
        viewer.innerHTML = `
            <div style="padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; font-size: 16px;">
                ${demoContent.replace(/<!DOCTYPE html>.*?<body>/s, '').replace('</body></html>', '')}
            </div>
        `;
    }
    
    // 建立演示 TOC
    buildDemoTOC();
    
    // 初始化進度
    currentLocation = { start: { cfi: 'demo-start' } };
    updateDemoProgress(0);
    
    // 啟用文字選取功能
    enableDemoTextSelection();
    
    // 顯示閱讀器畫面
    showScreen(readerScreen);
}

function buildDemoTOC() {
    if (!tocList) return;
    
    tocList.innerHTML = '';
    const demoToc = [
        { label: '歡迎使用 EPUB 閱讀器', href: '#welcome' },
        { label: '主要功能', href: '#features' },
        { label: '使用技巧', href: '#tips' },
        { label: '開始使用', href: '#getting-started' },
        { label: '技術特點', href: '#technical' }
    ];
    
    demoToc.forEach(item => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = item.label;
        btn.addEventListener('click', () => {
            tocSidebar.classList.remove('active');
            // 在演示模式中，可以滾動到對應標題
            const heading = viewer.querySelector(`h1:contains("${item.label}"), h2:contains("${item.label}"), h3:contains("${item.label}")`);
            if (heading) {
                heading.scrollIntoView({ behavior: 'smooth' });
            }
        });
        li.appendChild(btn);
        tocList.appendChild(li);
    });
}

function enableDemoTextSelection() {
    if (!viewer) return;
    
    viewer.addEventListener('mouseup', (e) => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (!text) return;
        
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showSelectionTooltip(rect, 'demo-selection', text);
    });
}

function updateDemoProgress(percent) {
    if (progressSlider) {
        progressSlider.value = (percent * 100).toFixed(2);
    }
    if (readingProgressEl) {
        readingProgressEl.textContent = `${(percent * 100).toFixed(1)}%`;
    }
    if (currentChapterEl) {
        currentChapterEl.textContent = '演示內容';
    }
}

/* -------------------------------------------------------------
   Handle File Load
---------------------------------------------------------------- */
function handleFile(file) {
    // 基本檢查
    if (!file || !file.name.toLowerCase().endsWith('.epub')) {
        alert('請選擇 EPUB 檔案');
        return;
    }

    console.log('開始載入文件:', file.name);
    isDemoMode = false;

    // 顯示 Loading 畫面
    showScreen(loadingScreen);
    updateLoading('正在讀取檔案...', 10);

    try {
        // 使用 epub.js 載入檔案
        book = ePub(file);

        updateLoading('正在解析內容...', 30);

        // 監聽 book.ready 生成位置
        book.ready.then(() => {
            updateLoading('正在建立章節索引...', 60);
            return book.locations.generate(1000); // 基於字數切分位址
        }).then(() => {
            updateLoading('初始化閱讀器...', 90);
            initRendition();
            updateLoading('完成!', 100);
        }).catch(error => {
            console.error('EPUB 載入錯誤:', error);
            alert('載入 EPUB 失敗：' + error.message);
            showScreen(welcomeScreen);
        });

    } catch (err) {
        console.error('文件處理錯誤:', err);
        alert('載入 EPUB 失敗');
        showScreen(welcomeScreen);
    }
}

function updateLoading(text, percent) {
    if (loadingText) loadingText.textContent = text;
    if (loadingBar && percent !== undefined) {
        loadingBar.style.width = `${percent}%`;
    }
}

/* -------------------------------------------------------------
   初始化 Rendition (閱讀器)
---------------------------------------------------------------- */
function initRendition() {
    // 若已經有 rendition，先清除
    if (rendition) {
        rendition.destroy();
    }

    rendition = book.renderTo(viewer, { 
        width: '100%', 
        height: '100%', 
        flow: flowMode 
    });

    rendition.display();

    // 書名
    book.loaded.metadata.then(meta => {
        if (bookTitleEl) {
            bookTitleEl.textContent = meta.title || '未命名書籍';
        }
    });

    // 進度、章節資訊
    rendition.on('relocated', (location) => {
        currentLocation = location;
        updateProgress();
    });

    // 觸控手勢 (下一/上一頁)
    viewer.addEventListener('touchstart', handleTouchStart, false);
    viewer.addEventListener('touchend', handleTouchEnd, false);

    // 文字選取
    rendition.on('selected', (cfiRange, contents) => {
        const selection = contents.window.getSelection();
        const text = selection.toString().trim();
        if (!text) return;

        // 取得選取範圍座標
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showSelectionTooltip(rect, cfiRange, text);
    });

    // 建構 TOC
    buildTOC();

    // 顯示 Reader 畫面
    setTimeout(() => {
        showScreen(readerScreen);
    }, 500);
}

/* -------------------------------------------------------------
   畫面顯示控制
---------------------------------------------------------------- */
function showScreen(screen) {
    // 隱藏全部
    [welcomeScreen, loadingScreen, readerScreen].forEach((el) => {
        if (el) el.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
}

/* -------------------------------------------------------------
   翻頁控制 & 進度
---------------------------------------------------------------- */
function updateProgress() {
    if (!currentLocation || !book || !book.locations) return;
    
    try {
        const percent = book.locations.percentageFromCfi(currentLocation.start.cfi);
        if (progressSlider) {
            progressSlider.value = (percent * 100).toFixed(2);
        }
        if (readingProgressEl) {
            readingProgressEl.textContent = `${(percent * 100).toFixed(1)}%`;
        }
        
        // 章節名稱
        if (currentLocation && currentLocation.start && currentChapterEl) {
            const spineItem = book.spine.get(currentLocation.start.index);
            if (spineItem && book.navigation) {
                const tocItem = book.navigation.get(spineItem.href);
                currentChapterEl.textContent = tocItem ? tocItem.label : `章節 ${(currentLocation.start.index + 1)}`;
            }
        }
    } catch (error) {
        console.error('更新進度錯誤:', error);
    }
}

/* -------------------------------------------------------------
   手勢支援
---------------------------------------------------------------- */
let touchX = 0;
function handleTouchStart(e) {
    touchX = e.changedTouches[0].screenX;
}
function handleTouchEnd(e) {
    const diff = e.changedTouches[0].screenX - touchX;
    if (Math.abs(diff) < 60) return;
    if (diff > 0) {
        rendition.prev();
    } else {
        rendition.next();
    }
}

/* -------------------------------------------------------------
   目錄 (TOC)
---------------------------------------------------------------- */
function buildTOC() {
    if (!tocList || !book || !book.navigation) return;
    
    tocList.innerHTML = '';
    const toc = book.navigation.toc;
    
    function addTocItems(items, level = 0) {
        items.forEach(item => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.textContent = '  '.repeat(level) + item.label;
            btn.style.paddingLeft = `${level * 16 + 12}px`;
            btn.addEventListener('click', () => {
                tocSidebar.classList.remove('active');
                rendition.display(item.href);
            });
            li.appendChild(btn);
            tocList.appendChild(li);
            
            if (item.subitems && item.subitems.length) {
                addTocItems(item.subitems, level + 1);
            }
        });
    }
    
    addTocItems(toc);
}

/* -------------------------------------------------------------
   書籤管理
---------------------------------------------------------------- */
function addBookmark() {
    if (!currentLocation) return;
    const cfi = currentLocation.start.cfi;
    if (bookmarks.find(b => b.cfi === cfi)) return; // 已存在
    const label = currentChapterEl ? currentChapterEl.textContent : '未命名章節';
    bookmarks.push({ cfi, label });
    renderBookmarks();
    alert('書籤已添加');
}

function renderBookmarks() {
    if (!bookmarksList) return;
    
    bookmarksList.innerHTML = '';
    bookmarks.forEach((bookmark, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = bookmark.label;
        btn.addEventListener('click', () => {
            if (isDemoMode) {
                // 演示模式處理
                alert('演示模式：跳轉到書籤位置');
            } else {
                rendition.display(bookmark.cfi);
            }
            bookmarkSidebar.classList.remove('active');
        });
        li.appendChild(btn);
        bookmarksList.appendChild(li);
    });
}

/* -------------------------------------------------------------
   全文搜尋
---------------------------------------------------------------- */
function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchResults.innerHTML = '搜尋中...';
    
    if (isDemoMode) {
        // 演示模式的簡單搜尋
        setTimeout(() => {
            const demoResults = [
                { excerpt: `這是一個功能豐富的現代化 EPUB ${query} 演示。`, cfi: 'demo-1' },
                { excerpt: `支援分頁模式和卷軸模式，讓您可以根據個人喜好選擇最舒適的${query}方式。`, cfi: 'demo-2' }
            ];
            
            searchResults.innerHTML = '';
            if (demoResults.length === 0) {
                searchResults.textContent = '未找到結果';
                return;
            }
            
            demoResults.forEach(result => {
                const btn = document.createElement('button');
                btn.innerHTML = highlightQuery(result.excerpt, query);
                btn.addEventListener('click', () => {
                    searchPanel.classList.add('hidden');
                    alert('演示模式：跳轉到搜尋結果');
                });
                searchResults.appendChild(btn);
            });
        }, 1000);
        
    } else if (book) {
        book.ready.then(() => {
            return Promise.all(
                book.spine.spineItems.map(item => 
                    item.load(book.load.bind(book)).then(doc => {
                        const text = doc.documentElement.textContent || "";
                        const results = [];
                        const regex = new RegExp(escapeRegExp(query), 'gi');
                        let match;
                        while ((match = regex.exec(text)) !== null) {
                            const start = Math.max(0, match.index - 40);
                            const end = Math.min(text.length, match.index + query.length + 40);
                            results.push({
                                cfi: item.cfiBase,
                                excerpt: text.substring(start, end)
                            });
                        }
                        return results;
                    }).catch(() => [])
                )
            );
        }).then(allResults => {
            const results = allResults.flat();
            searchResults.innerHTML = '';
            
            if (!results.length) {
                searchResults.textContent = '未找到結果';
                return;
            }
            
            results.slice(0, 20).forEach(result => { // 限制顯示20個結果
                const btn = document.createElement('button');
                btn.innerHTML = highlightQuery(result.excerpt, query);
                btn.addEventListener('click', () => {
                    rendition.display(result.cfi);
                    searchPanel.classList.add('hidden');
                });
                searchResults.appendChild(btn);
            });
        }).catch(error => {
            console.error('搜尋錯誤:', error);
            searchResults.textContent = '搜尋失敗';
        });
    }
}

function highlightQuery(text, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* -------------------------------------------------------------
   個性化設定
---------------------------------------------------------------- */
function bindSettingsEvents() {
    // 閱讀模式切換
    readingModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            flowMode = e.target.value === 'scrolled' ? 'scrolled' : 'paginated';
            if (rendition) {
                rendition.flow(flowMode);
            }
        });
    });

    // 字體大小
    if (fontSizeSlider && fontSizeValue) {
        fontSizeSlider.addEventListener('input', () => {
            const size = `${fontSizeSlider.value}px`;
            fontSizeValue.textContent = size;
            if (rendition) {
                rendition.themes.fontSize(size);
            } else if (isDemoMode && viewer) {
                viewer.style.fontSize = size;
            }
        });
    }

    // 行距
    if (lineHeightSlider && lineHeightValue) {
        lineHeightSlider.addEventListener('input', () => {
            const height = lineHeightSlider.value;
            lineHeightValue.textContent = height;
            if (rendition) {
                rendition.themes.default({ 'body': { 'line-height': height }});
            } else if (isDemoMode && viewer) {
                viewer.style.lineHeight = height;
            }
        });
    }

    // 頁面邊距
    if (marginSlider && marginValue) {
        marginSlider.addEventListener('input', () => {
            const margin = `${marginSlider.value}px`;
            marginValue.textContent = margin;
            if (rendition) {
                rendition.themes.default({ 'body': { 'padding': `0 ${margin}` }});
            } else if (isDemoMode && viewer) {
                const content = viewer.querySelector('div');
                if (content) content.style.padding = `40px ${margin}`;
            }
        });
    }

    // 字體家族
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', () => {
            let family = '';
            switch (fontFamilySelect.value) {
                case 'serif':      family = 'serif'; break;
                case 'sans-serif': family = 'sans-serif'; break;
                case 'monospace':  family = 'monospace'; break;
                default:          family = '';
            }
            if (rendition) {
                rendition.themes.font(family);
            } else if (isDemoMode && viewer) {
                viewer.style.fontFamily = family;
            }
        });
    }

    // 主題
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const theme = btn.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
        });
    });
}

function initializeSettings() {
    // 設定預設值
    if (fontSizeValue) fontSizeValue.textContent = '16px';
    if (lineHeightValue) lineHeightValue.textContent = '1.5';
    if (marginValue) marginValue.textContent = '40px';
}

/* -------------------------------------------------------------
   文字選取 & 高亮 / 筆記 / 複製 / TTS
---------------------------------------------------------------- */
let selectionCfi = null;
let selectionText = '';

function bindSelectionEvents() {
    if (!selectionTooltip) return;

    document.addEventListener('click', (e) => {
        if (!selectionTooltip.contains(e.target)) {
            hideSelectionTooltip();
        }
    });

    // 劃重點
    if (highlightBtn) {
        highlightBtn.addEventListener('click', () => {
            if (!selectionCfi) return;
            
            if (isDemoMode) {
                // 演示模式的高亮處理
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.backgroundColor = 'yellow';
                    span.style.padding = '2px';
                    span.style.borderRadius = '2px';
                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        // 如果不能包圍，則使用其他方法
                        const contents = range.extractContents();
                        span.appendChild(contents);
                        range.insertNode(span);
                    }
                }
                highlights.push({ cfi: selectionCfi, excerpt: selectionText });
                renderHighlights();
            } else if (rendition) {
                try {
                    rendition.annotations.highlight(selectionCfi, {}, (e) => {}, 'hl', {
                        fill: 'yellow',
                        'fill-opacity': '0.3',
                    });
                    highlights.push({ cfi: selectionCfi, excerpt: selectionText });
                    renderHighlights();
                } catch (error) {
                    console.error('劃重點錯誤:', error);
                }
            }
            hideSelectionTooltip();
        });
    }

    // 複製
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(selectionText).then(() => {
                    alert('已複製到剪貼簿');
                });
            } else {
                // fallback
                const textArea = document.createElement('textarea');
                textArea.value = selectionText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('已複製到剪貼簿');
            }
            hideSelectionTooltip();
        });
    }

    // 筆記
    if (noteBtn) {
        noteBtn.addEventListener('click', () => {
            if (selectedTextDisplay) selectedTextDisplay.textContent = selectionText;
            if (noteTextarea) noteTextarea.value = '';
            if (noteModal) noteModal.classList.remove('hidden');
            hideSelectionTooltip();
        });
    }

    // TTS
    if (speakBtn) {
        speakBtn.addEventListener('click', () => {
            handleTTS();
            hideSelectionTooltip();
        });
    }
}

function showSelectionTooltip(rect, cfiRange, text) {
    if (!selectionTooltip) return;
    
    selectionCfi = cfiRange;
    selectionText = text;
    selectionTooltip.style.top = `${rect.top - 50 + window.scrollY}px`;
    selectionTooltip.style.left = `${rect.left + rect.width / 2 - 100}px`;
    selectionTooltip.classList.remove('hidden');
}

function hideSelectionTooltip() {
    if (selectionTooltip) {
        selectionTooltip.classList.add('hidden');
    }
}

function renderHighlights() {
    if (!highlightsList) return;
    
    highlightsList.innerHTML = '';
    highlights.forEach(h => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = h.excerpt.slice(0, 40) + (h.excerpt.length > 40 ? '…' : '');
        btn.addEventListener('click', () => {
            if (isDemoMode) {
                alert('演示模式：跳轉到高亮位置');
            } else if (rendition) {
                rendition.display(h.cfi);
            }
            bookmarkSidebar.classList.remove('active');
        });
        li.appendChild(btn);
        highlightsList.appendChild(li);
    });
}

function renderNotes() {
    if (!notesList) return;
    
    notesList.innerHTML = '';
    notes.forEach(n => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = `${n.text.slice(0, 40)}${n.text.length > 40 ? '…' : ''}`;
        btn.addEventListener('click', () => {
            if (isDemoMode) {
                alert(`演示模式：筆記內容\n"${n.excerpt}"\n\n筆記：${n.text}`);
            } else if (rendition) {
                rendition.display(n.cfi);
            }
            bookmarkSidebar.classList.remove('active');
        });
        li.appendChild(btn);
        notesList.appendChild(li);
    });
}

/* -------------------------------------------------------------
   筆記 Modal
---------------------------------------------------------------- */
function bindNoteModalEvents() {
    if (closeNoteModal) {
        closeNoteModal.addEventListener('click', () => {
            if (noteModal) noteModal.classList.add('hidden');
        });
    }
    
    if (cancelNoteBtn) {
        cancelNoteBtn.addEventListener('click', () => {
            if (noteModal) noteModal.classList.add('hidden');
        });
    }
    
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', () => {
            const text = noteTextarea ? noteTextarea.value.trim() : '';
            if (!text) return;
            notes.push({ cfi: selectionCfi, text, excerpt: selectionText });
            renderNotes();
            if (noteModal) noteModal.classList.add('hidden');
            alert('筆記已保存');
        });
    }
}

/* -------------------------------------------------------------
   快捷鍵支援
---------------------------------------------------------------- */
function handleKeydown(e) {
    // 避免在輸入框中觸發
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (rendition) rendition.prev();
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (rendition) rendition.next();
    } else if (e.key === 'b' && e.ctrlKey) { // Ctrl+B 增加書籤
        e.preventDefault();
        addBookmark();
    } else if (e.key === 'f' && e.ctrlKey) { // Ctrl+F 搜尋
        e.preventDefault();
        if (searchPanel) {
            searchPanel.classList.remove('hidden');
            if (searchInput) searchInput.focus();
        }
    } else if (e.key === 'Escape') { // ESC 關閉面板
        e.preventDefault();
        if (searchPanel && !searchPanel.classList.contains('hidden')) {
            searchPanel.classList.add('hidden');
        }
        if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
            settingsPanel.classList.add('hidden');
        }
        if (tocSidebar && tocSidebar.classList.contains('active')) {
            tocSidebar.classList.remove('active');
        }
        if (bookmarkSidebar && bookmarkSidebar.classList.contains('active')) {
            bookmarkSidebar.classList.remove('active');
        }
    }
}

/* -------------------------------------------------------------
   TTS (文字轉語音)
---------------------------------------------------------------- */
let ttsUtterance = null;
function handleTTS() {
    if (!('speechSynthesis' in window)) {
        alert('您的瀏覽器不支援語音合成功能');
        return;
    }
    
    if (ttsUtterance) {
        speechSynthesis.cancel();
        ttsUtterance = null;
        if (speakBtn) speakBtn.textContent = '🔊 朗讀';
        return;
    }
    
    ttsUtterance = new SpeechSynthesisUtterance(selectionText);
    ttsUtterance.lang = 'zh-TW';
    ttsUtterance.onend = () => {
        ttsUtterance = null;
        if (speakBtn) speakBtn.textContent = '🔊 朗讀';
    };
    ttsUtterance.onerror = () => {
        ttsUtterance = null;
        if (speakBtn) speakBtn.textContent = '🔊 朗讀';
        alert('語音合成失敗');
    };
    
    speechSynthesis.speak(ttsUtterance);
    if (speakBtn) speakBtn.textContent = '⏹️ 停止';
}

/* -------------------------------------------------------------
   初始主題
---------------------------------------------------------------- */
function initTheme() {
    // 預設使用系統主題，但可以通過設定改變
    if (themeButtons.length > 0) {
        themeButtons[0].classList.add('active');
    }
}
// EPUB 閱讀器 JavaScript
class EPUBReader {
    constructor() {
        this.book = null;
        this.rendition = null;
        this.currentLocation = null;
        this.bookmarks = [];
        this.settings = this.getDefaultSettings();
        this.currentBookId = null;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.applyTheme();
    }

    // 預設設定
    getDefaultSettings() {
        return {
            fontFamily: 'Inter',
            fontSize: 16,
            lineHeight: 1.6,
            margin: 20,
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            darkMode: false
        };
    }

    // 設定事件監聽器
    setupEventListeners() {
        // 檔案上傳
        const uploadBtn = document.getElementById('uploadBtn');
        const epubFile = document.getElementById('epubFile');
        
        uploadBtn.addEventListener('click', () => epubFile.click());
        epubFile.addEventListener('change', (e) => this.handleFileSelect(e));

        // 導航按鈕
        document.getElementById('prevBtn').addEventListener('click', () => this.prevPage());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPage());
        
        // 工具列按鈕
        document.getElementById('backToUpload').addEventListener('click', () => this.backToUpload());
        document.getElementById('tocBtn').addEventListener('click', () => this.toggleToc());
        document.getElementById('bookmarkBtn').addEventListener('click', () => this.toggleBookmarks());
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());

        // 側邊欄關閉按鈕
        document.getElementById('closeToc').addEventListener('click', () => this.closeToc());
        document.getElementById('closeBookmarks').addEventListener('click', () => this.closeBookmarks());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());

        // 書籤功能
        document.getElementById('addBookmark').addEventListener('click', () => this.addBookmark());

        // 設定面板
        this.setupSettingsListeners();

        // 遮罩層點擊
        document.getElementById('overlay').addEventListener('click', () => this.closeAllPanels());

        // 視窗調整大小
        window.addEventListener('resize', () => this.handleResize());
    }

    // 設定面板事件監聽器
    setupSettingsListeners() {
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const lineHeight = document.getElementById('lineHeight');
        const margin = document.getElementById('margin');
        const backgroundColor = document.getElementById('backgroundColor');
        const textColor = document.getElementById('textColor');
        const darkMode = document.getElementById('darkMode');
        const resetSettings = document.getElementById('resetSettings');

        fontFamily.addEventListener('change', (e) => {
            this.settings.fontFamily = e.target.value;
            this.applyCustomStyles();
            this.saveSettings();
        });

        fontSize.addEventListener('input', (e) => {
            this.settings.fontSize = parseInt(e.target.value);
            document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
            this.applyCustomStyles();
            this.saveSettings();
        });

        lineHeight.addEventListener('input', (e) => {
            this.settings.lineHeight = parseFloat(e.target.value);
            document.getElementById('lineHeightValue').textContent = e.target.value;
            this.applyCustomStyles();
            this.saveSettings();
        });

        margin.addEventListener('input', (e) => {
            this.settings.margin = parseInt(e.target.value);
            document.getElementById('marginValue').textContent = e.target.value + 'px';
            this.applyCustomStyles();
            this.saveSettings();
        });

        backgroundColor.addEventListener('change', (e) => {
            this.settings.backgroundColor = e.target.value;
            this.applyCustomStyles();
            this.saveSettings();
        });

        textColor.addEventListener('change', (e) => {
            this.settings.textColor = e.target.value;
            this.applyCustomStyles();
            this.saveSettings();
        });

        darkMode.addEventListener('change', (e) => {
            this.settings.darkMode = e.target.checked;
            this.applyTheme();
            this.saveSettings();
        });

        resetSettings.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    // 鍵盤快捷鍵
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.prevPage();
                    break;
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'b':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.addBookmark();
                    }
                    break;
                case 't':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleToc();
                    }
                    break;
                case 'Escape':
                    this.closeAllPanels();
                    break;
            }
        });
    }

    // 檔案選擇處理
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.epub')) {
            this.showMessage('請選擇 EPUB 檔案', 'error');
            return;
        }

        this.showMessage('正在載入書籍...', 'info');
        this.setUILoadingState(true);

        try {
            await this.loadEpub(file);
        } catch (error) {
            console.error('載入 EPUB 失敗:', error);
            this.showMessage('載入 EPUB 檔案失敗: ' + error.message, 'error');
            this.setUILoadingState(false);
        }
    }

    // 載入 EPUB
    async loadEpub(file) {
        try {
            // 使用 JSZip 讀取檔案
            const arrayBuffer = await file.arrayBuffer();
            
            // 使用 epub.js 載入書籍
            this.book = ePub(arrayBuffer);
            this.currentBookId = this.getBookIdentifier();
            
            // 載入書籍資訊
            await this.book.ready;
            
            // 設定檢視器
            const viewer = document.getElementById('epubViewer');
            this.rendition = this.book.renderTo(viewer, {
                width: '100%',
                height: '100%',
                spread: 'none'
            });

            // 應用自定義樣式
            this.applyCustomStyles();

            // 載入上次閱讀位置
            const lastLocation = this.getLastLocation();
            if (lastLocation) {
                await this.rendition.display(lastLocation);
            } else {
                await this.rendition.display();
            }

            // 設定導航事件
            this.rendition.on('relocated', (location) => {
                this.currentLocation = location.start.cfi;
                this.updatePageInfo();
                this.saveLastLocation();
                this.updateNavigationButtons();
            });

            // 載入書籤和目錄
            this.loadBookmarks();
            await this.loadTableOfContents();

            // 更新 UI
            this.setUILoadingState(false);
            this.showReaderArea();
            this.updateBookTitle();
            this.showMessage('書籍載入成功', 'success');

        } catch (error) {
            throw new Error('無法載入 EPUB 檔案: ' + error.message);
        }
    }

    // 顯示訊息
    showMessage(message, type = 'info') {
        const uploadStatus = document.getElementById('uploadStatus');
        if (uploadStatus) {
            uploadStatus.textContent = message;
            uploadStatus.className = `status-message status-${type}`;
            
            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    uploadStatus.textContent = '';
                    uploadStatus.className = '';
                }, 3000);
            }
        }
    }

    // 設定載入狀態
    setUILoadingState(loading) {
        const loadingMessage = document.getElementById('loadingMessage');
        const noBookMessage = document.getElementById('noBookMessage');
        
        if (loading) {
            loadingMessage.classList.remove('hidden');
            noBookMessage.classList.add('hidden');
        } else {
            loadingMessage.classList.add('hidden');
            if (!this.book) {
                noBookMessage.classList.remove('hidden');
            }
        }
    }

    // 顯示閱讀器區域
    showReaderArea() {
        document.getElementById('uploadArea').classList.add('hidden');
        document.getElementById('readerArea').classList.remove('hidden');
    }

    // 返回上傳頁面
    backToUpload() {
        document.getElementById('readerArea').classList.add('hidden');
        document.getElementById('uploadArea').classList.remove('hidden');
        this.closeAllPanels();
        
        if (this.rendition) {
            this.rendition.destroy();
            this.rendition = null;
        }
        if (this.book) {
            this.book = null;
        }
        
        // 重置檔案輸入
        document.getElementById('epubFile').value = '';
    }

    // 更新書籍標題
    async updateBookTitle() {
        if (this.book) {
            try {
                const meta = await this.book.loaded.metadata;
                document.getElementById('bookTitle').textContent = meta.title || '未知書名';
            } catch (error) {
                document.getElementById('bookTitle').textContent = '未知書名';
            }
        }
    }

    // 上一頁
    async prevPage() {
        if (this.rendition) {
            await this.rendition.prev();
        }
    }

    // 下一頁
    async nextPage() {
        if (this.rendition) {
            await this.rendition.next();
        }
    }

    // 更新導航按鈕狀態
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (this.book && this.rendition) {
            const location = this.rendition.currentLocation();
            if (location) {
                prevBtn.disabled = location.atStart;
                nextBtn.disabled = location.atEnd;
            }
        }
    }

    // 更新頁面資訊
    updatePageInfo() {
        const pageInfo = document.getElementById('pageInfo');
        if (this.book && this.rendition) {
            const location = this.rendition.currentLocation();
            if (location && location.start) {
                const progress = Math.round(location.start.percentage * 100);
                pageInfo.textContent = `${progress}%`;
            }
        }
    }

    // 切換目錄
    toggleToc() {
        const tocSidebar = document.getElementById('tocSidebar');
        const overlay = document.getElementById('overlay');
        
        if (tocSidebar.classList.contains('open')) {
            this.closeToc();
        } else {
            this.closeAllPanels();
            tocSidebar.classList.add('open');
            overlay.classList.remove('hidden');
        }
    }

    // 關閉目錄
    closeToc() {
        document.getElementById('tocSidebar').classList.remove('open');
        document.getElementById('overlay').classList.add('hidden');
    }

    // 載入目錄
    async loadTableOfContents() {
        if (!this.book) return;
        
        try {
            const navigation = await this.book.loaded.navigation;
            const tocContent = document.getElementById('tocContent');
            tocContent.innerHTML = '';
            
            if (navigation.toc && navigation.toc.length > 0) {
                navigation.toc.forEach((item, index) => {
                    const tocItem = this.createTocItem(item, index);
                    tocContent.appendChild(tocItem);
                });
            } else {
                tocContent.innerHTML = '<div class="empty-state">無目錄資訊</div>';
            }
        } catch (error) {
            console.error('載入目錄失敗:', error);
            document.getElementById('tocContent').innerHTML = '<div class="empty-state">載入目錄失敗</div>';
        }
    }

    // 建立目錄項目
    createTocItem(item, index) {
        const div = document.createElement('div');
        div.className = 'toc-item';
        div.innerHTML = `
            <div class="toc-title">${item.label}</div>
            ${item.subitems && item.subitems.length > 0 ? `<div class="toc-level">包含 ${item.subitems.length} 個子項目</div>` : ''}
        `;
        
        div.addEventListener('click', async () => {
            try {
                await this.rendition.display(item.href);
                this.closeToc();
            } catch (error) {
                console.error('跳轉章節失敗:', error);
                this.showMessage('跳轉章節失敗', 'error');
            }
        });
        
        return div;
    }

    // 切換書籤
    toggleBookmarks() {
        const bookmarkSidebar = document.getElementById('bookmarkSidebar');
        const overlay = document.getElementById('overlay');
        
        if (bookmarkSidebar.classList.contains('open')) {
            this.closeBookmarks();
        } else {
            this.closeAllPanels();
            bookmarkSidebar.classList.add('open');
            overlay.classList.remove('hidden');
            this.renderBookmarks();
        }
    }

    // 關閉書籤
    closeBookmarks() {
        document.getElementById('bookmarkSidebar').classList.remove('open');
        document.getElementById('overlay').classList.add('hidden');
    }

    // 新增書籤
    async addBookmark() {
        if (!this.currentLocation || !this.book) {
            this.showMessage('無法新增書籤', 'error');
            return;
        }

        try {
            // 獲取當前頁面內容作為摘要
            const range = await this.rendition.getRange(this.currentLocation);
            const excerpt = range.toString().substring(0, 100) + (range.toString().length > 100 ? '...' : '');
            
            const bookmark = {
                id: Date.now().toString(),
                cfi: this.currentLocation,
                excerpt: excerpt,
                timestamp: new Date().toLocaleString('zh-TW'),
                bookId: this.currentBookId
            };

            this.bookmarks.push(bookmark);
            this.saveBookmarks();
            this.showMessage('書籤已新增', 'success');
            
            if (document.getElementById('bookmarkSidebar').classList.contains('open')) {
                this.renderBookmarks();
            }
        } catch (error) {
            console.error('新增書籤失敗:', error);
            this.showMessage('新增書籤失敗', 'error');
        }
    }

    // 渲染書籤列表
    renderBookmarks() {
        const bookmarksList = document.getElementById('bookmarksList');
        const currentBookmarks = this.bookmarks.filter(b => b.bookId === this.currentBookId);
        
        if (currentBookmarks.length === 0) {
            bookmarksList.innerHTML = '<div class="empty-state">尚無書籤</div>';
            return;
        }

        bookmarksList.innerHTML = '';
        currentBookmarks.forEach(bookmark => {
            const bookmarkItem = this.createBookmarkItem(bookmark);
            bookmarksList.appendChild(bookmarkItem);
        });
    }

    // 建立書籤項目
    createBookmarkItem(bookmark) {
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.innerHTML = `
            <div class="bookmark-title">${bookmark.timestamp}</div>
            <div class="bookmark-excerpt">${bookmark.excerpt}</div>
            <div class="bookmark-actions">
                <button class="bookmark-delete" onclick="epubReader.deleteBookmark('${bookmark.id}')">×</button>
            </div>
        `;
        
        div.addEventListener('click', async (e) => {
            if (e.target.classList.contains('bookmark-delete')) return;
            
            try {
                await this.rendition.display(bookmark.cfi);
                this.closeBookmarks();
            } catch (error) {
                console.error('跳轉書籤失敗:', error);
                this.showMessage('跳轉書籤失敗', 'error');
            }
        });
        
        return div;
    }

    // 刪除書籤
    deleteBookmark(bookmarkId) {
        this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
        this.saveBookmarks();
        this.renderBookmarks();
        this.showMessage('書籤已刪除', 'success');
    }

    // 切換設定
    toggleSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        
        if (settingsPanel.classList.contains('hidden')) {
            this.closeAllPanels();
            settingsPanel.classList.remove('hidden');
            this.loadSettingsToUI();
        } else {
            this.closeSettings();
        }
    }

    // 關閉設定
    closeSettings() {
        document.getElementById('settingsPanel').classList.add('hidden');
    }

    // 載入設定到 UI
    loadSettingsToUI() {
        document.getElementById('fontFamily').value = this.settings.fontFamily;
        document.getElementById('fontSize').value = this.settings.fontSize;
        document.getElementById('fontSizeValue').textContent = this.settings.fontSize + 'px';
        document.getElementById('lineHeight').value = this.settings.lineHeight;
        document.getElementById('lineHeightValue').textContent = this.settings.lineHeight;
        document.getElementById('margin').value = this.settings.margin;
        document.getElementById('marginValue').textContent = this.settings.margin + 'px';
        document.getElementById('backgroundColor').value = this.settings.backgroundColor;
        document.getElementById('textColor').value = this.settings.textColor;
        document.getElementById('darkMode').checked = this.settings.darkMode;
    }

    // 關閉所有面板
    closeAllPanels() {
        this.closeToc();
        this.closeBookmarks();
        this.closeSettings();
    }

    // 載入設定
    loadSettings() {
        try {
            const saved = localStorage.getItem('epubReaderSettings');
            if (saved) {
                this.settings = { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('載入設定失敗:', error);
        }
    }

    // 儲存設定
    saveSettings() {
        try {
            localStorage.setItem('epubReaderSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('儲存設定失敗:', error);
        }
    }

    // 重置設定
    resetSettings() {
        this.settings = this.getDefaultSettings();
        this.loadSettingsToUI();
        this.applyCustomStyles();
        this.applyTheme();
        this.saveSettings();
        this.showMessage('設定已重置', 'success');
    }

    // 應用自定義樣式
    applyCustomStyles() {
        if (!this.rendition) return;

        const styles = `
            body {
                font-family: "${this.settings.fontFamily}", sans-serif !important;
                font-size: ${this.settings.fontSize}px !important;
                line-height: ${this.settings.lineHeight} !important;
                margin: ${this.settings.margin}px !important;
                padding: ${this.settings.margin}px !important;
                background-color: ${this.settings.backgroundColor} !important;
                color: ${this.settings.textColor} !important;
            }
            p {
                margin-bottom: 1em !important;
            }
        `;

        this.rendition.themes.default({
            'body': {
                'font-family': `"${this.settings.fontFamily}", sans-serif !important`,
                'font-size': `${this.settings.fontSize}px !important`,
                'line-height': `${this.settings.lineHeight} !important`,
                'margin': `${this.settings.margin}px !important`,
                'padding': `${this.settings.margin}px !important`,
                'background-color': `${this.settings.backgroundColor} !important`,
                'color': `${this.settings.textColor} !important`
            }
        });
    }

    // 應用主題
    applyTheme() {
        if (this.settings.darkMode) {
            document.documentElement.setAttribute('data-color-scheme', 'dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.setAttribute('data-color-scheme', 'light');
            document.body.classList.remove('dark');
        }
    }

    // 儲存最後閱讀位置
    saveLastLocation() {
        if (this.currentLocation && this.currentBookId) {
            try {
                localStorage.setItem(`lastLocation_${this.currentBookId}`, this.currentLocation);
            } catch (error) {
                console.error('儲存閱讀位置失敗:', error);
            }
        }
    }

    // 獲取最後閱讀位置
    getLastLocation() {
        if (this.currentBookId) {
            try {
                return localStorage.getItem(`lastLocation_${this.currentBookId}`);
            } catch (error) {
                console.error('載入閱讀位置失敗:', error);
            }
        }
        return null;
    }

    // 獲取書籍識別碼
    getBookIdentifier() {
        // 使用檔案名稱和時間戳作為識別碼
        return `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 載入書籤
    loadBookmarks() {
        try {
            const saved = localStorage.getItem('epubReaderBookmarks');
            if (saved) {
                this.bookmarks = JSON.parse(saved);
            }
        } catch (error) {
            console.error('載入書籤失敗:', error);
            this.bookmarks = [];
        }
    }

    // 儲存書籤
    saveBookmarks() {
        try {
            localStorage.setItem('epubReaderBookmarks', JSON.stringify(this.bookmarks));
        } catch (error) {
            console.error('儲存書籤失敗:', error);
        }
    }

    // 處理視窗大小調整
    handleResize() {
        if (this.rendition) {
            setTimeout(() => {
                this.rendition.resize();
            }, 100);
        }
    }
}

// 初始化閱讀器
let epubReader;

document.addEventListener('DOMContentLoaded', () => {
    epubReader = new EPUBReader();
});
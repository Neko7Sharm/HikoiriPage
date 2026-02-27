function appData() {
    return {
        mascotUrl: 'assets/images/profile.png',
        currentTab: 'home',
        adminTab: 'original',
        showPasswordModal: false,
        passwordInput: '',
        loginError: false,
        isAdmin: false,

        // Modal State
        showMangaModal: false,
        selectedManga: { links: [] },

        socialLinks: [
            { id: 1, title: 'Facebook', desc: 'Main Page', url: 'https://www.facebook.com/profile.php?id=61585433472527', icon: 'F' },
            { id: 2, title: 'Koko Translate', desc: 'Translate Page', url: 'https://www.facebook.com/HikoiriNeko', icon: 'T' },
            { id: 3, title: 'Pixiv', desc: 'Art Gallery', url: 'https://www.pixiv.net/en/users/118972536', icon: '🎨' },
            { id: 4, title: 'Patreon', desc: 'Exclusive Content', url: 'https://www.patreon.com/c/HikoiriBox', icon: '💎' }
        ],

        originalMangas: [],
        translationMangas: [],
        devlogs: [],

        // GitHub Settings
        ghToken: '',
        ghRepo: '', // e.g. "Neko7Sharm/HikoiriPage"
        ghBranch: 'main',
        isSyncing: false,

        // Forms
        formManga: { id: null, title: '', cover: '', status: '', role: '', langs: [], linksRaw: '' },
        newDevlog: { title: '', content: '', category: 'Update' },

        getTabTitle() {
            const titles = {
                'home': 'Home',
                'original': 'Original Manga',
                'translation': 'Translations',
                'devlog': 'Updates & Announcements',
                'admin': 'Admin'
            };
            return titles[this.currentTab] || 'Home';
        },

        async initApp() {
            // Load Admin Session
            const storedAdmin = localStorage.getItem('hb_admin_session');
            if (storedAdmin === 'true') this.isAdmin = true;

            // Load GitHub Settings
            this.ghToken = localStorage.getItem('hb_gh_token') || '';
            this.ghRepo = localStorage.getItem('hb_gh_repo') || 'Neko7Sharm/HikoiriPage';
            this.ghBranch = localStorage.getItem('hb_gh_branch') || 'main';

            // Try to load from LocalStorage first (for drafts)
            const storedOrig = localStorage.getItem('hb_original');
            const storedTrans = localStorage.getItem('hb_translation');
            const storedDevlogs = localStorage.getItem('hb_devlogs');

            if (storedOrig && storedTrans && storedDevlogs) {
                this.originalMangas = JSON.parse(storedOrig);
                this.translationMangas = JSON.parse(storedTrans);
                this.devlogs = JSON.parse(storedDevlogs);
            } else {
                // Fetch from JSON file
                try {
                    const response = await fetch('data/manga.json');
                    const data = await response.json();
                    this.originalMangas = data.originalMangas || [];
                    this.translationMangas = data.translationMangas || [];
                    this.devlogs = data.devlogs || [];
                    this.saveData(); // Save to local storage
                } catch (e) {
                    console.error('Failed to load data/manga.json', e);
                }
            }
        },

        checkAdmin() {
            if (this.isAdmin) {
                this.currentTab = 'admin';
            } else {
                this.showPasswordModal = true;
                this.passwordInput = '';
                this.loginError = false;
            }
        },

        async hashString(str) {
            const msgUint8 = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        async verifyPassword() {
            const hashedInput = await this.hashString(this.passwordInput);
            if (hashedInput === 'b265bb672458990119d166eaf670e9192c48a4df78d73c233614f2e2b9826c58') {
                this.isAdmin = true;
                this.currentTab = 'admin';
                this.showPasswordModal = false;
                localStorage.setItem('hb_admin_session', 'true');
            } else {
                this.loginError = true;
            }
        },

        logoutAdmin() {
            this.isAdmin = false;
            this.currentTab = 'home';
            localStorage.removeItem('hb_admin_session');
        },

        saveData() {
            localStorage.setItem('hb_original', JSON.stringify(this.originalMangas));
            localStorage.setItem('hb_translation', JSON.stringify(this.translationMangas));
            localStorage.setItem('hb_devlogs', JSON.stringify(this.devlogs));
        },

        saveGhSettings() {
            if (!this.ghToken) return alert('กรุณาใส่ Token ก่อนบันทึกครับ');
            localStorage.setItem('hb_gh_token', this.ghToken);
            localStorage.setItem('hb_gh_repo', this.ghRepo);
            localStorage.setItem('hb_gh_branch', this.ghBranch);
            alert('บันทึก Token เรียบร้อยแล้วครับ! (เก็บไว้ใน Browser ของคุณ)');
        },

        async syncToGit() {
            if (!this.ghToken || !this.ghRepo) {
                return alert('Please configure GitHub Token and Repo in settings first!');
            }

            this.isSyncing = true;
            const filePath = 'data/manga.json';
            const apiUrl = `https://api.github.com/repos/${this.ghRepo}/contents/${filePath}`;

            try {
                // 1. Get current file data (to get SHA)
                let sha = '';
                const getRes = await fetch(apiUrl, {
                    headers: { 'Authorization': `token ${this.ghToken}` }
                });

                if (getRes.ok) {
                    const fileData = await getRes.json();
                    sha = fileData.sha;
                }

                // 2. Prepare content
                const contentObj = {
                    originalMangas: this.originalMangas,
                    translationMangas: this.translationMangas,
                    devlogs: this.devlogs
                };
                const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));

                // 3. Update file
                const putRes = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.ghToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Admin: Update manga data',
                        content: contentBase64,
                        sha: sha,
                        branch: this.ghBranch
                    })
                });

                if (putRes.ok) {
                    alert('Sync successful! Git updated.');
                } else {
                    const err = await putRes.json();
                    alert('Sync failed: ' + (err.message || 'Unknown error'));
                }
            } catch (e) {
                console.error(e);
                alert('An error occurred during sync.');
            } finally {
                this.isSyncing = false;
            }
        },

        // Manga Logic
        parseLinks(raw) {
            if (!raw) return [];
            return raw.split('\n').map(line => {
                const parts = line.split('|');
                if (parts.length >= 2) return { name: parts[0].trim(), url: parts[1].trim() };
                return null;
            }).filter(l => l !== null);
        },

        formatLinksRaw(links) {
            return links.map(l => `${l.name}|${l.url}`).join('\n');
        },

        saveManga(type) {
            if (!this.formManga.title) return alert('Please enter a title');

            const links = this.parseLinks(this.formManga.linksRaw);
            const mangaData = {
                id: this.formManga.id || Date.now(),
                title: this.formManga.title,
                cover: this.formManga.cover || 'https://placehold.co/400x600/gray/white?text=No+Image',
                status: this.formManga.status,
                role: this.formManga.role,
                langs: this.formManga.langs,
                links: links
            };

            if (type === 'original') {
                if (this.formManga.id) {
                    const idx = this.originalMangas.findIndex(m => m.id === this.formManga.id);
                    if (idx !== -1) this.originalMangas[idx] = mangaData;
                } else {
                    this.originalMangas.unshift(mangaData);
                }
            } else {
                if (this.formManga.id) {
                    const idx = this.translationMangas.findIndex(m => m.id === this.formManga.id);
                    if (idx !== -1) this.translationMangas[idx] = mangaData;
                } else {
                    this.translationMangas.unshift(mangaData);
                }
            }

            this.clearForm();
            this.saveData();
            alert('Saved to draft! Don\'t forget to Sync to GitHub.');
        },

        editManga(manga, type) {
            this.formManga = {
                id: manga.id,
                title: manga.title,
                cover: manga.cover,
                status: manga.status,
                role: manga.role || '',
                langs: [...manga.langs],
                linksRaw: this.formatLinksRaw(manga.links)
            };
            document.querySelector('.content-scroll').scrollTop = 0;
        },

        deleteManga(id, type) {
            if (!confirm('Are you sure you want to delete this manga?')) return;
            if (type === 'original') {
                this.originalMangas = this.originalMangas.filter(m => m.id !== id);
            } else {
                this.translationMangas = this.translationMangas.filter(m => m.id !== id);
            }
            this.saveData();
        },

        clearForm() {
            this.formManga = { id: null, title: '', cover: '', status: '', role: '', langs: [], linksRaw: '' };
        },

        // Modal Logic
        openMangaModal(manga) {
            this.selectedManga = { ...manga, links: manga.links || [] };
            this.showMangaModal = true;
        },

        // Devlog Logic
        addDevlog() {
            if (!this.newDevlog.title) return alert('Please enter a title');
            const today = new Date().toISOString().split('T')[0];
            this.devlogs.unshift({
                id: Date.now(),
                title: this.newDevlog.title,
                content: this.newDevlog.content,
                category: this.newDevlog.category,
                date: today
            });
            this.newDevlog = { title: '', content: '', category: 'Update' };
            this.saveData();
            alert('Saved to draft! Don\'t forget to Sync to GitHub.');
        },

        deleteDevlog(id) {
            if (!confirm('Are you sure you want to delete this news?')) return;
            this.devlogs = this.devlogs.filter(l => l.id !== id);
            this.saveData();
        }
    }
}
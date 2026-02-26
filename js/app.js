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
            { id: 2, title: 'Facebook Page', desc: 'Main Page', url: '#', icon: 'f' },
            { id: 1, title: 'Facebook Translation Page', desc: 'Translation Page', url: '#', icon: 'T' },
            { id: 3, title: 'Pixiv', desc: 'Art Gallery', url: '#', icon: '🎨' },
            { id: 4, title: 'Patreon', desc: 'Exclusive Content', url: '#', icon: '💎' }
        ],

        originalMangas: [],
        translationMangas: [],
        devlogs: [],

        // Forms
        formManga: { id: null, title: '', cover: '', status: '', role: '', langs: [], linksRaw: '' },
        newDevlog: { title: '', content: '', category: 'Devlog' },

        getTabTitle() {
            const titles = {
                'home': 'Home',
                'original': 'Original Manga',
                'translation': 'Translations',
                'devlog': 'Devlog & News',
                'admin': 'Admin'
            };
            return titles[this.currentTab] || 'Home';
        },

        initApp() {
            const storedOrig = localStorage.getItem('hb_original');
            const storedTrans = localStorage.getItem('hb_translation');
            const storedDevlogs = localStorage.getItem('hb_devlogs');
            const storedAdmin = localStorage.getItem('hb_admin_session');

            if (storedAdmin === 'true') this.isAdmin = true;

            if (storedOrig) this.originalMangas = JSON.parse(storedOrig);
            else {
                this.originalMangas = [
                    { id: 1, title: 'Pink Magic School', cover: 'https://placehold.co/400x600/pink/white?text=Original+1', status: 'Ch. 5', role: 'Author', langs: ['TH', 'EN'], links: [{ name: 'Website A', url: '#' }, { name: 'Website B', url: '#' }] }
                ];
            }

            if (storedTrans) this.translationMangas = JSON.parse(storedTrans);
            else {
                this.translationMangas = [
                    { id: 1, title: 'Project A', cover: 'https://placehold.co/400x600/purple/white?text=Trans+1', status: 'Ongoing', role: 'Translator', langs: ['TH'], links: [{ name: 'MangaPlus', url: '#' }] }
                ];
            }

            if (storedDevlogs) this.devlogs = JSON.parse(storedDevlogs);
            else {
                this.devlogs = [
                    { id: 1, title: 'New Game Dev Start!', content: 'Starting a new RPG project using Unity. Stay tuned!', category: 'Devlog', date: '2023-10-25' }
                ];
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
            alert('Saved successfully!');
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
            this.newDevlog = { title: '', content: '', category: 'Devlog' };
            this.saveData();
            alert('Posted successfully!');
        },

        deleteDevlog(id) {
            if (!confirm('Are you sure you want to delete this news?')) return;
            this.devlogs = this.devlogs.filter(l => l.id !== id);
            this.saveData();
        }
    }
}
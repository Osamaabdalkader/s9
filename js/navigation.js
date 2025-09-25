// navigation.js - مصحح (بدون الاعتماد على profiles)
class Navigation {
    static async showPage(pageId, params = {}) {
        console.log(`🔹 جاري تحميل الصفحة: ${pageId}`, params);
        
        document.getElementById('dynamic-content').innerHTML = `
            <div class="loading-page">
                <div class="loading-spinner"></div>
                <p>جاري تحميل الصفحة...</p>
            </div>
        `;
        
        try {
            await Utils.loadPageContent(pageId);
            await this.initializePage(pageId, params);
            console.log(`✅ تم تحميل الصفحة بنجاح: ${pageId}`);
        } catch (error) {
            console.error(`❌ فشل في تحميل الصفحة: ${pageId}`, error);
            this.showErrorPage(error, pageId);
        }
    }

    static async initializePage(pageId, params = {}) {
        console.log(`🔹 جاري تهيئة الصفحة: ${pageId}`, params);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        switch (pageId) {
            case 'publish':
                this.handlePublishPage();
                break;
            case 'login':
                this.handleLoginPage();
                break;
            case 'register':
                this.handleRegisterPage();
                break;
            case 'profile':
                this.handleProfilePage();
                break;
            case 'home':
                Posts.loadPosts();
                Posts.initSearchAndFilter();
                break;
            case 'post-details':
                this.handlePostDetailsPage(params);
                break;
            case 'referral':
                await this.handleReferralPage();
                break;
        }
        
        this.rebindPageEvents(pageId);
    }

    static handlePublishPage() {
        const publishContent = document.getElementById('publish-content');
        const loginRequired = document.getElementById('login-required-publish');
        
        if (publishContent && loginRequired) {
            if (!currentUser) {
                publishContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                publishContent.style.display = 'block';
                loginRequired.style.display = 'none';
            }
        }
    }

    static handleLoginPage() {
        const statusEl = document.getElementById('login-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    static handleRegisterPage() {
        const statusEl = document.getElementById('register-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        
        const storedCode = ReferralSystem.getStoredReferralCode();
        if (storedCode) {
            const referralInput = document.getElementById('referral-code');
            if (referralInput) {
                referralInput.value = storedCode;
                Utils.showStatus(`🔹 تم تعبئة رمز الإحالة تلقائياً: ${storedCode}`, 'success', 'register-status');
            }
        }
    }

    static handleProfilePage() {
        const profileContent = document.getElementById('profile-content');
        const loginRequired = document.getElementById('login-required-profile');
        
        if (profileContent && loginRequired) {
            if (!currentUser) {
                profileContent.style.display = 'none';
                loginRequired.style.display = 'block';
            } else {
                profileContent.style.display = 'block';
                loginRequired.style.display = 'none';
                this.loadProfileData();
            }
        }
    }

    static handlePostDetailsPage(params) {
        if (params.postId) {
            PostDetails.loadPostDetails(params.postId);
        } else {
            PostDetails.showError();
        }
    }

    static async handleReferralPage() {
        if (!currentUser) {
            Utils.showStatus('يجب تسجيل الدخول لعرض صفحة الإحالة', 'error', 'referral-status');
            setTimeout(() => Navigation.showPage('login'), 2000);
            return;
        }

        try {
            Utils.showStatus('جاري تحميل إحصائيات الإحالة...', 'success', 'referral-status');
            
            const stats = await ReferralSystem.getUserReferralStats(currentUser.id);
            console.log('📊 الإحصائيات المستلمة:', stats);
            
            this.displayReferralStats(stats);
            
            Utils.showStatus('تم تحميل البيانات بنجاح', 'success', 'referral-status');
        } catch (error) {
            console.error('❌ Error loading referral stats:', error);
            Utils.showStatus(`خطأ في تحميل الإحصائيات: ${error.message}`, 'error', 'referral-status');
        }
    }

    static displayReferralStats(stats) {
        console.log('🔹 عرض إحصائيات الإحالة:', stats);
        
        // تحديث جميع العناصر بشكل منفصل
        const elements = {
            'referral-count': stats.referralCount || 0,
            'direct-referral-count': stats.directReferralCount || 0,
            'referral-code': stats.code || 'غير متوفر',
            'network-levels': stats.maxLevel || 0,
            'total-network-count': stats.totalNetworkCount || 0,
            'network-levels-count': stats.maxLevel || 0
        };
        
        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log(`✅ تحديث ${id}: ${value}`);
            } else {
                console.warn(`❌ العنصر غير موجود: ${id}`);
            }
        }
        
        // تحديث رابط الإحالة
        const linkInput = document.getElementById('referral-link-input');
        if (linkInput) {
            linkInput.value = ReferralSystem.getReferralLink(stats.code);
        }

        // عرض قائمة الإحالات
        this.displayReferralsList(stats.referrals || []);
    }

    static displayReferralsList(referrals) {
        const listEl = document.getElementById('referrals-list');
        if (!listEl) return;

        if (referrals.length === 0) {
            listEl.innerHTML = `
                <div class="no-referrals">
                    <i class="fas fa-users" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                    <p>لا توجد إحالات في شبكتك حتى الآن</p>
                    <small>شارك رابط الإحالة الخاص بك مع أصدقائك لتبدأ في بناء شبكتك</small>
                </div>
            `;
            return;
        }

        // تجميع الإحالات حسب المستوى
        const referralsByLevel = {};
        referrals.forEach(ref => {
            const level = ref.level || 1;
            if (!referralsByLevel[level]) {
                referralsByLevel[level] = [];
            }
            referralsByLevel[level].push(ref);
        });

        let html = '';
        
        // إنشاء HTML للشبكة متعددة المستويات
        Object.keys(referralsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            const levelReferrals = referralsByLevel[level];
            
            html += `
                <div class="referral-level">
                    <h4 class="level-title">
                        <i class="fas fa-level-down-alt"></i>
                        المستوى ${level}
                        <span class="level-count">(${levelReferrals.length} مستخدم)</span>
                    </h4>
                    <div class="level-users">
            `;
            
            levelReferrals.forEach(ref => {
                const joinDate = new Date(ref.created_at).toLocaleString('ar-SA');
                const userDisplayName = ref.user_name || ref.user_email || `مستخدم ${ref.user_id?.substring(0, 8)}...`;
                
                html += `
                    <div class="referral-item level-${level}">
                        <div class="referral-user">
                            <i class="fas fa-user${level > 1 ? '-friends' : ''}" style="color: ${this.getLevelColor(level)};"></i>
                            <span class="user-name">${userDisplayName}</span>
                            <span class="user-level">المستوى ${level}</span>
                        </div>
                        <div class="referral-date">
                            <i class="fas fa-calendar"></i>
                            ${joinDate}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    static getLevelColor(level) {
        const colors = {
            1: '#28a745',
            2: '#17a2b8',
            3: '#ffc107',
            4: '#fd7e14',
            5: '#dc3545'
        };
        return colors[level] || '#6c757d';
    }

    static loadProfileData() {
        if (currentUser) {
            const setName = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || 'غير محدد';
            };
            
            setName('profile-name', currentUser.user_metadata?.full_name);
            setName('profile-email', currentUser.email);
            setName('profile-phone', currentUser.user_metadata?.phone);
            setName('profile-address', currentUser.user_metadata?.address);
            setName('profile-created', new Date(currentUser.created_at).toLocaleString('ar-SA'));
        }
    }

    static updateNavigation() {
        const isLoggedIn = !!currentUser;
        
        const elements = {
            'publish-link': isLoggedIn,
            'profile-link': isLoggedIn,
            'referral-link': isLoggedIn,
            'logout-link': isLoggedIn,
            'login-link': !isLoggedIn,
            'register-link': !isLoggedIn
        };

        for (const [id, shouldShow] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = shouldShow ? 'list-item' : 'none';
            }
        }

        const footerProfile = document.getElementById('footer-profile-link');
        const footerReferral = document.getElementById('footer-referral-link');
        const footerPublish = document.getElementById('footer-publish-link');
        
        if (footerProfile) footerProfile.style.display = isLoggedIn ? 'flex' : 'none';
        if (footerReferral) footerReferral.style.display = isLoggedIn ? 'flex' : 'none';
        if (footerPublish) footerPublish.style.display = isLoggedIn ? 'flex' : 'none';
    }

    static showErrorPage(error, pageId) {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="error-page">
                <h1 class="section-title">خطأ في تحميل الصفحة</h1>
                <p>تعذر تحميل الصفحة المطلوبة: ${pageId}</p>
                <p>الخطأ: ${error.message}</p>
                <button onclick="Navigation.showPage('home')" class="btn-primary">
                    <i class="fas fa-home"></i> العودة إلى الرئيسية
                </button>
            </div>
        `;
    }

    static rebindPageEvents(pageId) {
        console.log(`🔹 إعادة ربط أحداث الصفحة: ${pageId}`);
    }
        }

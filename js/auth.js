// ========================================
// AUTH HELPER FUNCTIONS
// ========================================

const auth = {
    // Cek apakah user sudah login
    async checkAuth() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            return session;
        } catch (error) {
            console.error('Error checking auth:', error);
            return null;
        }
    },

    // Get current user
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (error) throw error;
            
            return user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    // Get user profile (termasuk role)
    async getUserProfile() {
        try {
            const user = await this.getCurrentUser();
            
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            return { ...user, role: data.role };
        } catch (error) {
            console.error('Error getting profile:', error);
            return null;
        }
    },

    // Login
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    },

    // Register
    async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) throw error;

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error signing up:', error);
            return { success: false, error: error.message };
        }
    },

    // Logout
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    },

    // Redirect ke login jika belum login
    async requireAuth(allowedRoles = []) {
        const session = await this.checkAuth();
        
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }

        // Cek role jika diperlukan
        if (allowedRoles.length > 0) {
            const profile = await this.getUserProfile();
            
            if (!profile || !allowedRoles.includes(profile.role)) {
                alert('Anda tidak memiliki akses ke halaman ini!');
                window.location.href = 'dashboard.html';
                return null;
            }

            return profile;
        }

        return await this.getUserProfile();
    },

    // Setup auth listener untuk auto-redirect
    setupAuthListener() {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = 'login.html';
                }
            }
        });
    }
};

// Initialize auth listener
auth.setupAuthListener();

// Export
window.auth = auth;

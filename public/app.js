class ProfileManager {
    constructor() {
        console.log('Initializing ProfileManager');
        this.profiles = {};
        this.currentProfile = null;
        this.db = null;
        this.auth = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.initFirebase();
        this.setupNetworkListeners();
        // Load profiles after Firebase initialization
        this.db.onSnapshot(() => {
            this.loadProfiles();
        });
    }

    async loadProfiles() {
        try {
            this.showLoading('Loading profiles...');
            const profilesSnapshot = await this.db.collection('profiles').get();
            this.profiles = {};
            
            profilesSnapshot.forEach(doc => {
                const data = doc.data();
                this.profiles[doc.id] = {
                    id: doc.id,
                    name: data.name || 'Unnamed Profile',
                    score: data.score || 0,
                    blocks: data.blocks || [],
                    lastPlayed: data.lastPlayed || new Date().toISOString()
                };
            });

            console.log('Loaded profiles:', this.profiles); // Add debug logging
            this.renderProfileList();
        } catch (error) {
            console.error('Error loading profiles:', error);
            showError('Failed to load profiles');
        } finally {
            this.hideLoading();
        }
    }

    renderProfileList() {
        const profileList = document.getElementById('profileList');
        if (!profileList) {
            console.error('Profile list element not found');
            return;
        }

        console.log('Rendering profiles:', this.profiles); // Add debug logging
        profileList.innerHTML = '';
        const sortedProfiles = Object.values(this.profiles).sort((a, b) => {
            return new Date(b.lastPlayed) - new Date(a.lastPlayed);
        });

        sortedProfiles.forEach(profile => {
            const profileElement = document.createElement('div');
            profileElement.className = 'profile-item';
            profileElement.dataset.profileId = profile.id;
            
            const lastPlayed = new Date(profile.lastPlayed).toLocaleDateString();
            
            profileElement.innerHTML = `
                <div class="profile-info">
                    <div class="profile-name">${profile.name}</div>
                    <div class="profile-stats">
                        Score: ${profile.score} | Last played: ${lastPlayed}
                    </div>
                </div>
                <button class="delete-profile" onclick="profileManager.deleteProfile('${profile.id}')">Delete</button>
            `;

            profileElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-profile')) {
                    this.startGame(profile.id);
                }
            });

            profileList.appendChild(profileElement);
        });

        // Add initial selection to first profile if exists
        const firstProfile = profileList.querySelector('.profile-item');
        if (firstProfile) {
            firstProfile.classList.add('selected');
        }
    }

    async startGame(profileId) {
        try {
            this.showLoading('Loading game...');
            const gameState = await this.getProfile(profileId);
            if (!gameState) {
                throw new Error('Profile not found');
            }

            this.currentProfile = profileId;
            const game = new VocabCraft(this, profileId);
            game.name = gameState.name; // Set the profile name
            game.updateDisplay(); // Update the display with the profile name

            // Show game container and hide profile container
            document.getElementById('profileContainer').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
        } catch (error) {
            console.error('Error starting game:', error);
            showError('Failed to start game');
        } finally {
            this.hideLoading();
        }
    }

    // ... rest of the ProfileManager class implementation ...
} 
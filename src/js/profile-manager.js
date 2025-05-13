// ProfileManager class to handle user profiles and game state persistence
class ProfileManager {
    constructor() {
        console.log('Initializing ProfileManager');
        this.profiles = {};
        this.currentProfile = null;
        this.db = null;
        this.auth = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.initFirebase();
        this.setupNetworkListeners();
    }

    logOperation(operation, details) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            operation,
            details,
            online: this.isOnline,
            currentProfile: this.currentProfile,
            queueLength: this.syncQueue.length
        };
        console.log('Firebase Operation:', logEntry);
        
        // Store logs in localStorage for persistence
        const logs = JSON.parse(localStorage.getItem('firebase_logs') || '[]');
        logs.push(logEntry);
        // Keep only last 100 logs
        if (logs.length > 100) logs.shift();
        localStorage.setItem('firebase_logs', JSON.stringify(logs));
    }

    loadFromLocalStorage() {
        const profiles = localStorage.getItem('vocabcraft_profiles');
        const parsedProfiles = profiles ? JSON.parse(profiles) : {};
        this.logOperation('load_local_storage', {
            foundProfiles: Object.keys(parsedProfiles).length,
            profileIds: Object.keys(parsedProfiles),
            profileNames: Object.values(parsedProfiles).map(p => p.name)
        });
        return parsedProfiles;
    }

    saveToLocalStorage() {
        this.logOperation('save_local_storage', {
            savingProfiles: Object.keys(this.profiles).length,
            profileIds: Object.keys(this.profiles),
            profileNames: Object.values(this.profiles).map(p => p.name)
        });
        localStorage.setItem('vocabcraft_profiles', JSON.stringify(this.profiles));
    }

    async initFirebase() {
        this.logOperation('init', 'Starting Firebase initialization');
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyCSZUNwL45dj49Nq-NPD5aAJDi7ooxUxnk",
                authDomain: "vocabcraft-81563.firebaseapp.com",
                projectId: "vocabcraft-81563",
                storageBucket: "vocabcraft-81563.firebasestorage.app",
                messagingSenderId: "238507816169",
                appId: "1:238507816169:web:ecdcdce8634db70c53ac78"
            };

            firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            this.logOperation('init', 'Firebase initialized successfully');
            
            // Enable Firestore logging and offline persistence
            try {
                await this.db.enablePersistence();
                this.logOperation('persistence', 'Enabled offline persistence');
            } catch (err) {
                this.logOperation('persistence_error', err);
                console.warn('Offline persistence not available:', err);
            }

            // Set up connection state listener
            this.db.enableNetwork().catch(err => {
                this.logOperation('network_error', err);
                console.warn('Network connection failed:', err);
            });

            this.db.waitForPendingWrites().then(() => {
                this.logOperation('pending_writes', 'All pending writes completed');
            }).catch(err => {
                this.logOperation('pending_writes_error', err);
            });

            // Load profiles and render
            await this.loadProfiles();
            this.renderProfileList();
            this.updateConnectionStatus();
        } catch (error) {
            this.logOperation('init_error', error);
            console.error('Firebase initialization error:', error);
            this.showOfflineMessage();
        }
    }

    showOfflineMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'offlineMessage';
        messageDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 193, 7, 0.9);
            color: black;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 2000;
            font-family: 'VT323', monospace;
            font-size: 1.2em;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        messageDiv.textContent = 'Working in offline mode. Changes will sync when connection is restored.';
        document.body.appendChild(messageDiv);

        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => messageDiv.remove(), 500);
        }, 5000);
    }

    updateConnectionStatus() {
        if (!this.isOnline) {
            this.showOfflineMessage();
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.isOnline = true;
            this.logOperation('network_status', 'Online');
            this.syncWithFirebase();
            this.updateConnectionStatus();
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            this.isOnline = false;
            this.logOperation('network_status', 'Offline');
            this.showOfflineMessage();
        });
    }

    async loadProfiles() {
        this.logOperation('load_start', 'Starting profile load');
        const localProfiles = this.loadFromLocalStorage();
        
        if (this.isOnline) {
            try {
                const snapshot = await this.db.collection('profiles').get();
                const firestoreProfiles = {};
                snapshot.forEach(doc => {
                    firestoreProfiles[doc.id] = doc.data();
                });

                this.logOperation('load_firestore', {
                    profileCount: Object.keys(firestoreProfiles).length,
                    profileIds: Object.keys(firestoreProfiles)
                });

                this.profiles = {};
                
                // Process Firestore profiles
                Object.entries(firestoreProfiles).forEach(([id, data]) => {
                    this.profiles[id] = data;
                });

                // Process local profiles
                Object.entries(localProfiles).forEach(([id, localData]) => {
                    if (this.profiles[id]) {
                        const firestoreData = this.profiles[id];
                        if (localData.lastSaved > firestoreData.lastSaved) {
                            this.logOperation('conflict_resolution', {
                                profileId: id,
                                localVersion: localData.version,
                                firestoreVersion: firestoreData.version,
                                resolution: 'local_wins'
                            });
                            this.syncQueue.push({ type: 'update', id, data: localData });
                        }
                    } else {
                        this.logOperation('new_local_profile', {
                            profileId: id,
                            profileName: localData.name
                        });
                        this.syncQueue.push({ type: 'create', id, data: localData });
                    }
                    this.profiles[id] = localData;
                });

                await this.syncWithFirebase();
            } catch (error) {
                this.logOperation('load_error', error);
                console.error('Error loading from Firestore:', error);
                this.profiles = localProfiles;
                this.showOfflineMessage();
            }
        } else {
            this.logOperation('load_offline', {
                localProfileCount: Object.keys(localProfiles).length
            });
            this.profiles = localProfiles;
            this.showOfflineMessage();
        }
    }

    async syncWithFirebase() {
        if (!this.isOnline) {
            this.logOperation('sync_skipped', 'Offline - sync skipped');
            return;
        }

        this.logOperation('sync_start', {
            queueLength: this.syncQueue.length,
            operations: this.syncQueue.map(op => op.type)
        });

        try {
            const batch = this.db.batch();
            let hasChanges = false;
            let processedOps = 0;
            let skippedOps = 0;

            while (this.syncQueue.length > 0) {
                const operation = this.syncQueue.shift();
                const profileRef = this.db.collection('profiles').doc(operation.id);

                switch (operation.type) {
                    case 'create':
                    case 'update':
                        const doc = await profileRef.get();
                        if (doc.exists) {
                            const existingData = doc.data();
                            if (existingData.version > operation.data.version) {
                                this.logOperation('conflict_detected', {
                                    profileId: operation.id,
                                    operation: operation.type,
                                    localVersion: operation.data.version,
                                    serverVersion: existingData.version,
                                    resolution: 'server_wins'
                                });
                                this.profiles[operation.id] = existingData;
                                this.saveToLocalStorage();
                                skippedOps++;
                                continue;
                            }
                        }
                        batch.set(profileRef, operation.data);
                        hasChanges = true;
                        processedOps++;
                        break;
                    case 'delete':
                        batch.delete(profileRef);
                        hasChanges = true;
                        processedOps++;
                        break;
                }
            }

            if (hasChanges) {
                await batch.commit();
                this.logOperation('sync_success', {
                    processedOps,
                    skippedOps,
                    remainingQueue: this.syncQueue.length
                });
            } else {
                this.logOperation('sync_no_changes', {
                    processedOps,
                    skippedOps
                });
            }
        } catch (error) {
            this.logOperation('sync_error', {
                error: error.message,
                code: error.code,
                remainingQueue: this.syncQueue.length
            });
            console.error('Error syncing with Firebase:', error);
            this.syncQueue = [...this.syncQueue, ...this.syncQueue];
        }
    }

    // Add a method to view logs
    showLogs() {
        const logs = JSON.parse(localStorage.getItem('firebase_logs') || '[]');
        console.table(logs);
        return logs;
    }

    // Generate a UUID v4
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async createProfile(name) {
        // Check if name already exists
        const existingProfile = Object.values(this.profiles).find(p => p.name === name);
        if (existingProfile) {
            return false; // Profile name already exists
        }

        const profileId = this.generateUUID();
        const newProfile = {
            name: name,
            score: 0,
            currentQuestion: 0,
            blockCounts: {
                dirt: 0,
                stone: 0,
                wood: 0,
                glass: 0
            },
            blocks: [],
            characterPosition: {
                x: 280,
                y: 180
            },
            lastSaved: new Date().toISOString(),
            questionStats: {},
            version: 1 // Add version for conflict detection
        };

        // Save to localStorage
        this.profiles[profileId] = newProfile;
        this.saveToLocalStorage();

        // Queue for Firebase sync
        if (this.isOnline) {
            this.syncQueue.push({ type: 'create', id: profileId, data: newProfile });
            await this.syncWithFirebase();
        }

        this.renderProfileList();
        return true;
    }

    async deleteProfile(name) {
        if (confirm(`Are you sure you want to delete profile "${name}"?`)) {
            // Remove from localStorage
            delete this.profiles[name];
            this.saveToLocalStorage();

            // Queue for Firebase sync
            if (this.isOnline) {
                this.syncQueue.push({ type: 'delete', name });
                await this.syncWithFirebase();
            }

            this.renderProfileList();
        }
    }

    loadProfile(name) {
        this.currentProfile = name;
        return this.profiles[name];
    }

    async saveProfile(gameState) {
        if (!this.currentProfile) return;

        const updatedProfile = {
            ...gameState,
            lastSaved: new Date().toISOString(),
            version: (this.profiles[this.currentProfile].version || 0) + 1
        };

        // Save to localStorage
        this.profiles[this.currentProfile] = updatedProfile;
        this.saveToLocalStorage();

        // Queue for Firebase sync
        if (this.isOnline) {
            this.syncQueue.push({ type: 'update', id: this.currentProfile, data: updatedProfile });
            await this.syncWithFirebase();
        }
    }

    renderProfileList() {
        const profileList = document.getElementById('profileList');
        if (!profileList) {
            console.error('Profile list element not found');
            return;
        }

        profileList.innerHTML = '';

        // Sort profiles by name
        const sortedProfiles = Object.entries(this.profiles)
            .sort(([, a], [, b]) => a.name.localeCompare(b.name));

        sortedProfiles.forEach(([id, data]) => {
            const profileItem = document.createElement('div');
            profileItem.className = 'profile-item';

            const profileInfo = document.createElement('div');
            profileInfo.className = 'profile-info';

            const profileName = document.createElement('div');
            profileName.className = 'profile-name';
            profileName.textContent = data.name;

            const profileStats = document.createElement('div');
            profileStats.className = 'profile-stats';
            profileStats.textContent = `Score: ${data.score} | Last saved: ${new Date(data.lastSaved).toLocaleString()}`;

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-profile';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                this.deleteProfile(id);
            };

            profileInfo.appendChild(profileName);
            profileInfo.appendChild(profileStats);
            profileItem.appendChild(profileInfo);
            profileItem.appendChild(deleteButton);

            profileItem.onclick = () => this.startGame(id);
            profileList.appendChild(profileItem);
        });
    }

    showSaveIndicator() {
        const indicator = document.getElementById('saveIndicator');
        indicator.classList.add('visible');
        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 2000);
    }

    startGame(profileName) {
        console.log('Starting game for profile:', profileName);
        const gameState = this.loadProfile(profileName);
        if (!gameState) {
            console.error('No game state found for profile:', profileName);
            return;
        }

        // Get all required elements
        const profileContainer = document.getElementById('profileContainer');
        const quizSection = document.getElementById('quizSection');
        const inventorySelector = document.getElementById('inventorySelector');
        const buildingArea = document.getElementById('buildingArea');
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        const buildingToggle = document.getElementById('buildingToggle');

        // Verify all required elements exist
        if (!profileContainer || !quizSection || !inventorySelector || !buildingArea || !profileNameDisplay) {
            console.error('Required UI elements not found');
            return;
        }

        // Show loading state
        const loadingMessage = document.createElement('div');
        loadingMessage.style.position = 'fixed';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.padding = '20px';
        loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
        loadingMessage.style.color = 'white';
        loadingMessage.style.borderRadius = '10px';
        loadingMessage.style.zIndex = '9999';
        loadingMessage.textContent = 'Loading vocabulary...';
        document.body.appendChild(loadingMessage);

        // Hide profile UI
        profileContainer.style.display = 'none';

        // Set initial view state
        quizSection.classList.add('visible');
        buildingArea.classList.remove('visible');
        inventorySelector.classList.add('visible');
        buildingToggle.textContent = 'Show Building Area';

        // Clear any existing game state
        this.cleanupGameState();

        // Initialize new game
        console.log('Creating new game instance');
        window.game = new VocabCraft(this, profileName);

        // Remove loading message when vocabulary is loaded
        window.game.loadVocabulary().then(() => {
            document.body.removeChild(loadingMessage);
            // Load game state
            console.log('Loading game state');
            window.game.loadGame(gameState);
        }).catch(error => {
            console.error('Error loading vocabulary:', error);
            loadingMessage.textContent = 'Error loading vocabulary. Please refresh the page.';
            loadingMessage.style.background = 'rgba(255, 0, 0, 0.8)';
        });
    }

    cleanupGameState() {
        console.log('Cleaning up game state');

        // Get all required elements
        const buildingArea = document.getElementById('buildingArea');
        const quizSection = document.getElementById('quizSection');
        const inventorySelector = document.getElementById('inventorySelector');
        const buildingToggle = document.getElementById('buildingToggle');
        const mobileControls = document.querySelector('.mobile-controls');

        // Reset view states
        if (quizSection) {
            quizSection.classList.remove('visible');
        }
        if (buildingArea) {
            buildingArea.innerHTML = '<div class="inventory-selector" id="inventorySelector"></div>';
            buildingArea.classList.remove('visible');
        }
        if (buildingToggle) {
            buildingToggle.textContent = 'Show Building Area';
        }
        if (mobileControls) {
            mobileControls.classList.remove('visible');
            mobileControls.style.display = 'none';
        }

        // Remove character if exists
        if (window.game && window.game.character && window.game.character.element) {
            window.game.character.element.remove();
        }

        // Hide inventory
        if (inventorySelector) {
            inventorySelector.classList.remove('visible');
        }

        // Clear game instance
        window.game = null;
    }

    exitToProfile() {
        if (window.game) {
            const gameState = window.game.saveGame();
            this.saveProfile(gameState);
        }

        // Show profile UI
        document.getElementById('profileContainer').style.display = 'block';
        document.getElementById('quizSection').style.display = 'none';
        document.getElementById('inventorySelector').classList.remove('visible');

        // Clean up game state
        this.cleanupGameState();

        // Update profile list
        this.renderProfileList();
    }
}

// Export the ProfileManager class
export default ProfileManager; 
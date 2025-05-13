// Import required classes
import Character from './character.js';
import { getBlockStyle, makeBlockDraggable } from './block-utils.js';

// Game class to manage the overall game state
class VocabCraft {
    constructor(profileManager, profileName) {
        console.log('Initializing VocabCraft with profile:', profileName);
        this.profileManager = profileManager;
        this.profileName = profileName;
        this.vocabulary = [];
        this.currentQuestion = 0;
        this.score = 0;
        this.blocks = [];
        this.blockCounts = {
            dirt: 0,
            stone: 0,
            wood: 0,
            glass: 0
        };
        this.selectedBlockType = null;

        // Initialize building area toggle
        const buildingToggle = document.getElementById('buildingToggle');
        const buildingArea = document.getElementById('buildingArea');
        const quizSection = document.getElementById('quizSection');
        const mobileControls = document.querySelector('.mobile-controls');
        
        if (buildingToggle && buildingArea && quizSection) {
            buildingToggle.addEventListener('click', () => {
                const isBuildingVisible = buildingArea.classList.contains('visible');
                
                // Toggle views
                if (isBuildingVisible) {
                    // Switch to quiz view
                    buildingArea.classList.remove('visible');
                    quizSection.classList.add('visible');
                    buildingToggle.textContent = 'Show Building Area';
                    
                    // Hide mobile controls
                    if (mobileControls) {
                        mobileControls.classList.remove('visible');
                        setTimeout(() => {
                            mobileControls.style.display = 'none';
                        }, 300);
                    }
                } else {
                    // Switch to building view
                    quizSection.classList.remove('visible');
                    buildingArea.classList.add('visible');
                    buildingToggle.textContent = 'Show Quiz';
                    
                    // Show mobile controls
                    if (mobileControls) {
                        mobileControls.style.display = 'block';
                        setTimeout(() => {
                            mobileControls.classList.add('visible');
                        }, 10);
                    }
                }
                
                console.log('View switched:', isBuildingVisible ? 'Quiz' : 'Building');
            });
        }

        // Load vocabulary before initializing the game
        this.loadVocabulary().then(() => {
            // Initialize game components
            this.initGame();
            this.setupAutoSave();
        });
    }

    async loadVocabulary() {
        try {
            // Try to load from the same directory first (for local development)
            const response = await fetch('./vocabulary.json');
            if (!response.ok) {
                // If that fails, try loading from the GitHub Pages URL
                const githubResponse = await fetch('https://justinrao.github.io/vocabcraft/vocabulary.json');
                if (!githubResponse.ok) {
                    throw new Error('Failed to load vocabulary');
                }
                const data = await githubResponse.json();
                this.vocabulary = data.vocabulary;
            } else {
                const data = await response.json();
                this.vocabulary = data.vocabulary;
            }
            console.log('Vocabulary loaded successfully:', this.vocabulary);
        } catch (error) {
            console.error('Error loading vocabulary:', error);
            // Fallback to empty vocabulary
            this.vocabulary = [];
        }
    }

    initGame() {
        console.log('Initializing game components');
        try {
            // Get all required elements
            const profileNameDisplay = document.getElementById('profileNameDisplay');
            const quizSection = document.getElementById('quizSection');
            const inventorySelector = document.getElementById('inventorySelector');

            // Verify elements exist
            if (!profileNameDisplay || !quizSection || !inventorySelector) {
                throw new Error('Required UI elements not found');
            }

            // Set up UI elements
            profileNameDisplay.textContent = `Profile: ${this.profileName}`;
            quizSection.style.display = 'block';
            inventorySelector.style.display = 'flex';

            // Create character
            console.log('Creating character');
            this.character = new Character(this);
            if (this.character && this.character.element) {
                this.character.element.style.display = 'block';
            }

            // Create inventory
            console.log('Creating inventory');
            this.createInventorySelector();

            // Show first question
            console.log('Showing first question');
            this.showQuestion();

            console.log('Game initialization complete');
        } catch (error) {
            console.error('Error during game initialization:', error);
        }
    }

    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveGame();
        }, 30000);

        // Save when window is closed
        window.addEventListener('beforeunload', () => {
            this.saveGame();
        });
    }

    loadGame(gameState) {
        console.log('Loading game state:', gameState);
        if (!gameState) {
            console.error('No game state provided');
            return;
        }

        this.score = gameState.score || 0;
        // Use questionId if available, otherwise fallback to index
        if (gameState.currentQuestionId) {
            const idx = this.vocabulary.findIndex(q => q.id === gameState.currentQuestionId);
            this.currentQuestion = idx !== -1 ? idx : 0;
        } else {
            this.currentQuestion = gameState.currentQuestion || 0;
        }
        if (this.currentQuestion >= this.vocabulary.length) {
            this.currentQuestion = 0;
        }
        // Initialize block counts
        this.blockCounts = {
            dirt: 0,
            stone: 0,
            wood: 0,
            glass: 0
        };

        // Clear existing blocks
        const buildingArea = document.getElementById('buildingArea');
        this.blocks.forEach(block => {
            if (block.parentNode === buildingArea) {
                block.remove();
            }
        });
        this.blocks = [];

        // Restore blocks and count them
        if (gameState.blocks && gameState.blocks.length > 0) {
            console.log('Restoring blocks:', gameState.blocks.length);
            gameState.blocks.forEach(blockData => {
                const block = document.createElement('div');
                block.className = 'block';
                Object.assign(block.style, getBlockStyle(blockData.type));
                block.style.left = blockData.x + 'px';
                block.style.top = blockData.y + 'px';
                buildingArea.appendChild(block);
                this.blocks.push(block);
                makeBlockDraggable(block);
                console.log('Restored block:', blockData);
            });
        }

        // Restore character position if available
        if (gameState.characterPosition && this.character) {
            this.character.posX = gameState.characterPosition.x;
            this.character.posY = gameState.characterPosition.y;
            this.character.element.style.left = this.character.posX + 'px';
            this.character.element.style.top = this.character.posY + 'px';
        }

        // Show current question
        this.showQuestion();

        // Update inventory display
        this.createInventorySelector();

        // Ensure building area is visible
        buildingArea.style.display = 'block';
    }

    saveGame() {
        // Calculate current block counts from placed blocks
        const currentBlockCounts = {
            dirt: 0,
            stone: 0,
            wood: 0,
            glass: 0
        };

        // Count blocks by type
        this.blocks.forEach(block => {
            const type = this.character.getBlockType(block);
            currentBlockCounts[type]++;
        });

        // Add any remaining blocks in inventory
        Object.keys(this.blockCounts).forEach(type => {
            currentBlockCounts[type] += this.blockCounts[type];
        });

        const gameState = {
            score: this.score,
            currentQuestionId: this.vocabulary[this.currentQuestion]?.id || null,
            currentQuestion: this.currentQuestion,
            blockCounts: currentBlockCounts,
            blocks: this.blocks.map(block => ({
                type: this.character.getBlockType(block),
                x: parseInt(block.style.left),
                y: parseInt(block.style.top)
            })),
            characterPosition: {
                x: this.character.posX,
                y: this.character.posY
            },
            questionStats: this.profileManager.profiles[this.profileManager.currentProfile]?.questionStats || {}
        };

        console.log('Saving game state:', gameState);
        this.profileManager.saveProfile(gameState);
        return gameState;
    }

    showQuestion() {
        console.log('Showing question:', this.currentQuestion);
        try {
            const question = this.vocabulary[this.currentQuestion];
            if (!question) {
                throw new Error(`No question found for index: ${this.currentQuestion}`);
            }

            const questionElement = document.getElementById('questionText');
            const optionsContainer = document.getElementById('optionsContainer');

            if (!questionElement || !optionsContainer) {
                throw new Error('Question elements not found');
            }

            questionElement.textContent =
                `What is the meaning of "${question.word}"?\n\nExample: ${question.example}`;

            optionsContainer.innerHTML = '';

            // Create a copy of options array and shuffle it
            const shuffledOptions = [...question.options];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }

            // Add shuffled options to the container
            shuffledOptions.forEach((option) => {
                const button = document.createElement('button');
                button.className = 'option';
                button.textContent = option;
                button.onclick = () => this.checkAnswer(option);
                optionsContainer.appendChild(button);
            });

            console.log('Question displayed successfully');
        } catch (error) {
            console.error('Error showing question:', error);
        }
    }

    checkAnswer(selectedAnswer) {
        const question = this.vocabulary[this.currentQuestion];
        if (!question) {
            console.error('No question found for index:', this.currentQuestion);
            return;
        }
        const optionsContainer = document.getElementById('optionsContainer');
        const buttons = optionsContainer.getElementsByClassName('option');
        // Track stats
        const profile = this.profileManager.profiles[this.profileManager.currentProfile];
        if (profile) {
            if (!profile.questionStats) profile.questionStats = {};
            if (!profile.questionStats[question.id]) profile.questionStats[question.id] = { correct: 0, incorrect: 0 };
        }
        let wasCorrect = false;
        Array.from(buttons).forEach(button => {
            button.disabled = true;
            if (button.textContent === selectedAnswer) {
                if (selectedAnswer === question.meaning) {
                    button.style.backgroundColor = '#4CAF50';
                    this.score += 10;
                    document.getElementById('scoreDisplay').textContent = `Score: ${this.score}`;
                    this.addBonusBlock();
                    wasCorrect = true;
                } else {
                    button.style.backgroundColor = '#f44336';
                }
            }
        });
        Array.from(buttons).forEach(button => {
            if (button.textContent === question.meaning) {
                button.style.backgroundColor = '#4CAF50';
            }
        });
        // Update stats
        if (profile) {
            if (wasCorrect) {
                profile.questionStats[question.id].correct++;
            } else {
                profile.questionStats[question.id].incorrect++;
            }
            this.profileManager.saveProfile(this.saveGame());
        }
        setTimeout(() => {
            this.currentQuestion = (this.currentQuestion + 1) % this.vocabulary.length;
            this.showQuestion();
        }, 1500);
    }

    addBonusBlock() {
        const blockTypes = ['dirt', 'stone', 'wood', 'glass'];
        const randomType = blockTypes[Math.floor(Math.random() * blockTypes.length)];

        // Add block to inventory
        this.blockCounts[randomType]++;

        // Find the count element and animate it
        const selector = document.getElementById('inventorySelector');
        const slot = selector.querySelector(`[data-type="${randomType}"]`);
        if (slot) {
            const countElement = slot.querySelector('.block-count');
            if (countElement) {
                countElement.textContent = this.blockCounts[randomType].toString();
                countElement.classList.remove('pulse');
                countElement.offsetHeight; // Trigger reflow
                countElement.classList.add('pulse');
            }
        }

        // Update all slot appearances
        this.updateBlockCounts();
    }

    createInventorySelector() {
        console.log('Creating inventory selector...');
        const selector = document.getElementById('inventorySelector');
        if (!selector) {
            console.error('Inventory selector element not found!');
            return;
        }
        selector.innerHTML = '';
        console.log('Current block counts:', this.blockCounts);

        const blockTypes = [
            { type: 'dirt', name: 'Dirt' },
            { type: 'stone', name: 'Stone' },
            { type: 'wood', name: 'Wood' },
            { type: 'glass', name: 'Glass' }
        ];

        blockTypes.forEach(blockInfo => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.type = blockInfo.type;
            Object.assign(slot.style, getBlockStyle(blockInfo.type));

            const count = document.createElement('div');
            count.className = 'block-count';
            const currentCount = this.blockCounts[blockInfo.type] || 0;
            console.log(`Creating slot for ${blockInfo.type} with count:`, currentCount);
            count.textContent = currentCount.toString();

            const name = document.createElement('div');
            name.className = 'block-name';
            name.textContent = blockInfo.name;

            slot.appendChild(count);
            slot.appendChild(name);
            selector.appendChild(slot);

            // Update slot appearance based on count
            this.updateSlotAppearance(slot, blockInfo.type);

            slot.addEventListener('click', () => {
                if (this.blockCounts[blockInfo.type] > 0) {
                    this.selectBlock(slot);
                }
            });
        });

        // Select first available block by default
        this.selectFirstAvailableBlock();
        console.log('Inventory selector created with slots');
    }

    selectFirstAvailableBlock() {
        const selector = document.getElementById('inventorySelector');
        const slots = selector.querySelectorAll('.inventory-slot');
        
        // Find first available block
        const availableSlot = Array.from(slots).find(slot => 
            this.blockCounts[slot.dataset.type] > 0
        );

        if (availableSlot) {
            this.selectBlock(availableSlot);
        } else {
            // If no blocks available, deselect all
            this.selectedBlockType = null;
            slots.forEach(slot => slot.classList.remove('selected'));
        }
    }

    selectBlock(slot) {
        const selector = document.getElementById('inventorySelector');
        selector.querySelectorAll('.inventory-slot').forEach(s => {
            s.classList.remove('selected');
        });
        slot.classList.add('selected');
        this.selectedBlockType = slot.dataset.type;
    }

    updateSlotAppearance(slot, type) {
        const count = this.blockCounts[type] || 0;
        console.log(`Updating appearance for ${type}, count:`, count);
        const countElement = slot.querySelector('.block-count');
        if (countElement) {
            console.log(`Found count element for ${type}, updating to:`, count);
            countElement.textContent = count.toString();
        } else {
            console.log(`No count element found for ${type}`);
        }

        if (count === 0) {
            slot.classList.add('empty');
            // If this was the selected block, select another available one
            if (this.selectedBlockType === type) {
                this.selectFirstAvailableBlock();
            }
        } else {
            slot.classList.remove('empty');
        }
    }

    updateBlockCounts() {
        console.log('Updating all block counts:', this.blockCounts);
        const selector = document.getElementById('inventorySelector');
        if (selector) {
            selector.querySelectorAll('.inventory-slot').forEach(slot => {
                const type = slot.dataset.type;
                this.updateSlotAppearance(slot, type);
            });
        } else {
            console.log('Inventory selector not found');
        }
    }

    placeBlock(x, y) {
        if (this.selectedBlockType && this.blockCounts[this.selectedBlockType] > 0) {
            const block = document.createElement('div');
            block.className = 'block';
            Object.assign(block.style, getBlockStyle(this.selectedBlockType));

            const gridX = Math.floor(x / 40) * 40;
            const gridY = Math.floor(y / 40) * 40;

            block.style.left = gridX + 'px';
            block.style.top = gridY + 'px';

            const isOccupied = this.blocks.some(existingBlock => {
                const existingX = parseInt(existingBlock.style.left);
                const existingY = parseInt(existingBlock.style.top);
                return existingX === gridX && existingY === gridY;
            });

            if (!isOccupied) {
                document.getElementById('buildingArea').appendChild(block);
                this.blocks.push(block);
                this.blockCounts[this.selectedBlockType]--;
                this.updateBlockCounts();
                makeBlockDraggable(block);

                block.style.opacity = '0';
                block.style.transform = 'scale(0.5)';
                requestAnimationFrame(() => {
                    block.style.transition = 'all 0.3s ease-out';
                    block.style.opacity = '1';
                    block.style.transform = 'scale(1)';
                });

                // Save state after placing block
                this.saveGame();
            }
        }
    }

    addBlock(type) {
        console.log(`Adding block of type ${type}, current count:`, this.blockCounts[type]);
        if (this.blockCounts[type] !== undefined) {
            this.blockCounts[type]++;
            console.log(`New count for ${type}:`, this.blockCounts[type]);
            this.updateBlockCounts();
            
            // If this is the first block of this type, select it
            if (this.blockCounts[type] === 1) {
                const selector = document.getElementById('inventorySelector');
                const slot = selector.querySelector(`[data-type="${type}"]`);
                if (slot) {
                    this.selectBlock(slot);
                }
            }
        }
    }
}

// Export the game class
export default VocabCraft; 
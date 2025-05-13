// Character class to manage the player character
class Character {
    constructor(game) {
        this.game = game;
        this.element = this.createCharacter();
        this.posX = 280;
        this.posY = 180;
        this.speed = 40;
        this.initControls();

        // Set initial position immediately
        this.element.style.left = this.posX + 'px';
        this.element.style.top = this.posY + 'px';
    }

    createCharacter() {
        const character = document.createElement('div');
        character.className = 'character';

        const head = document.createElement('div');
        head.className = 'character-head';

        const body = document.createElement('div');
        body.className = 'character-body';

        const leftArm = document.createElement('div');
        leftArm.className = 'character-arm left';

        const rightArm = document.createElement('div');
        rightArm.className = 'character-arm right';

        const leftLeg = document.createElement('div');
        leftLeg.className = 'character-leg left';

        const rightLeg = document.createElement('div');
        rightLeg.className = 'character-leg right';

        const bag = document.createElement('div');
        bag.className = 'character-bag';

        character.appendChild(head);
        character.appendChild(body);
        character.appendChild(leftArm);
        character.appendChild(rightArm);
        character.appendChild(leftLeg);
        character.appendChild(rightLeg);
        character.appendChild(bag);

        character.style.left = this.posX + 'px';
        character.style.top = this.posY + 'px';
        document.getElementById('buildingArea').appendChild(character);

        return character;
    }

    initControls() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.mineBlock();
                return;
            }

            // Inventory controls
            if (e.key.toLowerCase() === 'a') {
                this.selectPreviousBlock();
                return;
            }
            if (e.key.toLowerCase() === 's') {
                this.selectNextBlock();
                return;
            }
            if (e.key.toLowerCase() === 'd') {
                this.placeBlockInFront();
                return;
            }

            let newX = this.posX;
            let newY = this.posY;
            let direction = '';

            switch (e.key) {
                case 'ArrowLeft':
                    newX = Math.max(0, this.posX - this.speed);
                    direction = 'left';
                    break;
                case 'ArrowRight':
                    newX = Math.min(document.getElementById('buildingArea').clientWidth - 40, this.posX + this.speed);
                    direction = 'right';
                    break;
                case 'ArrowUp':
                    newY = Math.max(0, this.posY - this.speed);
                    direction = 'back';
                    break;
                case 'ArrowDown':
                    newY = Math.min(document.getElementById('buildingArea').clientHeight - 40, this.posY + this.speed);
                    direction = 'front';
                    break;
            }

            if (!this.willCollide(newX, newY)) {
                this.posX = newX;
                this.posY = newY;
                this.element.style.left = this.posX + 'px';
                this.element.style.top = this.posY + 'px';

                // Update facing direction
                this.element.className = 'character';
                if (direction) {
                    this.element.classList.add('facing-' + direction);
                }
            }
        });

        // Touch controls
        const mobileControls = document.querySelector('.mobile-controls');
        if (mobileControls) {
            mobileControls.addEventListener('touchstart', (e) => {
                const button = e.target.closest('.mobile-control-button');
                if (!button) return;

                e.preventDefault();
                const action = button.dataset.action;

                switch (action) {
                    case 'up':
                        this.moveCharacter(0, -this.speed, 'back');
                        break;
                    case 'down':
                        this.moveCharacter(0, this.speed, 'front');
                        break;
                    case 'left':
                        this.moveCharacter(-this.speed, 0, 'left');
                        break;
                    case 'right':
                        this.moveCharacter(this.speed, 0, 'right');
                        break;
                    case 'mine':
                        this.mineBlock();
                        break;
                    case 'place':
                        this.placeBlockInFront();
                        break;
                    case 'inventory':
                        this.selectNextBlock();
                        break;
                }
            });
        }
    }

    moveCharacter(deltaX, deltaY, direction) {
        const newX = Math.max(0, Math.min(document.getElementById('buildingArea').clientWidth - 40, this.posX + deltaX));
        const newY = Math.max(0, Math.min(document.getElementById('buildingArea').clientHeight - 40, this.posY + deltaY));

        if (!this.willCollide(newX, newY)) {
            this.posX = newX;
            this.posY = newY;
            this.element.style.left = this.posX + 'px';
            this.element.style.top = this.posY + 'px';

            // Update facing direction
            this.element.className = 'character';
            if (direction) {
                this.element.classList.add('facing-' + direction);
            }
        }
    }

    selectPreviousBlock() {
        const selector = document.getElementById('inventorySelector');
        const slots = selector.querySelectorAll('.inventory-slot');
        const currentIndex = Array.from(slots).findIndex(slot => slot.classList.contains('selected'));

        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = slots.length - 1;

        // Find the first non-empty slot going backwards
        while (newIndex !== currentIndex) {
            const slot = slots[newIndex];
            const type = slot.dataset.type;
            if (this.game.blockCounts[type] > 0) {
                this.selectBlock(slot);
                break;
            }
            newIndex = (newIndex - 1 + slots.length) % slots.length;
        }
    }

    selectNextBlock() {
        const selector = document.getElementById('inventorySelector');
        const slots = selector.querySelectorAll('.inventory-slot');
        const currentIndex = Array.from(slots).findIndex(slot => slot.classList.contains('selected'));

        let newIndex = (currentIndex + 1) % slots.length;

        // Find the first non-empty slot going forwards
        while (newIndex !== currentIndex) {
            const slot = slots[newIndex];
            const type = slot.dataset.type;
            if (this.game.blockCounts[type] > 0) {
                this.selectBlock(slot);
                break;
            }
            newIndex = (newIndex + 1) % slots.length;
        }
    }

    selectBlock(slot) {
        const selector = document.getElementById('inventorySelector');
        selector.querySelectorAll('.inventory-slot').forEach(s => {
            s.classList.remove('selected');
        });
        slot.classList.add('selected');
        this.game.selectedBlockType = slot.dataset.type;
    }

    placeBlockInFront() {
        if (!this.game.selectedBlockType || this.game.blockCounts[this.game.selectedBlockType] <= 0) {
            return;
        }

        // Calculate position in front of character based on facing direction
        let placeX = this.posX;
        let placeY = this.posY;

        // Determine placement position based on character's facing direction
        if (this.element.classList.contains('facing-left')) {
            placeX -= 40;
        } else if (this.element.classList.contains('facing-right')) {
            placeX += 40;
        } else if (this.element.classList.contains('facing-back')) {
            placeY -= 40;
        } else { // facing front (default)
            placeY += 40;
        }

        // Snap to grid
        placeX = Math.floor(placeX / 40) * 40;
        placeY = Math.floor(placeY / 40) * 40;

        // Check if position is within bounds
        const buildingArea = document.getElementById('buildingArea');
        if (placeX < 0 || placeX > buildingArea.clientWidth - 40 ||
            placeY < 0 || placeY > buildingArea.clientHeight - 40) {
            return;
        }

        // Check if position is already occupied
        const isOccupied = this.game.blocks.some(block => {
            const blockX = parseInt(block.style.left);
            const blockY = parseInt(block.style.top);
            return blockX === placeX && blockY === placeY;
        });

        if (!isOccupied) {
            const block = document.createElement('div');
            block.className = 'block';
            Object.assign(block.style, getBlockStyle(this.game.selectedBlockType));
            block.style.left = placeX + 'px';
            block.style.top = placeY + 'px';

            buildingArea.appendChild(block);
            this.game.blocks.push(block);
            this.game.blockCounts[this.game.selectedBlockType]--;
            this.game.updateBlockCounts();
            makeBlockDraggable(block);

            // Add placement animation
            block.style.opacity = '0';
            block.style.transform = 'scale(0.5)';
            requestAnimationFrame(() => {
                block.style.transition = 'all 0.3s ease-out';
                block.style.opacity = '1';
                block.style.transform = 'scale(1)';
            });
        }
    }

    willCollide(newX, newY) {
        return this.game.blocks.some(block => {
            const blockX = parseInt(block.style.left);
            const blockY = parseInt(block.style.top);
            return Math.abs(blockX - newX) < 40 && Math.abs(blockY - newY) < 40;
        });
    }

    isOnBlock() {
        const characterCenterX = this.posX + 20;
        const characterCenterY = this.posY + 20;

        return this.game.blocks.some(block => {
            const blockX = parseInt(block.style.left);
            const blockY = parseInt(block.style.top);
            const blockCenterX = blockX + 20;
            const blockCenterY = blockY + 20;

            const distanceX = Math.abs(characterCenterX - blockCenterX);
            const distanceY = Math.abs(characterCenterY - blockCenterY);

            return distanceX <= 60 && distanceY <= 60;
        });
    }

    getBlockType(block) {
        // Get the computed style of the block
        const style = window.getComputedStyle(block);
        const backgroundColor = style.backgroundColor;

        // Convert RGB colors to comparable format
        const normalizeColor = (color) => {
            // Convert rgb(r, g, b) to rgb(r,g,b)
            return color.replace(/\s/g, '').toLowerCase();
        };

        const normalizedBgColor = normalizeColor(backgroundColor);

        // Define color mappings for each block type
        const colorMappings = {
            'rgb(139,69,19)': 'dirt',      // #8B4513
            'rgb(128,128,128)': 'stone',   // #808080
            'rgb(160,82,45)': 'wood',      // #A0522D
            'rgb(173,216,230)': 'glass'    // #ADD8E6
        };

        // Check if the color matches any of our known block types
        for (const [color, type] of Object.entries(colorMappings)) {
            if (normalizeColor(color) === normalizedBgColor) {
                return type;
            }
        }

        // If no match found, try to determine by background image
        const backgroundImage = style.backgroundImage;
        if (backgroundImage.includes('linear-gradient')) {
            if (backgroundImage.includes('45deg')) {
                if (backgroundImage.includes('173,216,230')) return 'glass';
                if (backgroundImage.includes('139,69,19')) return 'dirt';
                if (backgroundImage.includes('128,128,128')) return 'stone';
            } else if (backgroundImage.includes('90deg')) {
                return 'wood';
            }
        }

        return 'dirt'; // Default to dirt if type can't be determined
    }

    mineBlock() {
        if (!this.isOnBlock()) return;

        const characterCenterX = this.posX + 20;
        const characterCenterY = this.posY + 20;

        let closestBlock = null;
        let minDistance = Infinity;

        this.game.blocks.forEach(block => {
            if (block.closest('.block-palette')) return;

            const blockX = parseInt(block.style.left);
            const blockY = parseInt(block.style.top);
            const blockCenterX = blockX + 20;
            const blockCenterY = blockY + 20;

            const distanceX = Math.abs(characterCenterX - blockCenterX);
            const distanceY = Math.abs(characterCenterY - blockCenterY);
            const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            if (totalDistance < minDistance && distanceX <= 60 && distanceY <= 60) {
                minDistance = totalDistance;
                closestBlock = block;
            }
        });

        if (closestBlock) {
            const blockType = this.getBlockType(closestBlock);
            closestBlock.classList.add('mining');
            closestBlock.style.animation = 'mining 0.5s ease-in-out';

            setTimeout(() => {
                if (closestBlock.parentNode) {
                    closestBlock.remove();
                    this.game.blocks = this.game.blocks.filter(b => b !== closestBlock);
                    this.game.addBlock(blockType);
                    
                    // Save state after mining block
                    this.game.saveGame();
                }
            }, 500);
        }
    }
}

// Export the Character class
export default Character; 
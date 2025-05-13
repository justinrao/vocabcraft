// Utility functions for block manipulation
export function getBlockStyle(type) {
    const styles = {
        dirt: {
            backgroundColor: '#8B4513',
            backgroundImage: 'linear-gradient(45deg, #8B4513, #A0522D)'
        },
        stone: {
            backgroundColor: '#808080',
            backgroundImage: 'linear-gradient(45deg, #808080, #A9A9A9)'
        },
        wood: {
            backgroundColor: '#A0522D',
            backgroundImage: 'linear-gradient(90deg, #8B4513, #A0522D, #8B4513)'
        },
        glass: {
            backgroundColor: '#ADD8E6',
            backgroundImage: 'linear-gradient(45deg, #ADD8E6, #B0E0E6)',
            opacity: '0.7'
        }
    };
    return styles[type] || styles.dirt;
}

export function makeBlockDraggable(block) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    block.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.closest('.block-palette')) return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === block) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, block);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;

        // Snap to grid
        const x = Math.round(parseInt(block.style.left) / 40) * 40;
        const y = Math.round(parseInt(block.style.top) / 40) * 40;
        block.style.left = x + 'px';
        block.style.top = y + 'px';
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
} 
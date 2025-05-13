// Import required classes
import ProfileManager from './profile-manager.js';
import VocabCraft from './game.js';

// Initialize the profile manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize profile manager
    window.profileManager = new ProfileManager();

    // Add event listener for the new profile form
    const newProfileForm = document.getElementById('newProfileForm');
    if (newProfileForm) {
        newProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newProfileName');
            const name = nameInput.value.trim();
            
            if (name) {
                const success = await window.profileManager.createProfile(name);
                if (success) {
                    nameInput.value = '';
                } else {
                    alert('A profile with this name already exists.');
                }
            }
        });
    }

    // Add event listener for the exit button
    const exitButton = document.getElementById('exitButton');
    if (exitButton) {
        exitButton.addEventListener('click', () => {
            window.profileManager.exitToProfile();
        });
    }
}); 
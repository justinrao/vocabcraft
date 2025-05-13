// Get the version from Vercel's environment variable
const version = process.env.NEXT_PUBLIC_VERSION || 'development';

// Create and append version element
const versionElement = document.createElement('div');
versionElement.style.position = 'fixed';
versionElement.style.bottom = '10px';
versionElement.style.right = '10px';
versionElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
versionElement.style.color = 'white';
versionElement.style.padding = '5px 10px';
versionElement.style.borderRadius = '5px';
versionElement.style.fontSize = '12px';
versionElement.style.fontFamily = 'monospace';
versionElement.textContent = `Build: ${version.substring(0, 7)}`;
document.body.appendChild(versionElement); 
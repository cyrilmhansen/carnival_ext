// popup.js (modified)
document.addEventListener('DOMContentLoaded', () => {
  const addIdentityForm = document.getElementById('addIdentityForm');
  const identitiesList = document.getElementById('identitiesList');

  // Load identities from chrome.storage.sync for cross-device synchronization
  loadIdentities();

  addIdentityForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newIdentity = {
      id: `identity_${Date.now()}`, // Simple unique ID
      name: document.getElementById('identityName').value,
      email: document.getElementById('identityEmail').value,
      address: document.getElementById('identityAddress').value,
    };
    saveIdentity(newIdentity);
    addIdentityForm.reset();
  });

  function saveIdentity(identity) {
    // Use chrome.storage.sync to allow identities to be available across
    // devices where the user is signed into Chrome and has the extension installed.
    chrome.storage.sync.get({ identities: [] }, (result) => {
      const identities = result.identities;
      const existingIndex = identities.findIndex(i => i.id === identity.id);
      if (existingIndex > -1) {
        identities[existingIndex] = identity; // Update
      } else {
        identities.push(identity); // Add new
      }
      chrome.storage.sync.set({ identities }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving identity to sync storage:", chrome.runtime.lastError);
          // Potentially inform the user or fallback to local storage if critical
          alert(`Error saving identity: ${chrome.runtime.lastError.message}. Please check your browser sync settings.`);
        } else {
          console.log('Identity saved to sync storage:', identity);
          loadIdentities(); // Refresh the list
        }
      });
    });
  }

  function loadIdentities() {
    // Load identities from chrome.storage.sync
    chrome.storage.sync.get({ identities: [] }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading identities from sync storage:", chrome.runtime.lastError);
        // Potentially inform the user
        identitiesList.innerHTML = '<li>Error loading identities. Check browser sync.</li>';
        return;
      }
      renderIdentities(result.identities);
    });
  }

  function renderIdentities(identities) {
    identitiesList.innerHTML = ''; // Clear current list
    if (identities.length === 0) {
      identitiesList.innerHTML = '<li>No identities saved yet.</li>';
      return;
    }
    identities.forEach(identity => {
      const listItem = document.createElement('li');
      listItem.textContent = `Name: ${identity.name}, Email: ${identity.email}`;

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.style.marginLeft = '10px';
      deleteButton.addEventListener('click', () => {
        deleteIdentity(identity.id);
      });

      listItem.appendChild(deleteButton);
      identitiesList.appendChild(listItem);
    });
  }

  function deleteIdentity(identityId) {
    // Delete identity from chrome.storage.sync
    chrome.storage.sync.get({ identities: [] }, (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error fetching identities for deletion:", chrome.runtime.lastError);
        return;
      }
      let identities = result.identities;
      identities = identities.filter(identity => identity.id !== identityId);
      chrome.storage.sync.set({ identities }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error deleting identity from sync storage:", chrome.runtime.lastError);
          alert(`Error deleting identity: ${chrome.runtime.lastError.message}.`);
        } else {
          console.log('Identity deleted from sync storage:', identityId);
          loadIdentities(); // Refresh the list
        }
      });
    });
  }
  // Note on conflict resolution for chrome.storage.sync:
  // Chrome handles conflicts automatically. Generally, the last write wins.
  // If more complex conflict resolution were needed (e.g., for shared form descriptions
  // if they were user-specific and synced), chrome.storage.sync might be too simple,
  // and a dedicated backend with conflict resolution logic would be required.
  // For identities, this automatic handling is usually sufficient.
});

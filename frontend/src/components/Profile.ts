import { User } from '../types/User';
import { ApiService } from '../services/ApiService';

export class Profile {
  private container: HTMLElement;
  private apiService: ApiService;
  private currentUser: User;
  private onBack: () => void;

  constructor(container: HTMLElement, currentUser: User, onBack: () => void) {
    this.container = container;
    this.apiService = new ApiService();
    this.currentUser = currentUser;
    this.onBack = onBack;
  }

  async render(): Promise<void> {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 p-6">
        <div class="max-w-4xl mx-auto">
          <div class="bg-gray-800 rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-white">User Profile</h1>
              <button id="back-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                ← Back
              </button>
            </div>

            <!-- Profile Information -->
            <div class="bg-gray-700 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-white mb-4">Profile Information</h2>

                <div class="space-y-4">
                  <!-- Avatar Upload Section -->
                  <div class="flex flex-col items-center mb-6">
                    <div class="relative mb-4">
                      <img id="avatar-preview" src="${this.currentUser.avatar || 'http://localhost:3001/api/avatars/avatars/default.svg'}"
                           alt="Avatar" class="w-24 h-24 rounded-full object-cover border-4 border-gray-500">
                      <button id="avatar-change-btn" class="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
                        </svg>
                      </button>
                    </div>
                    <input type="file" id="avatar-input" accept="image/jpeg,image/jpg,image/png" style="display: none;">
                    <button id="remove-avatar-btn" class="text-sm text-gray-400 hover:text-white">Remove Avatar</button>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input type="text" id="username" value="${this.currentUser.username}"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500" readonly>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                    <input type="text" id="displayName" value="${this.currentUser.displayName || ''}"
                           placeholder="Enter display name"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input type="email" id="email" value="${this.currentUser.email || ''}"
                           placeholder="Enter email address"
                           class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                    <textarea id="bio" rows="4" placeholder="Tell us about yourself..."
                              class="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500">${this.currentUser.bio || ''}</textarea>
                  </div>

                  <div class="flex space-x-3">
                    <button id="save-profile" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                      Save Changes
                    </button>
                    <button id="reset-profile" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                      Reset
                    </button>
                  </div>
                </div>
              </div>

            <!-- Account Information -->
            <div class="mt-6 bg-gray-700 rounded-lg p-6">
              <h2 class="text-xl font-semibold text-white mb-4">Account Information</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-300">Member since:</span>
                  <span class="text-white ml-2">${new Date(this.currentUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span class="text-gray-300">Last login:</span>
                  <span class="text-white ml-2">${this.currentUser.lastLoginAt ? new Date(this.currentUser.lastLoginAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div id="message-container" class="fixed top-4 right-4 z-50"></div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const backBtn = document.getElementById('back-btn')!;
    backBtn.addEventListener('click', () => {
      this.onBack();
    });

    const saveBtn = document.getElementById('save-profile')!;
    saveBtn.addEventListener('click', () => {
      this.saveProfile();
    });

    const resetBtn = document.getElementById('reset-profile')!;
    resetBtn.addEventListener('click', () => {
      this.resetForm();
    });

    // Avatar upload functionality
    const avatarChangeBtn = document.getElementById('avatar-change-btn')!;
    const avatarInput = document.getElementById('avatar-input') as HTMLInputElement;
    const removeAvatarBtn = document.getElementById('remove-avatar-btn')!;

    avatarChangeBtn.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.uploadAvatar(file);
      }
    });

    removeAvatarBtn.addEventListener('click', () => {
      this.removeAvatar();
    });
  }

  private async saveProfile(): Promise<void> {
    try {
      const displayName = (document.getElementById('displayName') as HTMLInputElement).value.trim();
      const email = (document.getElementById('email') as HTMLInputElement).value.trim();
      const bio = (document.getElementById('bio') as HTMLTextAreaElement).value.trim();

      const updates: any = {};
      if (displayName !== (this.currentUser.displayName || '')) {
        updates.displayName = displayName || undefined;
      }
      if (email !== (this.currentUser.email || '')) {
        updates.email = email || undefined;
      }
      if (bio !== (this.currentUser.bio || '')) {
        updates.bio = bio || undefined;
      }

      if (Object.keys(updates).length === 0) {
        this.showMessage('No changes to save', 'info');
        return;
      }

      const updatedUser = await this.apiService.updateProfile(updates);

      // Update current user object
      Object.assign(this.currentUser, updatedUser);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.showMessage('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update profile:', error);
      this.showMessage('Failed to update profile. Please try again.', 'error');
    }
  }

  private resetForm(): void {
    (document.getElementById('displayName') as HTMLInputElement).value = this.currentUser.displayName || '';
    (document.getElementById('email') as HTMLInputElement).value = this.currentUser.email || '';
    (document.getElementById('bio') as HTMLTextAreaElement).value = this.currentUser.bio || '';
  }

  private async uploadAvatar(file: File): Promise<void> {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.showMessage('Please select a JPG or PNG image.', 'error');
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showMessage('File size must be less than 5MB.', 'error');
        return;
      }

      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement;
        if (e.target?.result) {
          avatarPreview.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);

      // Get fresh user data before upload
      console.log('Getting current user data before upload...');
      const currentUserData = await this.apiService.getCurrentUser();
      this.currentUser = currentUserData;
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      // Upload to server
      console.log('Uploading avatar file:', file.name, file.type, file.size);
      const response = await this.apiService.uploadAvatar(file);
      console.log('Upload response:', response);

      // Update current user
      this.currentUser.avatar = `http://localhost:3001${response.avatarUrl}`;

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.showMessage('Avatar updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      this.showMessage(`Failed to upload avatar: ${(error as Error).message || 'Unknown error'}`, 'error');

      // Revert preview on error
      const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement;
      avatarPreview.src = this.currentUser.avatar || 'http://localhost:3001/api/avatars/avatars/default.svg';
    }
  }

  private async removeAvatar(): Promise<void> {
    try {
      // Set to default avatar
      const defaultAvatarUrl = 'http://localhost:3001/api/avatars/avatars/default.svg';

      // Update avatar on server
      await this.apiService.updateProfile({ avatar: null });

      // Update UI
      const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement;
      avatarPreview.src = defaultAvatarUrl;

      // Update current user
      this.currentUser.avatar = defaultAvatarUrl;

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      this.showMessage('Avatar removed successfully!', 'success');
    } catch (error) {
      console.error('Failed to remove avatar:', error);
      this.showMessage('Failed to remove avatar. Please try again.', 'error');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const container = document.getElementById('message-container')!;

    const messageEl = document.createElement('div');
    messageEl.className = `mb-4 p-4 rounded shadow-lg ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    } text-white`;
    messageEl.textContent = message;

    container.appendChild(messageEl);

    // Auto remove after 3 seconds
    setTimeout(() => {
      container.removeChild(messageEl);
    }, 3000);
  }
}
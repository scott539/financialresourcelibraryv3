import React, { useState, useCallback, useEffect } from 'react';
import { Resource, ResourceType, MainCategory, Tag, ALL_TAGS, Lead } from '../types';
import { UploadIcon, EditIcon, DeleteIcon, DownloadIcon, UsersIcon } from '../components/icons';
import { UNIFIED_IMAGE_DATA } from '../data/imageData';

type AdminTab = 'manage' | 'integrations' | 'embed' | 'settings';

interface AdminPageProps {
  resources: Resource[];
  leads: Lead[];
  addResource: (resource: Omit<Resource, 'id' | 'downloadCount'>) => Promise<void>;
  updateResource: (resource: Resource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  adminUsername: string;
  updateCredentials: (currentPass: string, newUser: string, newPass: string) => Promise<boolean>;
}

const emptyResource: Omit<Resource, 'id' | 'downloadCount'> = {
  title: '',
  description: '',
  type: ResourceType.PDF,
  category: MainCategory.TOOLKIT,
  tags: [],
  imageUrl: UNIFIED_IMAGE_DATA,
  isComingSoon: false,
  fileUrl: '',
  fileName: '',
};

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface FileUploadZoneProps {
    onFileUpload: (file: File, dataUrl: string) => void;
    previewUrl?: string;
    accept: string;
    label: string;
    helpText?: string;
    isImagePreview?: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({ onFileUpload, previewUrl, accept, label, helpText, isImagePreview }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            setFileName(file.name);
            const dataUrl = await fileToDataURL(file);
            onFileUpload(file, dataUrl);
        }
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(dragging);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDrag(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div
                onDragEnter={(e) => handleDrag(e, true)}
                onDragLeave={(e) => handleDrag(e, false)}
                onDragOver={(e) => handleDrag(e, true)}
                onDrop={handleDrop}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md transition-colors duration-200 ${isDragging ? 'border-primary bg-blue-50' : ''}`}
            >
                <div className="space-y-1 text-center">
                    {isImagePreview && previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="mx-auto h-24 w-24 rounded-md object-cover" />
                    ) : (
                        <UploadIcon />
                    )}
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                            <span>Upload a file</span>
                            <input id={`file-upload-${label}`} name={`file-upload-${label}`} type="file" className="sr-only" accept={accept} onChange={(e) => handleFileChange(e.target.files)} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
                    {!isImagePreview && (fileName || previewUrl) && <p className="text-sm text-gray-800 font-medium truncate">{fileName || 'File uploaded'}</p>}
                </div>
            </div>
        </div>
    );
};

interface ResourceFormProps {
    onSubmit: (resource: Omit<Resource, 'id' | 'downloadCount'> | Resource) => Promise<void>;
    initialData: Omit<Resource, 'id' | 'downloadCount'> | Resource | null;
    onCancel: () => void;
}

const ResourceForm: React.FC<ResourceFormProps> = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState(() => {
        const data = initialData || emptyResource;
        return { ...data, tags: data.tags || [] };
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = initialData && 'id' in initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // @ts-ignore
        const checked = e.target.checked;
        
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
    };

    const handleTagChange = (tag: Tag) => {
        setFormData(prev => {
            const newTags = prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag];
            return { ...prev, tags: newTags };
        });
    };
    
    const handleImageUpload = (file: File, dataUrl: string) => {
        setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
    }
    
    const handleFileUpload = (file: File, dataUrl: string) => {
        setFormData(prev => ({ ...prev, fileUrl: dataUrl, fileName: file.name }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(formData);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h3 className="text-2xl font-semibold text-slate">{isEditing ? 'Edit Resource' : 'Add New Resource'}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="col-span-1 space-y-4">
                    <FileUploadZone
                        label="Thumbnail Image"
                        onFileUpload={handleImageUpload}
                        previewUrl={formData.imageUrl}
                        accept="image/*"
                        helpText="Recommended: 400x400px. PNG, JPG, GIF up to 10MB"
                        isImagePreview
                    />
                    {!formData.isComingSoon && (
                        <FileUploadZone
                            label="Resource File"
                            onFileUpload={handleFileUpload}
                            previewUrl={formData.fileName}
                            accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,video/*,audio/*"
                            helpText="Documents, presentations, media files."
                        />
                    )}
                </div>
                <div className="col-span-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Short Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" required />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">File Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                                {Object.values(ResourceType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Main Category</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                                {Object.values(MainCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tags</label>
                        <div className="mt-2 p-3 border border-gray-300 rounded-md max-h-40 overflow-y-auto space-y-2">
                            {ALL_TAGS.map(tag => (
                                <label key={tag} className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.tags.includes(tag)}
                                        onChange={() => handleTagChange(tag)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">{tag}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 border rounded-md hover:bg-gray-50">
                            <input
                                type="checkbox"
                                name="isComingSoon"
                                checked={formData.isComingSoon}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">Mark as "Coming Soon"</span>
                        </label>
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Resource'}
                </button>
            </div>
        </form>
    );
};


// --- Main Admin Page Component ---

const AdminPage: React.FC<AdminPageProps> = ({ resources, leads, addResource, updateResource, deleteResource, adminUsername, updateCredentials }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('manage');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // State for Settings tab
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(adminUsername);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  useEffect(() => {
    setNewUsername(adminUsername);
  }, [adminUsername]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (!currentPassword || !newUsername.trim() || !newPassword) {
      setSettingsError('Please fill out all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }
    
    setIsUpdatingCreds(true);
    const wasSuccessful = await updateCredentials(currentPassword, newUsername.trim(), newPassword);
    setIsUpdatingCreds(false);

    if (wasSuccessful) {
      setSettingsSuccess('Credentials updated successfully! You may need to log in again on your next visit.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setSettingsError('The "Current Password" you entered is incorrect.');
    }
  };


  const handleFormSubmit = async (resourceData: Omit<Resource, 'id' | 'downloadCount'> | Resource) => {
    if ('id' in resourceData) {
      await updateResource(resourceData);
    } else {
      await addResource(resourceData);
    }
    setEditingResource(null);
    setShowForm(false);
  };
  
  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth'});
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
        const resourceToDelete = resources.find(r => r.id === id);
        if (resourceToDelete) {
          await deleteResource(id);
        }
    }
  }

  const handleCancelForm = () => {
      setEditingResource(null);
      setShowForm(false);
  }

  const handleAddNew = () => {
    setEditingResource(null);
    setShowForm(true);
  }
  
  const downloadSignupsAsCSV = useCallback((resource: Resource) => {
    const signups = leads.filter(lead => lead.resourceId === resource.id);
    if (signups.length === 0) {
      alert('No signups for this resource yet.');
      return;
    }

    const headers = ['firstName', 'email', 'timestamp'];
    const csvContent = [
      headers.join(','),
      ...signups.map(s => `"${s.firstName.replace(/"/g, '""')}","${s.email}","${new Date(s.timestamp).toLocaleString()}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const safeTitle = (resource.title || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `signups_${safeTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [leads]);

  const TabButton: React.FC<{ tab: AdminTab; label: string }> = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark ${
        activeTab === tab
          ? 'bg-white border-b-0 border-t border-x border-gray-300 text-primary'
          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate mb-6">Admin Dashboard</h1>
      <div className="border-b border-gray-300">
        <div className="flex space-x-2 -mb-px">
          <TabButton tab="manage" label="Manage Resources" />
          <TabButton tab="integrations" label="Integrations" />
          <TabButton tab="embed" label="Embed Instructions" />
          <TabButton tab="settings" label="Settings" />
        </div>
      </div>
      <div className="mt-6">
        {activeTab === 'manage' && (
            <div>
                 {showForm ? (
                    <ResourceForm 
                        onSubmit={handleFormSubmit} 
                        initialData={editingResource}
                        onCancel={handleCancelForm}
                    />
                 ) : (
                    <div className="text-right mb-6">
                        <button onClick={handleAddNew} className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm">
                            Add New Resource
                        </button>
                    </div>
                 )}

                <div>
                    <h3 className="text-2xl font-semibold text-slate mb-4">Existing Resources</h3>
                    {resources.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {resources.map(resource => (
                            <div key={resource.id} className="relative bg-white rounded-lg shadow-md border flex flex-col">
                                {resource.isComingSoon && (
                                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full z-10">
                                        Coming Soon
                                    </div>
                                )}
                                <img src={resource.imageUrl} alt={resource.title} className="w-full aspect-square object-cover rounded-t-lg" />
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-bold text-slate truncate flex-grow">{resource.title}</h4>
                                    <p className="text-xs text-gray-500">{resource.category}</p>
                                    <div className="mt-2 flex justify-between items-center">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <DownloadIcon className="w-4 h-4 mr-1"/>
                                            <span>{(resource.downloadCount || 0).toLocaleString()} {resource.isComingSoon ? 'Signups' : 'Downloads'}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {resource.isComingSoon && (
                                                <button 
                                                    onClick={() => downloadSignupsAsCSV(resource)} 
                                                    className="p-2 text-gray-500 hover:text-green-600 transition-colors rounded-full hover:bg-green-100" 
                                                    aria-label="Download Signups CSV"
                                                    title="Download Signups CSV"
                                                >
                                                    <UsersIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleEdit(resource)} className="p-2 text-gray-500 hover:text-primary transition-colors rounded-full hover:bg-blue-100" aria-label="Edit">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(resource.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-100" aria-label="Delete">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                     ) : (
                        <div className="text-center py-16 border-dashed border-2 border-gray-300 rounded-lg">
                            <h2 className="text-xl font-semibold text-slate">No Resources Yet</h2>
                            <p className="text-gray-500 mt-1">Click "Add New Resource" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
        {activeTab === 'integrations' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold text-slate mb-4">ConvertKit Integration</h2>
            <div className="prose max-w-none">
                <p>To integrate this library with ConvertKit, you would typically modify the lead capture service.</p>
                <ol>
                    <li>In <code>services/api.ts</code>, replace the mock <code>addSubscriber</code> function with a real API call to ConvertKit.</li>
                    <li>You would need to use your ConvertKit API key and the ID of the form or tag you want to add subscribers to.</li>
                    <li>The function would make a POST request to the ConvertKit API endpoint, sending the subscriber's email and first name.</li>
                    <li>Ensure you handle API errors gracefully, providing feedback to the user if the subscription fails.</li>
                </ol>
                <pre><code className="language-javascript">
{`// Example of a real addSubscriber function
const CONVERTKIT_API_KEY = 'your_api_key';
const CONVERTKIT_FORM_ID = 'your_form_id';

export const addLead = async (resourceId, leadData) => {
  // Your API call to ConvertKit
  const response = await fetch(\`https://api.convertkit.com/v3/forms/\${CONVERTKIT_FORM_ID}/subscribe\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: CONVERTKIT_API_KEY,
      email: leadData.email,
      first_name: leadData.firstName,
      // You can also add tags here
    }),
  });
  // After the API call, you would still update your local data
  // to reflect the new lead and download count.
  // ... (localStorage logic) ...
  return response.json();
};`}
                </code></pre>
            </div>
          </div>
        )}
        {activeTab === 'embed' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold text-slate mb-4">Embed Instructions for WordPress</h2>
            <div className="prose max-w-none">
              <p>You can easily embed this Financial Resource Library into your WordPress site by adding a simple script. This will place the entire application within your page or post, and it will <strong>automatically resize</strong> to fit the content.</p>
              <h4>Steps:</h4>
              <ol>
                <li>Navigate to the editor for the page or post where you want to add the library.</li>
                <li>Add a new <strong>"Custom HTML"</strong> block to your content.</li>
                <li>Copy and paste the following code into the Custom HTML block.</li>
              </ol>
              <pre><code className="language-javascript">
{`<div id="financial-library-embed"></div>
<script>
  (function() {
    var container = document.getElementById('financial-library-embed');
    if (!container) return;

    var iframe = document.createElement('iframe');
    var appUrl = 'URL_OF_THIS_APP'; // <-- IMPORTANT: Update this URL

    iframe.src = appUrl;
    iframe.width = '100%';
    iframe.scrolling = 'no'; // Disable iframe's own scrollbar
    iframe.style.border = 'none';
    iframe.style.height = '800px'; // Set an initial height
    iframe.title = 'Financial Resource Library';
    
    container.innerHTML = '';
    container.appendChild(iframe);

    // Listen for height updates from the embedded app
    window.addEventListener('message', function(event) {
      // Security: Check if the message comes from the expected app URL
      try {
        var appOrigin = new URL(appUrl).origin;
        if (event.origin !== appOrigin) {
          return;
        }
      } catch (e) {
        console.warn('Embed script: Please replace "URL_OF_THIS_APP" with a valid URL to enable dynamic resizing.');
        return;
      }

      // Check if the message contains the expected data
      if (event.data && event.data.type === 'financial-library-resize' && typeof event.data.height === 'number') {
        iframe.style.height = event.data.height + 'px';
      }
    });
  })();
<\/script>`}
              </code></pre>
              <h4>Customization Tips:</h4>
              <ul>
                <li><strong>Important:</strong> Replace <code>URL_OF_THIS_APP</code> with the actual public URL where this application is hosted. The dynamic height adjustment will not work until this is set to a valid URL.</li>
                <li>The script includes a default height of 800px, which will be used while the app loads.</li>
                <li>The script will automatically create a responsive iframe that fills the width of its container on your page and adjusts its height to prevent internal scrollbars.</li>
              </ul>
              <h4 className="mt-6">Troubleshooting</h4>
              <p><strong>My Website's Menu Covers the App</strong></p>
              <p>If your website has a "sticky" or "fixed" header that stays at the top when you scroll, it might cover the top part of the embedded app. This is a common issue and is easy to fix on your WordPress page:</p>
              <ul>
                <li><strong>No-Code Solution:</strong> Add a <strong>"Spacer" block</strong> in the WordPress editor right before the "Custom HTML" block you used for the app. Adjust the Spacer's height until the app appears correctly below your menu.</li>
                <li><strong>CSS Solution:</strong> A web developer can add a CSS style like <code>margin-top: 80px;</code> to the block that contains the embed script. The `80px` value should be the height of your website's header.</li>
              </ul>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate mb-1">Admin Settings</h2>
            <p className="text-gray-500 mb-6">Update the username and password used to access the admin dashboard.</p>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Username</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  required
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input 
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Enter current password to make changes"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Leave blank to keep current password"
                  required
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  required
                />
              </div>
              
              {settingsError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{settingsError}</p>}
              {settingsSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{settingsSuccess}</p>}
              
              <div className="pt-2 flex justify-end">
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm disabled:opacity-50" disabled={isUpdatingCreds}>
                  {isUpdatingCreds ? 'Updating...' : 'Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
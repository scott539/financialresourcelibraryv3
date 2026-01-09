
import React, { useState, useCallback, useEffect } from 'react';
import { Resource, ResourceType, MainCategory, Tag, ALL_TAGS, Lead } from '../types';
import { UploadIcon, EditIcon, DeleteIcon, DownloadIcon, UsersIcon, EyeIcon, EyeOffIcon, ClockIcon, CopyIcon } from '../components/icons';
import { UNIFIED_IMAGE_DATA } from '../data/imageData';

type AdminTab = 'manage' | 'integrations' | 'embed' | 'settings';

interface AdminPageProps {
  resources: Resource[];
  leads: Lead[];
  addResource: (resource: Omit<Resource, 'id' | 'downloadCount'>, file?: File) => Promise<void>;
  updateResource: (resource: Resource, file?: File) => Promise<void>;
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
  googleDriveUrl: '',
  isHidden: false,
  liveDate: '',
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
            let dataUrl = '';
            if (isImagePreview) {
                dataUrl = await fileToDataURL(file);
            }
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
    onSubmit: (resource: Omit<Resource, 'id' | 'downloadCount'> | Resource, file?: File) => Promise<void>;
    initialData: Omit<Resource, 'id' | 'downloadCount'> | Resource | null;
    onCancel: () => void;
}

const ResourceForm: React.FC<ResourceFormProps> = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState(() => {
        const data = initialData || emptyResource;
        
        let liveDateString = '';
        if (data.liveDate && typeof data.liveDate.toDate === 'function') {
            const d = data.liveDate.toDate();
            const pad = (num: number) => num.toString().padStart(2, '0');
            liveDateString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        
        return { ...data, tags: data.tags || [], liveDate: liveDateString };
    });
    const [resourceFile, setResourceFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string>('');
    const isEditing = initialData && 'id' in initialData;

    const hasDownloadable = !!formData.fileUrl || !!formData.googleDriveUrl?.trim() || !!resourceFile;
    const isEffectivelyComingSoon = !hasDownloadable;

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
        setResourceFile(file);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');
        
        try {
            const dataToSubmit = { 
                ...formData, 
                isComingSoon: isEffectivelyComingSoon 
            };
            await onSubmit(dataToSubmit, resourceFile || undefined);
        } catch (error: any) {
            console.error("[AdminPage] Error submitting resource:", error);
            setSubmitError(error.message || "An unexpected error occurred while saving. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
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
                    <>
                      <FileUploadZone
                          label="Resource File (for direct download)"
                          onFileUpload={handleFileUpload}
                          previewUrl={formData.fileName}
                          accept="application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,video/*,audio/*"
                          helpText="Documents, presentations, media files."
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Google Drive URL (Optional)</label>
                        <input type="url" name="googleDriveUrl" value={formData.googleDriveUrl || ''} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" placeholder="https://docs.google.com/..." />
                      </div>
                    </>
                </div>
                <div className="col-span-1 space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input id="title" type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" required />
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline">
                           <label htmlFor="description" className="block text-sm font-medium text-gray-700">Short Description</label>
                           <span className={`text-xs font-medium ${formData.description.length >= 150 ? 'text-red-600' : 'text-gray-500'}`}>
                               {formData.description.length} / 150
                           </span>
                        </div>
                        <textarea 
                            id="description"
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            rows={3} 
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" 
                            required 
                            maxLength={150}
                        />
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
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Schedule Go-Live Date (Optional)</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <input
                                    type="datetime-local"
                                    name="liveDate"
                                    value={formData.liveDate || ''}
                                    onChange={handleChange}
                                    className="flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({...prev, liveDate: ''}))}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-300 text-sm font-medium"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <label className="flex items-center space-x-3 p-2 border rounded-md bg-gray-100 cursor-not-allowed">
                            <input
                                type="checkbox"
                                name="isComingSoon"
                                checked={isEffectivelyComingSoon}
                                readOnly
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">"Coming Soon" (automatic)</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 border rounded-md hover:bg-gray-50">
                            <input
                                type="checkbox"
                                name="isHidden"
                                checked={!!formData.isHidden}
                                onChange={handleChange}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">Hide from public view</span>
                        </label>
                    </div>
                </div>
            </div>
            
            {submitError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-bold">Error saving resource</p>
                    <p className="text-sm">{submitError}</p>
                </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark disabled:opacity-50" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Resource'}
                </button>
            </div>
        </form>
    );
};

const AdminPage: React.FC<AdminPageProps> = ({ resources, leads, addResource, updateResource, deleteResource, adminUsername, updateCredentials }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('manage');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
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
      setSettingsSuccess('Credentials updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setSettingsError('Incorrect current password.');
    }
  };

  const handleFormSubmit = async (resourceData: Omit<Resource, 'id' | 'downloadCount'> | Resource, file?: File) => {
    if ('id' in resourceData) {
      await updateResource(resourceData as Resource, file);
    } else {
      await addResource(resourceData, file);
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
    if (window.confirm('Delete this resource?')) {
        await deleteResource(id, resources.find(r => r.id === id)!);
    }
  }

  const handleToggleVisibility = async (resource: Resource) => {
    const updated = { ...resource, isHidden: !resource.isHidden };
    await updateResource(updated);
  };

  const handleCancelForm = () => {
      setEditingResource(null);
      setShowForm(false);
  }

  const handleAddNew = () => {
    setEditingResource(null);
    setShowForm(true);
  }

  // Improved robust copy mechanism
  const handleCopyId = (id: string) => {
    const performCopy = () => {
      // 1. Try modern Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(id);
      } else {
        // 2. Fallback to execCommand('copy') with a temporary textarea
        const textArea = document.createElement("textarea");
        textArea.value = id;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          textArea.remove();
          return successful ? Promise.resolve() : Promise.reject();
        } catch (err) {
          textArea.remove();
          return Promise.reject(err);
        }
      }
    };

    performCopy()
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error('Copy failed:', err);
        // Manual fallback alert for extreme cases
        alert(`Copy failed. Please copy this ID manually: ${id}`);
      });
  };
  
  const downloadSignupsAsCSV = useCallback((resource: Resource) => {
    const signups = leads.filter(lead => lead.resourceId === resource.id);
    if (signups.length === 0) {
      alert('No signups yet.');
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate">Admin Dashboard</h1>
        {!showForm && activeTab === 'manage' && (
          <button onClick={handleAddNew} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-dark shadow-md active:scale-95 transition-all">
              + Add New Resource
          </button>
        )}
      </div>

      <div className="border-b border-gray-300">
        <div className="flex space-x-2 -mb-px">
          <TabButton tab="manage" label="Resources" />
          <TabButton tab="integrations" label="Integrations" />
          <TabButton tab="embed" label="Embed Site" />
          <TabButton tab="settings" label="Settings" />
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'manage' && (
            <div>
                 {showForm && (
                    <ResourceForm 
                        onSubmit={handleFormSubmit} 
                        initialData={editingResource}
                        onCancel={handleCancelForm}
                    />
                 )}

                <div>
                    <h3 className="text-xl font-bold text-slate mb-6">Library Content</h3>
                    {resources.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {resources.map(resource => {
                            const isScheduled = resource.liveDate && resource.liveDate.toDate() > new Date();
                            const isCurrentlyCopied = copiedId === resource.id;
                            
                            return (
                            <div key={resource.id} className="relative bg-white rounded-xl shadow-md border border-gray-100 flex flex-col transition-all hover:shadow-lg">
                                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                                    {isScheduled && (
                                        <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                                            Scheduled
                                        </span>
                                    )}
                                    {resource.isComingSoon && (
                                        <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                                            Coming Soon
                                        </div>
                                    )}
                                </div>
                                
                                {resource.isHidden && (
                                    <div className="absolute top-3 right-3 bg-slate text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded z-10 shadow-sm opacity-90">
                                        Hidden
                                    </div>
                                )}
                                
                                <img src={resource.imageUrl} alt={resource.title} className="w-full aspect-square object-cover rounded-t-xl" />
                                
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-bold text-slate leading-tight mb-1 truncate" title={resource.title}>{resource.title}</h4>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-4 tracking-wider">{resource.category}</p>
                                    
                                    {/* SELECTABLE EMBED ID BLOCK */}
                                    <div className="mb-5">
                                      <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] uppercase font-black text-slate/40 tracking-widest">Embed ID</span>
                                          {isCurrentlyCopied && (
                                              <span className="text-[10px] font-bold text-green-600 animate-pulse">COPIED!</span>
                                          )}
                                      </div>
                                      <div className="flex items-stretch gap-1">
                                          <input
                                            readOnly
                                            value={resource.id}
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                            title="Click to select ID"
                                            className={`flex-grow text-[11px] font-mono p-2 bg-gray-50 border rounded-l-lg transition-all outline-none cursor-text ${isCurrentlyCopied ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-200 text-primary focus:border-primary/50'}`}
                                          />
                                          <button 
                                              onClick={() => handleCopyId(resource.id)}
                                              className={`px-3 border border-l-0 rounded-r-lg transition-all flex items-center justify-center group/copy ${isCurrentlyCopied ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-primary'}`}
                                              title="Copy to clipboard"
                                          >
                                              <CopyIcon className="w-3.5 h-3.5" />
                                          </button>
                                      </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex items-center text-sm font-bold text-slate">
                                                <DownloadIcon className="w-3.5 h-3.5 mr-1 text-primary"/>
                                                <span>{(resource.downloadCount || 0).toLocaleString()}</span>
                                            </div>
                                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{resource.isComingSoon ? 'Leads' : 'Downloads'}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            {resource.isComingSoon && (
                                                <button onClick={() => downloadSignupsAsCSV(resource)} className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50" title="CSV">
                                                    <UsersIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleToggleVisibility(resource)} className={`p-2 transition-colors rounded-lg ${resource.isHidden ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`} title="Toggle Hide">
                                                {resource.isHidden ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => handleEdit(resource)} className="p-2 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-blue-50" title="Edit">
                                                <EditIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(resource.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Delete">
                                                <DeleteIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                     ) : (
                        <div className="text-center py-24 border-dashed border-2 border-gray-200 rounded-2xl bg-gray-50/50">
                            <h2 className="text-xl font-bold text-slate/50">Your library is empty</h2>
                            <button onClick={handleAddNew} className="mt-4 px-8 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark">Add First Resource</button>
                        </div>
                    )}
                </div>
            </div>
        )}
        {activeTab === 'integrations' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl">
            <h2 className="text-2xl font-bold text-slate mb-6">External Integrations</h2>
            <div className="space-y-6">
                <div className="p-6 bg-blue-50/50 rounded-xl border border-blue-100">
                    <h3 className="text-lg font-bold text-primary mb-3">ConvertKit Flow</h3>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Leads are currently captured in your Firebase database. To automate emails, you can export the CSV on each card or connect your ConvertKit API key directly in <code>services/api.ts</code>.
                    </p>
                    <div className="bg-slate rounded-xl p-5 shadow-inner">
                        <pre className="text-[11px] text-blue-100 font-mono leading-relaxed"><code>{`// Sync lead with ConvertKit API
export const addLead = async (leadData) => {
  const CK_FORM_ID = 'YOUR_FORM_ID';
  const CK_API_KEY = 'YOUR_API_KEY';
  
  await fetch(\`https://api.convertkit.com/v3/forms/\${CK_FORM_ID}/subscribe\`, {
    method: 'POST',
    body: JSON.stringify({ api_key: CK_API_KEY, ...leadData })
  });
};`}</code></pre>
                    </div>
                </div>
            </div>
          </div>
        )}
        {activeTab === 'embed' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-4xl">
            <h2 className="text-2xl font-bold text-slate mb-6">Embedding Instructions</h2>
            <div className="space-y-10">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-white font-black rounded-full">1</div>
                  <h3 className="text-lg font-bold text-slate">Full Library Embed</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4 ml-11">Place the entire library on a WordPress page. It will automatically resize to fit perfectly.</p>
                <div className="ml-11 relative group bg-slate rounded-xl p-5">
                    <button 
                        onClick={() => handleCopyId(`<div id="bp-money-library"></div>\n<script src="${window.location.origin}/embed.js"></script>`)}
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        title="Copy Script"
                    >
                        <CopyIcon className="w-4 h-4" />
                    </button>
                    <pre className="text-xs text-blue-100 font-mono overflow-x-auto"><code>{`<div id="bp-money-library" style="width:100%"></div>
<script>
  // Add library loader script here...
</script>`}</code></pre>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-white font-black rounded-full">2</div>
                  <h3 className="text-lg font-bold text-slate">Single Resource Landing Page</h3>
                </div>
                <p className="text-sm text-gray-500 mb-6 ml-11">Embed just one specific card by copying its <strong>Embed ID</strong> from the Resources tab and using it in your landing page script.</p>
                <div className="ml-11 p-5 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        Quick Start:
                    </p>
                    <p className="text-xs text-amber-800 italic">
                        The single-resource view is "headless" (no headers/footers), designed to blend seamlessly into your existing WordPress layouts.
                    </p>
                </div>
              </section>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-slate mb-2">Access Control</h2>
            <p className="text-sm text-gray-400 mb-8">Change the credentials used to manage this library.</p>
            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate/50 uppercase tracking-widest mb-2">Admin Username</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm p-3"
                  required
                />
              </div>
               <div>
                <label className="block text-[10px] font-black text-slate/50 uppercase tracking-widest mb-2">Current Password</label>
                <input 
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm p-3"
                  placeholder="Verify your identity"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate/50 uppercase tracking-widest mb-2">New Password</label>
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm p-3"
                      required
                    />
                  </div>
                   <div>
                    <label className="block text-[10px] font-black text-slate/50 uppercase tracking-widest mb-2">Confirm New</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full border-gray-200 rounded-xl shadow-sm focus:ring-primary focus:border-primary text-sm p-3"
                      required
                    />
                  </div>
              </div>
              
              {settingsError && <p className="text-xs text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 font-bold">{settingsError}</p>}
              {settingsSuccess && <p className="text-xs text-green-600 bg-green-50 p-4 rounded-xl border border-green-100 font-bold">{settingsSuccess}</p>}
              
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-10 py-3 text-sm font-black uppercase tracking-widest text-white bg-primary rounded-xl hover:bg-primary-dark shadow-lg active:scale-95 transition-all disabled:opacity-50" disabled={isUpdatingCreds}>
                  {isUpdatingCreds ? 'Saving...' : 'Update Credentials'}
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

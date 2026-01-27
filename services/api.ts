
import { Lead, Resource } from '../types';
import { auth, db, storage } from '../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  signInWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';

// --- Helper Functions ---

const dataURItoBlob = (dataURI: string) => {
    try {
        const splitData = dataURI.split(',');
        const byteString = atob(splitData[1]);
        const mimeString = splitData[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    } catch (e) {
        console.error("Error converting data URI to blob:", e);
        throw new Error("Invalid image data.");
    }
}

// --- Resources API ---

export const getResources = async (): Promise<Resource[]> => {
  const resourcesCol = collection(db, 'resources');
  const resourceSnapshot = await getDocs(resourcesCol);
  const resourceList = resourceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Resource));
  return resourceList;
};

const uploadFile = async (file: File | Blob | string, path: string, fileName: string): Promise<string> => {
    console.log(`[API] Starting upload for ${fileName} to ${path}`);
    const storageRef = ref(storage, path);
    const bucketName = storage.app.options.storageBucket;
    const metadata = {
        contentDisposition: `attachment; filename="${fileName}"`,
    };
    
    try {
        const uploadTask = async () => {
            if (file instanceof File || file instanceof Blob) {
                console.log(`[API] Uploading as bytes (File/Blob)... size: ${(file as any).size}`);
                await uploadBytes(storageRef, file, metadata);
            } else {
                console.log('[API] Uploading as base64 string...');
                await uploadString(storageRef, file, 'data_url', metadata);
            }
            console.log(`[API] Upload successful for ${fileName}, getting download URL...`);
            return await getDownloadURL(storageRef);
        };

        const timeoutTask = new Promise<string>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Upload timed out for bucket: ${bucketName}. This is almost certainly caused by missing CORS configuration. Please go to the Admin -> Integrations tab for the fix.`));
            }, 30000); // 30 second timeout
        });

        return await Promise.race([uploadTask(), timeoutTask]);
    } catch (error: any) {
        console.error(`[API] Upload failed for ${fileName}:`, error);
        throw error;
    }
};


export const addResource = async (resourceData: Omit<Resource, 'id' | 'downloadCount'>, fileToUpload?: File): Promise<Resource> => {
  console.log('[API] addResource called');
  let imageUrl = resourceData.imageUrl;
  
  if (imageUrl.startsWith('data:')) {
    const imagePath = `thumbnails/${new Date().getTime()}_${resourceData.title.replace(/\s+/g, '_')}`;
    const tempImageName = `thumbnail_${Date.now()}`;
    const imageBlob = dataURItoBlob(imageUrl);
    imageUrl = await uploadFile(imageBlob, imagePath, tempImageName);
  }

  let fileUrl = resourceData.fileUrl || '';
  
  if (fileToUpload) {
     const uniqueFolderName = new Date().getTime();
     const filePath = `files/${uniqueFolderName}/${resourceData.fileName}`;
     fileUrl = await uploadFile(fileToUpload, filePath, resourceData.fileName);
  } else if (fileUrl && fileUrl.startsWith('data:')) {
     const uniqueFolderName = new Date().getTime();
     const filePath = `files/${uniqueFolderName}/${resourceData.fileName}`;
     const fileBlob = dataURItoBlob(fileUrl);
     fileUrl = await uploadFile(fileBlob, filePath, resourceData.fileName);
  }

  let liveDateForDb = null;
  if (resourceData.liveDate) {
    liveDateForDb = new Date(resourceData.liveDate);
  }

  const docRef = await addDoc(collection(db, 'resources'), {
    ...resourceData,
    imageUrl,
    fileUrl,
    liveDate: liveDateForDb,
    downloadCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return { ...resourceData, id: docRef.id, downloadCount: 0 };
};

export const updateResource = async (updatedResource: Resource, fileToUpload?: File): Promise<Resource> => {
    const resourceRef = doc(db, 'resources', updatedResource.id);
    const dataToUpdate: any = { ...updatedResource, updatedAt: serverTimestamp() };

    if (updatedResource.imageUrl.startsWith('data:')) {
        const imagePath = `thumbnails/${new Date().getTime()}_${updatedResource.title.replace(/\s+/g, '_')}`;
        const tempImageName = `thumbnail_${Date.now()}`;
        const imageBlob = dataURItoBlob(updatedResource.imageUrl);
        dataToUpdate.imageUrl = await uploadFile(imageBlob, imagePath, tempImageName);
    }

    if (fileToUpload) {
        const uniqueFolderName = new Date().getTime();
        const filePath = `files/${uniqueFolderName}/${updatedResource.fileName}`;
        dataToUpdate.fileUrl = await uploadFile(fileToUpload, filePath, updatedResource.fileName);
    } else if (updatedResource.fileUrl && updatedResource.fileUrl.startsWith('data:')) {
        const uniqueFolderName = new Date().getTime();
        const filePath = `files/${uniqueFolderName}/${updatedResource.fileName}`;
        const fileBlob = dataURItoBlob(updatedResource.fileUrl);
        dataToUpdate.fileUrl = await uploadFile(fileBlob, filePath, updatedResource.fileName);
    }

    if (typeof dataToUpdate.liveDate === 'string') {
        dataToUpdate.liveDate = dataToUpdate.liveDate ? new Date(dataToUpdate.liveDate) : null;
    }
    
    delete dataToUpdate.id;
    await updateDoc(resourceRef, dataToUpdate);
    return updatedResource;
};


export const deleteResource = async (id: string, resource: Resource): Promise<void> => {
    const resourceRef = doc(db, 'resources', id);
    await deleteDoc(resourceRef);

    try {
        if (resource.imageUrl && !resource.imageUrl.startsWith('data:')) {
            const imageRef = ref(storage, resource.imageUrl);
            await deleteObject(imageRef);
        }
        if (resource.fileUrl && !resource.fileUrl.startsWith('data:')) {
            const fileRef = ref(storage, resource.fileUrl);
            await deleteObject(fileRef);
        }
    } catch(error) {
        console.error("Error deleting storage files:", error);
    }
};

export const getLeads = async (): Promise<Lead[]> => {
    const leadsCol = collection(db, 'leads');
    const leadSnapshot = await getDocs(leadsCol);
    return leadSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Lead));
}

export const addLead = async (resourceId: string, resourceTitle: string, leadData: { firstName: string; email: string; hasConsented: boolean; }): Promise<Lead> => {
    const newLead: Omit<Lead, 'id'> = {
        ...leadData,
        resourceId,
        resourceTitle,
        timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'leads'), newLead);

    try {
        const resourceRef = doc(db, 'resources', resourceId);
        await runTransaction(db, async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            if (!resourceDoc.exists()) return;
            const newDownloadCount = (resourceDoc.data().downloadCount || 0) + 1;
            transaction.update(resourceRef, { downloadCount: newDownloadCount });
        });
    } catch (error) {
        console.error("Failed to update download count:", error);
    }

    return { ...newLead, id: docRef.id };
};

export const incrementResourceAccessCount = async (resourceId: string): Promise<void> => {
    try {
        const resourceRef = doc(db, 'resources', resourceId);
        await runTransaction(db, async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            if (!resourceDoc.exists()) return;
            const newDownloadCount = (resourceDoc.data().downloadCount || 0) + 1;
            transaction.update(resourceRef, { downloadCount: newDownloadCount });
        });
    } catch (error) {
        console.error("Failed to update download count:", error);
    }
};

export const login = async (email: string, pass: string): Promise<boolean> => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        return true;
    } catch (error) {
        console.error("Login failed:", error);
        return false;
    }
};

export const logout = async (): Promise<void> => {
    await auth.signOut();
};

export const updateCredentials = async (currentPass: string, newEmail: string, newPass: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user || !user.email) return false;

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPass);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPass);
        return true;
    } catch (error) {
        console.error("Failed to update credentials:", error);
        return false;
    }
};

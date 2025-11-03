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
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}

// --- Resources API ---

export const getResources = async (): Promise<Resource[]> => {
  const resourcesCol = collection(db, 'resources');
  const resourceSnapshot = await getDocs(resourcesCol);
  const resourceList = resourceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Resource));
  return resourceList;
};

const uploadFile = async (fileDataUrl: string, path: string, fileName: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const metadata = {
        contentDisposition: `attachment; filename="${fileName}"`,
    };
    await uploadString(storageRef, fileDataUrl, 'data_url', metadata);
    return getDownloadURL(storageRef);
};


export const addResource = async (resourceData: Omit<Resource, 'id' | 'downloadCount'>): Promise<Resource> => {
  let imageUrl = resourceData.imageUrl;
  if (imageUrl.startsWith('data:')) {
    const imagePath = `thumbnails/${new Date().getTime()}_${resourceData.title.replace(/\s+/g, '_')}`;
    // Image thumbnails don't need the download behavior, so we can use a simpler upload or pass an empty filename.
    const tempImageName = `thumbnail_${Date.now()}`;
    imageUrl = await uploadFile(imageUrl, imagePath, tempImageName);
  }

  let fileUrl = resourceData.fileUrl || '';
  if (fileUrl && fileUrl.startsWith('data:')) {
     const uniqueFolderName = new Date().getTime();
     const filePath = `files/${uniqueFolderName}/${resourceData.fileName}`;
     fileUrl = await uploadFile(fileUrl, filePath, resourceData.fileName);
  }

  const docRef = await addDoc(collection(db, 'resources'), {
    ...resourceData,
    imageUrl,
    fileUrl,
    downloadCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return { ...resourceData, id: docRef.id, downloadCount: 0 };
};

export const updateResource = async (updatedResource: Resource): Promise<Resource> => {
    const resourceRef = doc(db, 'resources', updatedResource.id);
    const dataToUpdate: Partial<Resource> & { updatedAt: any } = { ...updatedResource, updatedAt: serverTimestamp() };

    // Handle image upload if it's a new data URL
    if (updatedResource.imageUrl.startsWith('data:')) {
        const imagePath = `thumbnails/${new Date().getTime()}_${updatedResource.title.replace(/\s+/g, '_')}`;
        const tempImageName = `thumbnail_${Date.now()}`;
        dataToUpdate.imageUrl = await uploadFile(updatedResource.imageUrl, imagePath, tempImageName);
    }

    // Handle file upload if it's a new data URL
    if (updatedResource.fileUrl && updatedResource.fileUrl.startsWith('data:')) {
        const uniqueFolderName = new Date().getTime();
        const filePath = `files/${uniqueFolderName}/${updatedResource.fileName}`;
        dataToUpdate.fileUrl = await uploadFile(updatedResource.fileUrl, filePath, updatedResource.fileName);
    }

    await updateDoc(resourceRef, dataToUpdate);
    return updatedResource;
};


export const deleteResource = async (id: string, resource: Resource): Promise<void> => {
    const resourceRef = doc(db, 'resources', id);
    await deleteDoc(resourceRef);

    // Also delete associated files from storage
    try {
        if (resource.imageUrl) {
            const imageRef = ref(storage, resource.imageUrl);
            await deleteObject(imageRef);
        }
        if (resource.fileUrl) {
            const fileRef = ref(storage, resource.fileUrl);
            await deleteObject(fileRef);
        }
    } catch(error) {
        console.error("Error deleting storage files, they may not exist or have been deleted already:", error);
    }
};

// --- Leads API ---

export const getLeads = async (): Promise<Lead[]> => {
    const leadsCol = collection(db, 'leads');
    const leadSnapshot = await getDocs(leadsCol);
    const leadList = leadSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Lead));
    return leadList;
}

export const addLead = async (resourceId: string, resourceTitle: string, leadData: { firstName: string; email: string; hasConsented: boolean; }): Promise<Lead> => {
    const newLead: Omit<Lead, 'id'> = {
        ...leadData,
        resourceId,
        resourceTitle,
        timestamp: new Date().toISOString()
    };

    // Step 1: Securely add the lead. This is the primary operation.
    const docRef = await addDoc(collection(db, 'leads'), newLead);

    // Step 2: Increment the download count.
    // With the updated security rules, this transaction should succeed for all users.
    try {
        const resourceRef = doc(db, 'resources', resourceId);
        await runTransaction(db, async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            if (!resourceDoc.exists()) {
                console.error("Resource not found for download count update.");
                return;
            }
            const newDownloadCount = (resourceDoc.data().downloadCount || 0) + 1;
            transaction.update(resourceRef, { downloadCount: newDownloadCount });
        });
    } catch (error) {
        // This could fail due to network issues or if the transaction is contended.
        // We log it for debugging but don't block the user experience.
        console.error("Failed to update download count:", error);
    }

    return { ...newLead, id: docRef.id };
};


// --- Auth API ---

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
        
        // Once reauthenticated, update password.
        // Updating email requires more complex logic (e.g., verification) and is omitted for simplicity.
        // The username is stored in Firestore, this function will only handle password for now.
        await updatePassword(user, newPass);
        
        // You would typically use a Cloud Function to update the username in the `users` collection.
        // For now, we are focusing on the client-side password update.
        console.log("Password updated successfully.");
        return true;
    } catch (error) {
        console.error("Failed to update credentials:", error);
        return false;
    }
};
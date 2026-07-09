
import { Lead, Resource } from '../types';
import { auth, db, storage } from '../firebaseConfig';
import { STATIC_RESOURCES } from '../data/staticResources';
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  onSnapshot,
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

const dataURItoBlob = (dataURI: string): Blob => {
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
        console.error("[API] Error converting data URI to blob:", e);
        throw new Error("Invalid file format selected.");
    }
}

// --- Resources API ---

export const getResources = async (): Promise<Resource[]> => {
  try {
    const resourcesCol = collection(db, 'resources');
    const resourceSnapshot = await getDocs(resourcesCol);
    return resourceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Resource));
  } catch (err) {
    console.error("[API] Failed to fetch resources:", err);
    return [];
  }
};

export const subscribeResources = (
  onUpdate: (resources: Resource[]) => void,
  onError?: (err: any) => void
): (() => void) => {
  const resourcesCol = collection(db, 'resources');
  return onSnapshot(resourcesCol, (snapshot) => {
    const resources = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Resource));
    onUpdate(resources);
  }, (err) => {
    console.error("[API] Real-time subscription failed:", err);
    if (onError) onError(err);
  });
};

const uploadFile = async (file: File | Blob | string, path: string, fileName: string): Promise<string> => {
    const bucketName = storage.app.options.storageBucket;
    console.log(`[API] Attempting upload to bucket: ${bucketName} at path: ${path}`);
    
    const storageRef = ref(storage, path);
    const metadata = {
        contentType: (file instanceof File || file instanceof Blob) ? file.type : undefined,
    };
    
    try {
        const uploadTask = async () => {
            if (file instanceof File || file instanceof Blob) {
                await uploadBytes(storageRef, file, metadata);
            } else {
                await uploadString(storageRef, file, 'data_url', metadata);
            }
            return await getDownloadURL(storageRef);
        };

        // We use a robust timeout to catch CORS / Network hangs
        const timeoutTask = new Promise<string>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Upload timed out. This is usually a CORS issue or a browser cache conflict. Please Hard Refresh (Ctrl+F5) and try again.`));
            }, 45000); 
        });

        return await Promise.race([uploadTask(), timeoutTask]);
    } catch (error: any) {
        console.error(`[API] Upload error details:`, error);
        if (error.code === 'storage/unauthorized') {
            throw new Error("Permission denied. Ensure you are logged in as an admin.");
        }
        throw error;
    }
};


export const addResource = async (resourceData: Omit<Resource, 'id'>, fileToUpload?: File): Promise<Resource> => {
  let imageUrl = resourceData.imageUrl;
  
  if (imageUrl && imageUrl.startsWith('data:')) {
    const imagePath = `thumbnails/${Date.now()}_thumb`;
    const imageBlob = dataURItoBlob(imageUrl);
    imageUrl = await uploadFile(imageBlob, imagePath, 'thumbnail.png');
  }

  let fileUrl = resourceData.fileUrl || '';
  let fileName = resourceData.fileName || '';
  
  if (fileToUpload) {
     const filePath = `files/${Date.now()}/${fileToUpload.name}`;
     fileUrl = await uploadFile(fileToUpload, filePath, fileToUpload.name);
     fileName = fileToUpload.name;
  }

  const liveDateForDb = resourceData.liveDate ? new Date(resourceData.liveDate) : null;
  const initialDownloadCount = typeof resourceData.downloadCount === 'number' ? resourceData.downloadCount : 0;

  const docRef = await addDoc(collection(db, 'resources'), {
    ...resourceData,
    imageUrl,
    fileUrl,
    fileName,
    liveDate: liveDateForDb,
    downloadCount: initialDownloadCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return { ...resourceData, id: docRef.id, downloadCount: initialDownloadCount, fileUrl, fileName };
};

export const updateResource = async (updatedResource: Resource, fileToUpload?: File): Promise<Resource> => {
    const resourceRef = doc(db, 'resources', updatedResource.id);
    const dataToUpdate: any = { ...updatedResource, updatedAt: serverTimestamp() };

    if (updatedResource.imageUrl && updatedResource.imageUrl.startsWith('data:')) {
        const imagePath = `thumbnails/${Date.now()}_thumb`;
        const imageBlob = dataURItoBlob(updatedResource.imageUrl);
        dataToUpdate.imageUrl = await uploadFile(imageBlob, imagePath, 'thumbnail.png');
    }

    if (fileToUpload) {
        const filePath = `files/${Date.now()}/${fileToUpload.name}`;
        dataToUpdate.fileUrl = await uploadFile(fileToUpload, filePath, fileToUpload.name);
        dataToUpdate.fileName = fileToUpload.name;
    }

    dataToUpdate.liveDate = dataToUpdate.liveDate ? new Date(dataToUpdate.liveDate) : null;
    
    const { id, ...saveData } = dataToUpdate;
    await updateDoc(resourceRef, saveData);
    return updatedResource;
};


export const deleteResource = async (id: string, resource: Resource): Promise<void> => {
    await deleteDoc(doc(db, 'resources', id));

    try {
        if (resource.imageUrl?.includes('firebasestorage')) {
            await deleteObject(ref(storage, resource.imageUrl));
        }
        if (resource.fileUrl?.includes('firebasestorage')) {
            await deleteObject(ref(storage, resource.fileUrl));
        }
    } catch(err) {
        console.warn("[API] Storage cleanup skipped (file might not exist):", err);
    }
};

export const getLeads = async (): Promise<Lead[]> => {
    try {
        const leadsCol = collection(db, 'leads');
        const leadSnapshot = await getDocs(leadsCol);
        return leadSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Lead));
    } catch (err) {
        console.error("[API] Failed to fetch leads:", err);
        return [];
    }
}

export const addLead = async (
    resourceId: string, 
    resourceTitle: string, 
    leadData: { firstName: string; email: string; hasConsented: boolean; },
    incrementCount: boolean = true
): Promise<Lead> => {
    const newLead: Omit<Lead, 'id'> = {
        ...leadData,
        resourceId,
        resourceTitle,
        timestamp: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'leads'), newLead);

    if (incrementCount) {
        try {
            const resourceRef = doc(db, 'resources', resourceId);
            await runTransaction(db, async (transaction) => {
                const resourceDoc = await transaction.get(resourceRef);
                if (!resourceDoc.exists()) {
                    const staticRes = STATIC_RESOURCES.find(r => r.id === resourceId);
                    if (staticRes) {
                        transaction.set(resourceRef, {
                            ...staticRes,
                            downloadCount: (staticRes.downloadCount || 0) + 1,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    }
                } else {
                    const newCount = (resourceDoc.data().downloadCount || 0) + 1;
                    transaction.update(resourceRef, { downloadCount: newCount });
                }
            });
        } catch (error) {
            console.error("Failed to increment counter:", error);
        }
    }

    return { ...newLead, id: docRef.id };
};

export const incrementResourceAccessCount = async (resourceId: string): Promise<void> => {
    try {
        const resourceRef = doc(db, 'resources', resourceId);
        await runTransaction(db, async (transaction) => {
            const resourceDoc = await transaction.get(resourceRef);
            if (!resourceDoc.exists()) {
                const staticRes = STATIC_RESOURCES.find(r => r.id === resourceId);
                if (staticRes) {
                    transaction.set(resourceRef, {
                        ...staticRes,
                        downloadCount: (staticRes.downloadCount || 0) + 1,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
            } else {
                const newCount = (resourceDoc.data().downloadCount || 0) + 1;
                transaction.update(resourceRef, { downloadCount: newCount });
            }
        });
    } catch (error) {
        console.error("Failed to increment access count:", error);
    }
};

export const login = async (email: string, pass: string): Promise<boolean> => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        return true;
    } catch (error) {
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
        return false;
    }
};

export const syncStaticResources = async (staticResources: Resource[]): Promise<void> => {
    try {
        if (!auth.currentUser) {
            console.log("[API] Skipping static resources sync: user not authenticated.");
            return;
        }
        
        console.log("[API] Checking and syncing static resources to Firestore...");
        
        // Delete legacy removed static resources from Firestore to ensure they do not show up in public lists
        const legacyToClean: string[] = [];
        for (const legacyId of legacyToClean) {
            const legacyRef = doc(db, 'resources', legacyId);
            try {
                const legacySnap = await getDoc(legacyRef);
                if (legacySnap.exists()) {
                    console.log(`[API] Cleaning up legacy resource from Firestore: ${legacyId}`);
                    await deleteDoc(legacyRef);
                }
            } catch (e) {
                console.warn(`[API] Failed to check/delete legacy resource ${legacyId}:`, e);
            }
        }

        // SEED-ONLY strategy:
        // We only create static resources in Firestore if they don't already exist.
        // Once a resource exists in Firestore, it becomes the source of truth and can be
        // freely edited through the Admin dashboard WITHOUT being overwritten on the next
        // admin login. This prevents the data-loss trap where admin edits were silently
        // reverted back to the hard-coded values in staticResources.ts.
        //
        // NOTE: If you intentionally change a resource's baseline values in staticResources.ts
        // and want those changes reflected for an ALREADY-SEEDED resource, edit it through the
        // Admin dashboard (or delete the Firestore doc so it re-seeds from the static file).
        for (const res of staticResources) {
            const docRef = doc(db, 'resources', res.id);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.log(`[API] Seeding missing resource to Firestore: ${res.title}`);
                await setDoc(docRef, {
                    ...res,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Resource already exists — do NOT overwrite. Admin edits are preserved.
                console.log(`[API] Resource already present, preserving existing data (no overwrite): ${res.title}`);
            }
        }
        console.log("[API] Static resources sync (seed-only) completed.");
    } catch (err) {
        console.error("[API] Failed to sync static resources:", err);
    }
};


import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const uploadFile = async (file: Blob | File, path: string): Promise<string> => {
  if (!storage) throw new Error("Storage not initialized. Check firebase.ts configuration.");
  
  const storageRef = ref(storage, path);
  
  return new Promise((resolve, reject) => {
      // Explicitly set content type to prevent retry/timeout issues with unknown streams
      const metadata = {
          contentType: file.type
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on('state_changed',
        (snapshot) => {
          // You can observe state change events such as progress, pause, and resume
          // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          // Handle unsuccessful uploads
          console.error("Error uploading file:", error);
          reject(error);
        }, 
        async () => {
          // Handle successful uploads on complete
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            reject(err);
          }
        }
      );
  });
};

// Helper to convert DataURL (Base64) to Blob for upload
export const dataURLToBlob = (dataURL: string): Blob => {
  try {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid DataURL format");
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error("Error converting DataURL to Blob:", error);
    throw new Error("Failed to process image/audio data.");
  }
};

import { validClip, type CreatorClip } from "@/game/core/creator-clips";

const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("illuminated-creator", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("clips", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
export async function localClips(owner: string): Promise<CreatorClip[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("clips", "readonly"),
        request = tx.objectStore("clips").getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as CreatorClip[])
            .filter((clip) => clip.owner === owner && validClip(clip.blob))
            .sort((a, b) => b.createdAt - a.createdAt),
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveClip(clip: CreatorClip) {
  if (!clip.owner || !validClip(clip.blob))
    throw Error("Choose a valid video under 30 MB.");
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("clips", "readwrite");
      tx.objectStore("clips").put(clip);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function deleteClip(id: string, owner: string) {
  const clips = await localClips(owner);
  if (!clips.some((c) => c.id === id)) return;
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("clips", "readwrite");
      tx.objectStore("clips").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

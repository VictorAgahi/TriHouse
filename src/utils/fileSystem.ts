// Interfaces pour la structure de données locale

export interface FileData {
  handle: FileSystemFileHandle;
  name: string;
  kind: 'file';
  year: string | null;
  previewUrl?: string;
  parentHandle?: FileSystemDirectoryHandle;
  folderPath?: string[];
}

export interface DirectoryData {
  handle: FileSystemDirectoryHandle;
  name: string;
  kind: 'directory';
  included: boolean; // Contrôle pour la case à cocher (Ignorer ou non)
  imageCount: number;
  videoCount: number;
  children: Array<DirectoryData>;
  scanned?: boolean;
}

/**
 * Parcourt récursivement ou non un dossier sélectionné via File System Access API
 */
export async function scanDirectory(dirHandle: FileSystemDirectoryHandle, recursive = false): Promise<DirectoryData> {
  const children: Array<DirectoryData> = [];
  let imageCount = 0;
  let videoCount = 0;
  
  // @ts-expect-error : L'itérateur values() de FileSystemDirectoryHandle est standard mais le type natif TS peut l'ignorer
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(entry.name);
      const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(entry.name);
      if (isPhoto) {
        imageCount++;
      } else if (isVideo) {
        videoCount++;
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.')) { // Ignore les dossiers cachés
        if (recursive) {
          const subDir = await scanDirectory(entry as FileSystemDirectoryHandle, true);
          imageCount += subDir.imageCount;
          videoCount += subDir.videoCount;
          children.push(subDir);
        } else {
          children.push({
            handle: entry as FileSystemDirectoryHandle,
            name: entry.name,
            kind: 'directory',
            included: false,
            imageCount: 0,
            videoCount: 0,
            children: [],
            scanned: false
          });
        }
      }
    }
  }

  return {
    handle: dirHandle,
    name: dirHandle.name,
    kind: 'directory',
    included: false, // Non inclus par défaut
    imageCount,
    videoCount,
    children,
    scanned: true
  };
}

/**
 * Récupère les FileSystemFileHandle uniquement pour les dossiers qui ont été sélectionnés (included: true).
 */
export async function getSelectedFilesHandles(dirData: DirectoryData, currentPath: string[] = []): Promise<{ handle: FileSystemFileHandle, parentHandle: FileSystemDirectoryHandle, folderPath: string[] }[]> {
  const handles: { handle: FileSystemFileHandle, parentHandle: FileSystemDirectoryHandle, folderPath: string[] }[] = [];
  
  if (dirData.included) {
    // @ts-expect-error - File System API types are not fully supported by default TS
    for await (const entry of dirData.handle.values()) {
      if (entry.kind === 'file') {
        const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(entry.name);
        const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(entry.name);
        if (isPhoto || isVideo) {
          handles.push({ handle: entry as FileSystemFileHandle, parentHandle: dirData.handle, folderPath: currentPath });
        }
      }
    }
  }
  
  for (const child of dirData.children) {
    const childHandles = await getSelectedFilesHandles(child, [...currentPath, child.name]);
    handles.push(...childHandles);
  }
  
  return handles;
}

/**
 * Génère une URL de miniature locale pour une image
 */
export async function getFilePreview(fileHandle: FileSystemFileHandle): Promise<string | null> {
  try {
    const file = await fileHandle.getFile();
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === '') {
      return URL.createObjectURL(file);
    }
    return null;
  } catch (error) {
    console.error("Erreur de preview pour", fileHandle.name, error);
    return null;
  }
}

/**
 * Liste les fichiers (images et vidéos) d'un dossier donné de manière non récursive
 */
export async function getFilesInDirectory(dirHandle: FileSystemDirectoryHandle, currentPath: string[] = []): Promise<FileData[]> {
  const files: FileData[] = [];
  
  // @ts-expect-error - File System API types are not fully supported
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(entry.name);
      const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(entry.name);
      if (isPhoto || isVideo) {
        files.push({
          handle: entry as FileSystemFileHandle,
          name: entry.name,
          kind: 'file',
          year: null, // On ne parse pas l'année ici
          parentHandle: dirHandle,
          folderPath: currentPath
        });
      }
    }
  }
  
  return files;
}

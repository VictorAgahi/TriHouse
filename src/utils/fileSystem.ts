// Interfaces pour la structure de données locale

export interface FileData {
  handle: FileSystemFileHandle;
  name: string;
  kind: 'file';
  year: string | null;
  previewUrl?: string;
}

export interface DirectoryData {
  handle: FileSystemDirectoryHandle;
  name: string;
  kind: 'directory';
  included: boolean; // Contrôle pour la case à cocher (Ignorer ou non)
  fileCount: number;
  children: Array<DirectoryData>;
  scanned?: boolean;
}

/**
 * Parcourt récursivement ou non un dossier sélectionné via File System Access API
 */
export async function scanDirectory(dirHandle: FileSystemDirectoryHandle, recursive = false): Promise<DirectoryData> {
  const children: Array<DirectoryData> = [];
  let fileCount = 0;
  
  // @ts-expect-error : L'itérateur values() de FileSystemDirectoryHandle est standard mais le type natif TS peut l'ignorer
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const isPhotoOrVideo = /\.(jpg|jpeg|png|mp4|mov|avi)$/i.test(entry.name);
      if (isPhotoOrVideo) {
        fileCount++;
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.')) { // Ignore les dossiers cachés
        if (recursive) {
          const subDir = await scanDirectory(entry as FileSystemDirectoryHandle, true);
          fileCount += subDir.fileCount;
          children.push(subDir);
        } else {
          children.push({
            handle: entry as FileSystemDirectoryHandle,
            name: entry.name,
            kind: 'directory',
            included: false,
            fileCount: 0,
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
    fileCount,
    children,
    scanned: true
  };
}

/**
 * Récupère les FileSystemFileHandle uniquement pour les dossiers qui ont été sélectionnés (included: true).
 */
export async function getSelectedFilesHandles(dirData: DirectoryData): Promise<FileSystemFileHandle[]> {
  const handles: FileSystemFileHandle[] = [];
  
  if (dirData.included) {
    // @ts-expect-error - File System API types are not fully supported by default TS
    for await (const entry of dirData.handle.values()) {
      if (entry.kind === 'file') {
        const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(entry.name);
        const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(entry.name);
        if (isPhoto || isVideo) {
          handles.push(entry as FileSystemFileHandle);
        }
      }
    }
  }
  
  for (const child of dirData.children) {
    const childHandles = await getSelectedFilesHandles(child);
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
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  } catch (error) {
    console.error("Erreur de preview pour", fileHandle.name, error);
    return null;
  }
}

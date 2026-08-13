// Interfaces pour la structure de données locale

export interface FileData {
  handle: FileSystemFileHandle;
  name: string;
  kind: 'file';
  year: string | null;
  previewUrl?: string; // Utilisé pour les miniatures
}

export interface DirectoryData {
  handle: FileSystemDirectoryHandle;
  name: string;
  kind: 'directory';
  included: boolean; // Contrôle pour la case à cocher (Ignorer ou non)
  fileCount: number;
  children: Array<FileData | DirectoryData>;
}

/**
 * Parcourt récursivement un dossier sélectionné via File System Access API
 */
export async function scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<DirectoryData> {
  const children: Array<FileData | DirectoryData> = [];
  let fileCount = 0;
  
  // @ts-expect-error : L'itérateur values() de FileSystemDirectoryHandle est standard mais le type natif TS peut l'ignorer
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const isPhotoOrVideo = /\.(jpg|jpeg|png|mp4|mov|avi)$/i.test(entry.name);
      if (isPhotoOrVideo) {
        fileCount++;
        children.push({
          handle: entry as FileSystemFileHandle,
          name: entry.name,
          kind: 'file',
          year: null, // Sera extrait plus tard
        });
      }
    } else if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.')) { // Ignore les dossiers cachés
        const subDir = await scanDirectory(entry as FileSystemDirectoryHandle);
        fileCount += subDir.fileCount;
        children.push(subDir);
      }
    }
  }

  return {
    handle: dirHandle,
    name: dirHandle.name,
    kind: 'directory',
    included: true, // Inclus par défaut
    fileCount,
    children,
  };
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

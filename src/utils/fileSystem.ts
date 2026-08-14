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
 * Récupère un échantillon aléatoire de fichiers (images/vidéos) dans toute l'arborescence
 * sans avoir à relire tous les dossiers, en utilisant les compteurs pré-calculés.
 */
export async function getRandomFilesSample(rootData: DirectoryData, sampleSize: number): Promise<{ handle: FileSystemFileHandle, parentHandle: FileSystemDirectoryHandle, folderPath: string[] }[]> {
  const totalFiles = rootData.imageCount + rootData.videoCount;
  if (totalFiles === 0) return [];

  interface FlatDir {
    dir: DirectoryData;
    path: string[];
    count: number;
    cumulativeCount: number;
  }
  
  const flatDirs: FlatDir[] = [];
  let currentCumulative = 0;
  
  const flatten = (dir: DirectoryData, currentPath: string[]) => {
    const childrenCount = dir.children.reduce((acc, child) => acc + child.imageCount + child.videoCount, 0);
    const countInThisDir = dir.imageCount + dir.videoCount - childrenCount;
    
    if (countInThisDir > 0) {
      currentCumulative += countInThisDir;
      flatDirs.push({ dir, path: currentPath, count: countInThisDir, cumulativeCount: currentCumulative });
    }
    
    for (const child of dir.children) {
      flatten(child, [...currentPath, child.name]);
    }
  };
  
  flatten(rootData, []);
  
  const targetSize = Math.min(sampleSize, totalFiles);
  const selectedIndices = new Set<number>();
  // Attention: si targetSize est très proche de totalFiles, la boucle while peut être longue, mais ici sampleSize est petit (ex: 50).
  while (selectedIndices.size < targetSize) {
    selectedIndices.add(Math.floor(Math.random() * totalFiles));
  }
  
  const indicesByDir = new Map<FlatDir, number[]>();
  for (const index of selectedIndices) {
    const flatDir = flatDirs.find(fd => index < fd.cumulativeCount);
    if (flatDir) {
      const localIndex = index - (flatDir.cumulativeCount - flatDir.count);
      if (!indicesByDir.has(flatDir)) {
        indicesByDir.set(flatDir, []);
      }
      indicesByDir.get(flatDir)!.push(localIndex);
    }
  }
  
  const results: { handle: FileSystemFileHandle, parentHandle: FileSystemDirectoryHandle, folderPath: string[] }[] = [];
  
  for (const [flatDir, localIndices] of indicesByDir.entries()) {
    const filesInDir: FileSystemFileHandle[] = [];
    // @ts-expect-error - File System API types are not fully supported
    for await (const entry of flatDir.dir.handle.values()) {
      if (entry.kind === 'file') {
        const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(entry.name);
        const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(entry.name);
        if (isPhoto || isVideo) {
          filesInDir.push(entry as FileSystemFileHandle);
        }
      }
    }
    
    // Trier pour avoir un index prédictible
    filesInDir.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const localIndex of localIndices) {
      if (filesInDir[localIndex]) {
        results.push({
          handle: filesInDir[localIndex],
          parentHandle: flatDir.dir.handle,
          folderPath: flatDir.path
        });
      }
    }
  }
  
  // Mélanger le résultat final
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }
  
  return results;
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

/**
 * Sauvegarde un fichier (File) issu d'un glisser-déposer dans le dossier cible
 */
export async function saveDroppedFile(targetDirHandle: FileSystemDirectoryHandle, file: File, currentPath: string[] = []): Promise<FileData | null> {
  const isPhoto = /\.(jpg|jpeg|png|heic|webp|gif)$/i.test(file.name);
  const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(file.name);
  
  if (!isPhoto && !isVideo) {
    return null;
  }
  
  try {
    const newHandle = await targetDirHandle.getFileHandle(file.name, { create: true });
    
    const writable = await newHandle.createWritable();
    await writable.write(file);
    await writable.close();
    
    return {
      handle: newHandle,
      name: newHandle.name,
      kind: 'file',
      year: null,
      parentHandle: targetDirHandle,
      folderPath: currentPath
    };
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de", file.name, error);
    return null;
  }
}

import { DirectoryData, FileData } from './fileSystem';
import { extractYearFromFileName } from './dateParser';

export interface SortPlan {
  totalFiles: number;
  filesToMove: { file: FileData; targetYear: string; sourceDir: FileSystemDirectoryHandle; originalPath: string[] }[];
  unknownFiles: { file: FileData; sourceDir: FileSystemDirectoryHandle; originalPath: string[] }[];
}

/**
 * Analyse l'arborescence et crée un plan de tri sans modifier les fichiers.
 */
export function generateSortPlan(dir: DirectoryData, currentPlan?: SortPlan, currentPath: string[] = []): SortPlan {
  const plan = currentPlan || { totalFiles: 0, filesToMove: [], unknownFiles: [] };
  
  if (!dir.included) return plan;

  for (const child of dir.children) {
    if (child.kind === 'file') {
      plan.totalFiles++;
      const year = extractYearFromFileName(child.name);
      if (year) {
        plan.filesToMove.push({ file: child as FileData, targetYear: year, sourceDir: dir.handle, originalPath: currentPath });
      } else {
        // Fallback: les fichiers sans date iront dans un dossier "Autres" ou resteront sur place.
        plan.unknownFiles.push({ file: child as FileData, sourceDir: dir.handle, originalPath: currentPath });
      }
    } else {
      generateSortPlan(child as DirectoryData, plan, [...currentPath, child.name]);
    }
  }

  return plan;
}

/**
 * Exécute le déplacement réel des fichiers (photos et vidéos) sur le disque dur.
 */
export async function executeSortPlan(
  plan: SortPlan, 
  rootDirHandle: FileSystemDirectoryHandle, 
  onProgress: (progress: number) => void
) {
  let processed = 0;
  
  for (const item of plan.filesToMove) {
    try {
      // 1. Obtenir ou créer le dossier de l'année (ex: "2023") à la racine
      const yearDir = await rootDirHandle.getDirectoryHandle(item.targetYear, { create: true });
      
      // 2. Lire le fichier d'origine
      const file = await item.file.handle.getFile();
      
      // 3. Créer le nouveau fichier dans le dossier de destination
      const newFileHandle = await yearDir.getFileHandle(item.file.name, { create: true });
      const writable = await newFileHandle.createWritable();
      
      // 4. Copier les données
      await writable.write(file);
      await writable.close();
      
      // 5. Supprimer le fichier d'origine une fois copié avec succès
      await item.sourceDir.removeEntry(item.file.name);
    } catch (e) {
      console.error(`Erreur lors du déplacement du fichier ${item.file.name}:`, e);
    }
    
    processed++;
    onProgress(Math.round((processed / plan.totalFiles) * 100));
  }
  
  // Nettoyer les dossiers devenus vides
  await cleanEmptyDirectories(rootDirHandle);
}

/**
 * Annule le tri en remettant les fichiers dans leurs dossiers d'origine (et en les recréant si besoin).
 */
export async function undoSortPlan(
  plan: SortPlan, 
  rootDirHandle: FileSystemDirectoryHandle, 
  onProgress: (progress: number) => void
) {
  let processed = 0;
  
  for (const item of plan.filesToMove) {
    try {
      // Obtenir le dossier de l'année
      const yearDir = await rootDirHandle.getDirectoryHandle(item.targetYear);
      const fileHandle = await yearDir.getFileHandle(item.file.name);
      const file = await fileHandle.getFile();
      
      // Recréer le chemin d'origine
      let currentDir = rootDirHandle;
      for (const folder of item.originalPath) {
        currentDir = await currentDir.getDirectoryHandle(folder, { create: true });
      }
      
      // Copier vers l'origine
      const newFileHandle = await currentDir.getFileHandle(item.file.name, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      
      // Supprimer le fichier de l'année
      await yearDir.removeEntry(item.file.name);
    } catch (e) {
      console.error(`Erreur lors de l'annulation du fichier ${item.file.name}:`, e);
    }
    
    processed++;
    onProgress(Math.round((processed / plan.totalFiles) * 100));
  }
  
  // Nettoyer les dossiers années s'ils sont devenus vides
  await cleanEmptyDirectories(rootDirHandle);
}

/**
 * Parcourt récursivement pour supprimer les dossiers vides (sauf ceux créés pour le tri comme les années).
 */
export async function cleanEmptyDirectories(dirHandle: FileSystemDirectoryHandle, isRoot = true) {
  // @ts-expect-error - iterateur non typé nativement
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      // Éviter de supprimer les dossiers années créés à la racine (4 chiffres)
      if (isRoot && /^\d{4}$/.test(name)) continue;

      const subDir = await dirHandle.getDirectoryHandle(name);
      await cleanEmptyDirectories(subDir, false);

      // Vérifier si vide
      let isEmpty = true;
      // @ts-expect-error - iterateur non typé
      for await (const entry of subDir.values()) {
        if (entry) isEmpty = false;
        break;
      }
      
      if (isEmpty) {
        try {
          await dirHandle.removeEntry(name, { recursive: true });
        } catch (e) {
          console.error(`Impossible de supprimer le dossier vide ${name}`, e);
        }
      }
    }
  }
}

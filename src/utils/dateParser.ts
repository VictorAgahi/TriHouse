/**
 * Extrait l'année depuis le nom d'un fichier.
 */
export function extractYearFromFileName(fileName: string): string | null {
  // Recherche en priorité le format YYYYmmdd
  const yyyyMMddRegex = /(19\d\d|20\d\d)(0[1-9]|1[0-2])([0-2]\d|3[0-1])/;
  const match = fileName.match(yyyyMMddRegex);
  
  if (match) {
    return match[1];
  }
  
  // Si non trouvé, recherche une simple année isolée
  const simpleYearRegex = /(19\d\d|20[0-2]\d)/;
  const simpleMatch = fileName.match(simpleYearRegex);
  
  if (simpleMatch) {
    return simpleMatch[1];
  }

  return null;
}

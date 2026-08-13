import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from '@mui/material';
import ActionButton from '../atoms/ActionButton';
import { SortPlan } from '@/utils/sorter';

interface ConfirmationModalProps {
  open: boolean;
  sortPlan: SortPlan;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({ open, sortPlan, onConfirm, onCancel }: ConfirmationModalProps) {
  if (!sortPlan) return null;

  // Calculer le nombre de fichiers par année
  const byYear = sortPlan.filesToMove.reduce((acc, item) => {
    acc[item.targetYear] = (acc[item.targetYear] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const yearsCount = Object.keys(byYear).length;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 4, p: 2 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <Typography variant="h2" component="span" color="primary">Merveilleux !</Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mt: 1, mb: 3 }}>
          Je m&apos;apprête à ranger <strong>{sortPlan.totalFiles} photos et vidéos</strong> dans <strong>{yearsCount} dossiers différents</strong>.
        </Typography>

        <Typography variant="h4" sx={{ mb: 2 }}>Aperçu du tri :</Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, maxHeight: 200, overflowY: 'auto' }}>
          {Object.entries(byYear)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
            .map(([year, count]) => (
              <Box key={year} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Dossier {year}</Typography>
                <Typography variant="body2" color="text.secondary">{count} fichier(s)</Typography>
              </Box>
            ))
          }
          {sortPlan.unknownFiles.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid #ccc' }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }} color="warning.main">Non datés (Ignorés)</Typography>
              <Typography variant="body2" color="text.secondary">{sortPlan.unknownFiles.length} fichier(s)</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <ActionButton onClick={onCancel} sx={{ bgcolor: 'grey.300', color: 'text.primary', '&:hover': { bgcolor: 'grey.400' } }}>
          Annuler
        </ActionButton>
        <ActionButton onClick={onConfirm} color="primary">
          Valider
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
}

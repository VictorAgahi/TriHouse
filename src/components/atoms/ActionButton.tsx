import Button, { ButtonProps } from '@mui/material/Button';

export default function ActionButton(props: ButtonProps) {
  return (
    <Button
      variant="contained"
      color="primary"
      size="large"
      sx={{
        borderRadius: '16px',
        py: 2,
        px: 4,
        fontSize: '1.5rem',
        boxShadow: '0 8px 16px rgba(25, 118, 210, 0.2)',
        ...props.sx,
      }}
      {...props}
    />
  );
}

import { useEffect, useState } from 'react';

export function useRelativeTime(dateString: string) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!dateString) return;

    const update = () => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      const pad = (n: number) => n.toString().padStart(2, '0');
      const hora = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

      if (diffSec < 60) setText('hace unos segundos');
      else if (diffMin < 60) setText(`hace ${diffMin} min`);
      else if (diffHr < 24 && date.getDate() === now.getDate())
        setText(`hoy ${hora}`);
      else if (
        diffDay === 1 ||
        (now.getDate() - date.getDate() === 1 &&
          now.getMonth() === date.getMonth())
      )
        setText(`ayer ${hora}`);
      else if (diffDay < 7)
        setText(`${date.toLocaleDateString('es-ES', { weekday: 'long' })}, ${hora}`);
      else if (now.getFullYear() === date.getFullYear())
        setText(
          date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
          })
        );
      else
        setText(
          date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dateString]);

  return text;
}

import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';

import { useAppToast } from '../../contexts/AppToastContext';
import { fontSizes } from '../../theme/fontSizes';
import { whatsappLink } from '../../utils/whatsapp';
import type { SkincareGuideline, SkincareRoutineItem } from '../../types';
import { formatDateBR, routineAsText } from './skincareUtils';
import { BUTTON_SX, Field, PRIMARY_BUTTON_SX, SkinModal, TextInput, tint } from './skincareUi';
import type { SkinPatient } from './SkinAnamnesisWizard';

type Via = 'whatsapp' | 'email';

interface SendRoutineDialogProps {
  open: boolean;
  onClose: () => void;
  patient: SkinPatient;
  consultDate: string;
  items: SkincareRoutineItem[];
  guidelines: SkincareGuideline[];
  notes: string;
}

/**
 * Envia a rotina pelo WhatsApp (wa.me) ou pelo app de e-mail (mailto), com a rotina em texto
 * logo abaixo da mensagem. Não há envio automático pelo servidor.
 */
export function SendRoutineDialog({ open, onClose, patient, consultDate, items, guidelines, notes }: SendRoutineDialogProps) {
  const toast = useAppToast();
  const [via, setVia] = useState<Via>('whatsapp');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    const first = patient.name.split(' ')[0];
    setVia('whatsapp');
    setTarget(patient.phone ?? '');
    setMessage(
      `Olá, ${first}! Segue a rotina de skincare que montamos na sua consulta de ${formatDateBR(consultDate)}. Qualquer dúvida, é só responder esta mensagem.`,
    );
  }, [open, patient, consultDate]);

  const pickVia = (v: Via) => {
    setVia(v);
    setTarget((v === 'whatsapp' ? patient.phone : patient.email) ?? '');
  };

  const send = () => {
    if (!target.trim()) {
      toast.error(via === 'whatsapp' ? 'Informe o WhatsApp da paciente' : 'Informe o e-mail da paciente');
      return;
    }
    const body = `${message.trim()}\n\n${routineAsText(items, guidelines, notes)}`;
    const url =
      via === 'whatsapp'
        ? whatsappLink(target, body)
        : `mailto:${encodeURIComponent(target.trim())}?subject=${encodeURIComponent('Sua rotina de skincare')}&body=${encodeURIComponent(body.replace(/\*/g, ''))}`;
    window.open(url, '_blank', 'noopener');
    onClose();
    toast.success(via === 'whatsapp' ? 'Rotina aberta no WhatsApp' : 'Rotina aberta no seu e-mail');
  };

  return (
    <SkinModal
      open={open}
      onClose={onClose}
      maxWidth={520}
      title="Enviar rotina para a paciente"
      subtitle="A rotina vai em texto, junto com a mensagem abaixo."
      actions={
        <>
          <Button onClick={onClose} sx={{ ...BUTTON_SX, px: 2.25, fontSize: fontSizes.sm }}>
            Cancelar
          </Button>
          <Button onClick={send} sx={{ ...PRIMARY_BUTTON_SX, px: 2.5, boxShadow: 'none' }}>
            Enviar
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        {(
          [
            ['whatsapp', 'WhatsApp'],
            ['email', 'E-mail'],
          ] as const
        ).map(([v, label]) => {
          const selected = via === v;
          return (
            <Box
              key={v}
              component="button"
              type="button"
              aria-pressed={selected}
              onClick={() => pickVia(v)}
              sx={{
                height: 46,
                borderRadius: '12px',
                border: '1.5px solid',
                fontFamily: 'inherit',
                fontSize: fontSizes.sm,
                fontWeight: 800,
                cursor: 'pointer',
                ...(selected
                  ? { borderColor: 'primary.main', bgcolor: tint, color: 'primary.dark' }
                  : { borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }),
              }}
            >
              {label}
            </Box>
          );
        })}
      </Box>
      <Field label={via === 'whatsapp' ? 'WhatsApp da paciente' : 'E-mail da paciente'}>
        <TextInput
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={via === 'whatsapp' ? '(11) 90000-0000' : 'email@exemplo.com'}
          type={via === 'email' ? 'email' : 'tel'}
        />
      </Field>
      <Field label="Mensagem">
        <TextInput multiline minRows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
    </SkinModal>
  );
}

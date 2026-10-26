import { useEffect, useState, type MutableRefObject } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { applyViaCepToAddressFields, clearViaCepAddressFields } from '../../utils/patientAddress';
import { onlyDigits } from '../../utils/masks';
import { fetchViaCepDigits } from '../../utils/viaCep';
import type { PatientFormValues } from './patientFormValues';

export type CepStatus = { loading?: boolean; error?: boolean; text?: string };

/**
 * Consulta o ViaCEP quando o CEP do formulário completa 8 dígitos e preenche rua, bairro, cidade e UF.
 * `suppressNextFullCepLookup` evita refazer a busca para o CEP já salvo ao abrir uma edição.
 */
export function useCepAddressLookup({
  cep,
  open,
  setValue,
  suppressNextFullCepLookup,
}: {
  cep: string | undefined;
  open: boolean;
  setValue: UseFormSetValue<PatientFormValues>;
  suppressNextFullCepLookup: MutableRefObject<boolean>;
}) {
  const [cepStatus, setCepStatus] = useState<CepStatus>({});

  useEffect(() => {
    const addressSetters = {
      setStreet: (v: string) => setValue('addressStreet', v, { shouldValidate: false }),
      setNeighborhood: (v: string) => setValue('addressNeighborhood', v, { shouldValidate: false }),
      setCity: (v: string) => setValue('addressCity', v, { shouldValidate: false }),
      setState: (v: string) => setValue('addressState', v, { shouldValidate: false }),
    };

    const d = onlyDigits(cep ?? '');
    if (d.length !== 8 || !open) {
      setCepStatus({});
      // Durante o carregamento inicial (edição) o CEP ainda não chegou ao form —
      // não limpa o endereço salvo nem reseta o "suppress", senão a busca refaz depois.
      if (!suppressNextFullCepLookup.current) {
        clearViaCepAddressFields(addressSetters);
      }
      return;
    }

    if (suppressNextFullCepLookup.current) {
      suppressNextFullCepLookup.current = false;
      setCepStatus({});
      return;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setCepStatus({ loading: true, error: false, text: undefined });
      fetchViaCepDigits(d, ac.signal)
        .then((ok) => {
          if (ac.signal.aborted) return;
          if (!ok) {
            clearViaCepAddressFields(addressSetters);
            setCepStatus({ loading: false, error: true, text: 'CEP não encontrado.' });
            return;
          }
          applyViaCepToAddressFields(ok, addressSetters);
          const msg = ok.logradouro
            ? 'Endereço preenchido pelo CEP — informe número e complemento.'
            : 'CEP encontrado — informe rua, número e complemento.';
          setCepStatus({ loading: false, error: false, text: msg });
        })
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name === 'AbortError') return;
          if (ac.signal.aborted) return;
          setCepStatus({
            loading: false,
            error: true,
            text: 'Não foi possível consultar o CEP.',
          });
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [cep, open, setValue, suppressNextFullCepLookup]);

  return cepStatus;
}

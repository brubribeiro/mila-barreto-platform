import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { assistantApi } from '../../api/assistant';
import { AppToastProvider } from '../../contexts/AppToastContext';
import { AssistantFab } from './AssistantFab';

function renderFab(canSendFeedback: boolean) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AppToastProvider>
          <AssistantFab suggestions={['Como ativo o modo escuro?']} canSendFeedback={canSendFeedback} />
        </AppToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openAssistant() {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));
}

describe('AssistantFab', () => {
  it('mostra o trecho da documentação com a fonte', async () => {
    const ask = vi.spyOn(assistantApi, 'ask').mockResolvedValue({
      covered: true,
      answer: 'Encontrei isto na documentação:',
      sources: [{ file: 'RELEASE_NOTES.md', section: 'v0.2.0 › Novidades › Visual Aurora', excerpt: '• Modo escuro: botão da lua.' }],
    });
    renderFab(true);
    await openAssistant();

    await userEvent.click(screen.getByRole('button', { name: 'Como ativo o modo escuro?' }));

    expect(ask).toHaveBeenCalledWith('Como ativo o modo escuro?', expect.anything());
    expect(await screen.findByText('• Modo escuro: botão da lua.')).toBeInTheDocument();
    expect(screen.getByText('Fonte: RELEASE_NOTES.md › v0.2.0 › Novidades › Visual Aurora')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });

  it('sem cobertura na documentação, oferece o feedback só no painel da clínica', async () => {
    vi.spyOn(assistantApi, 'ask').mockResolvedValue({ covered: false, answer: 'Não encontrei isso na documentação.', sources: [] });
    const { unmount } = renderFab(true);
    await openAssistant();

    await userEvent.type(screen.getByLabelText('Pergunta para o assistente'), 'nota fiscal{Enter}');

    expect(await screen.findByText('Não encontrei isso na documentação.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback' })).toBeInTheDocument();
    unmount();

    renderFab(false);
    await openAssistant();
    await userEvent.type(screen.getByLabelText('Pergunta para o assistente'), 'nota fiscal{Enter}');
    expect(await screen.findByText('Não encontrei isso na documentação.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar feedback' })).not.toBeInTheDocument();
  });
});

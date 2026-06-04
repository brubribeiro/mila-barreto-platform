import { Box, Container, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <MuiLink component={Link} to="/login" sx={{ mb: 3, display: 'inline-block' }}>
          &larr; Voltar ao login
        </MuiLink>

        <Typography variant="h4" fontWeight={700} gutterBottom>
          Política de Privacidade
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Última atualização: Junho de 2026
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. Introdução
          </Typography>
          <Typography paragraph>
            A Mila Barreto Estética Avançada ("nós", "nosso"), com sede em São Paulo - SP, é
            responsável pelo tratamento dos dados pessoais coletados por meio desta plataforma de
            gestão ("Plataforma"). Esta Política de Privacidade descreve como coletamos, utilizamos,
            armazenamos e protegemos seus dados, em conformidade com a Lei Geral de Proteção de Dados
            (LGPD - Lei 13.709/2018).
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. Dados Coletados
          </Typography>
          <Typography paragraph>
            <strong>Dados dos profissionais (usuários da Plataforma):</strong> nome, endereço de
            e-mail (obtido via autenticação Google), função/cargo na clínica e registro de atividades
            na Plataforma.
          </Typography>
          <Typography paragraph>
            <strong>Dados dos pacientes (cadastrados pelos profissionais):</strong> nome completo,
            CPF, data de nascimento, telefone, endereço, e-mail, histórico de procedimentos
            realizados, prontuários clínicos, fotografias (antes/depois), informações financeiras
            referentes a pagamentos e dados de saúde relevantes ao atendimento estético.
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. Finalidade do Tratamento
          </Typography>
          <Typography paragraph>
            Os dados são tratados para as seguintes finalidades: (a) gestão de agendamentos e
            atendimentos da clínica; (b) manutenção de prontuários e histórico clínico dos pacientes;
            (c) controle financeiro e faturamento; (d) gestão de estoque e equipamentos; (e)
            comunicação com pacientes (lembretes, confirmações); (f) geração de relatórios e métricas
            operacionais internas; (g) cumprimento de obrigações legais e regulatórias.
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Base Legal
          </Typography>
          <Typography paragraph>
            O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais
            previstas na LGPD: (a) execução de contrato ou procedimentos preliminares (Art. 7º, V);
            (b) cumprimento de obrigação legal ou regulatória (Art. 7º, II); (c) tutela da saúde, em
            procedimento realizado por profissionais de saúde (Art. 7º, VIII); (d) legítimo interesse
            do controlador para gestão interna da clínica (Art. 7º, IX). Para dados sensíveis de
            saúde, o tratamento é fundamentado na tutela da saúde (Art. 11, II, f).
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Compartilhamento de Dados
          </Typography>
          <Typography paragraph>
            Os dados pessoais não são vendidos, alugados ou compartilhados com terceiros para fins
            comerciais. O compartilhamento pode ocorrer nas seguintes situações: (a) com prestadores
            de serviços de tecnologia que hospedam ou mantêm a Plataforma, sob obrigações contratuais
            de sigilo; (b) com o Google, limitado ao processo de autenticação (e-mail e nome do
            usuário); (c) quando exigido por lei, ordem judicial ou autoridade competente.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Armazenamento e Segurança
          </Typography>
          <Typography paragraph>
            Os dados são armazenados em servidores protegidos com medidas de segurança técnicas e
            administrativas adequadas, incluindo: criptografia em trânsito (HTTPS/TLS), controle de
            acesso baseado em permissões por função, autenticação segura via Google OAuth 2.0 e
            backups periódicos. Apenas profissionais autorizados e com permissões específicas podem
            acessar os dados na Plataforma.
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Retenção dos Dados
          </Typography>
          <Typography paragraph>
            Os dados pessoais são mantidos pelo período necessário ao cumprimento das finalidades
            descritas nesta Política e das obrigações legais aplicáveis. Prontuários clínicos são
            mantidos pelo prazo mínimo de 20 anos, conforme exigido pela legislação sanitária
            brasileira (Resolução CFM 1.821/2007). Após o término do prazo de retenção, os dados
            serão eliminados ou anonimizados.
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Direitos dos Titulares
          </Typography>
          <Typography paragraph>
            Em conformidade com a LGPD, os titulares dos dados (pacientes e profissionais) têm
            direito a: (a) confirmar a existência de tratamento de seus dados; (b) acessar seus dados;
            (c) solicitar a correção de dados incompletos ou desatualizados; (d) solicitar a
            anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;
            (e) solicitar a portabilidade dos dados; (f) obter informações sobre compartilhamento de
            dados; (g) revogar consentimento, quando aplicável. Para exercer esses direitos, entre em
            contato com a administração da clínica.
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Cookies e Tecnologias de Rastreamento
          </Typography>
          <Typography paragraph>
            A Plataforma utiliza apenas cookies estritamente necessários para o funcionamento da
            autenticação e manutenção da sessão do usuário. Não são utilizados cookies de rastreamento,
            publicidade ou analytics de terceiros.
          </Typography>

          <Typography variant="h6" gutterBottom>
            10. Incidentes de Segurança
          </Typography>
          <Typography paragraph>
            Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos
            titulares, a Mila Barreto Estética Avançada comunicará a Autoridade Nacional de Proteção
            de Dados (ANPD) e os titulares afetados, conforme previsto na LGPD.
          </Typography>

          <Typography variant="h6" gutterBottom>
            11. Alterações nesta Política
          </Typography>
          <Typography paragraph>
            Esta Política de Privacidade pode ser atualizada periodicamente. Quaisquer alterações
            serão publicadas nesta página com a data de atualização revisada. Recomendamos a revisão
            periódica deste documento.
          </Typography>

          <Typography variant="h6" gutterBottom>
            12. Contato e Encarregado (DPO)
          </Typography>
          <Typography paragraph>
            Para dúvidas, solicitações ou exercício de direitos relacionados a dados pessoais, entre
            em contato com a administração da clínica Mila Barreto Estética Avançada, São Paulo - SP.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

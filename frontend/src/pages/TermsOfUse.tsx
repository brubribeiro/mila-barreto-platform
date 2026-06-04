import { Box, Container, Typography, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export function TermsOfUse() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <MuiLink component={Link} to="/login" sx={{ mb: 3, display: 'inline-block' }}>
          &larr; Voltar ao login
        </MuiLink>

        <Typography variant="h4" fontWeight={700} gutterBottom>
          Termos de Uso
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Última atualização: Junho de 2026
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. Aceitação dos Termos
          </Typography>
          <Typography paragraph>
            Ao acessar e utilizar a plataforma Mila Barreto Estética Avançada ("Plataforma"), você
            concorda com estes Termos de Uso. O acesso é restrito a profissionais previamente
            cadastrados pela administração da clínica. Caso não concorde com qualquer condição
            apresentada, não utilize a Plataforma.
          </Typography>

          <Typography variant="h6" gutterBottom>
            2. Descrição do Serviço
          </Typography>
          <Typography paragraph>
            A Plataforma é um sistema de gestão interna destinado à clínica Mila Barreto Estética
            Avançada, localizada em São Paulo - SP, que permite o gerenciamento de agendamentos,
            cadastro de pacientes, prontuários, procedimentos, controle financeiro, estoque,
            equipamentos e demais funcionalidades operacionais da clínica.
          </Typography>

          <Typography variant="h6" gutterBottom>
            3. Acesso e Autenticação
          </Typography>
          <Typography paragraph>
            O acesso à Plataforma é realizado exclusivamente por autenticação via conta Google. Apenas
            profissionais cujo e-mail esteja previamente cadastrado no sistema terão acesso. O usuário
            é responsável por manter a segurança de sua conta Google e por todas as atividades
            realizadas sob sua autenticação.
          </Typography>

          <Typography variant="h6" gutterBottom>
            4. Obrigações do Usuário
          </Typography>
          <Typography paragraph>
            O usuário se compromete a: (a) utilizar a Plataforma exclusivamente para fins
            profissionais relacionados às atividades da clínica; (b) não compartilhar seu acesso com
            terceiros; (c) tratar os dados de pacientes com sigilo e em conformidade com a legislação
            vigente, especialmente a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018); (d)
            não tentar acessar áreas ou funcionalidades para as quais não possua permissão; (e)
            reportar imediatamente qualquer uso não autorizado ou suspeita de violação de segurança.
          </Typography>

          <Typography variant="h6" gutterBottom>
            5. Dados de Pacientes e Confidencialidade
          </Typography>
          <Typography paragraph>
            A Plataforma armazena dados pessoais e dados sensíveis de saúde dos pacientes, incluindo
            nome, CPF, telefone, endereço, histórico de procedimentos, prontuários e fotografias. O
            usuário reconhece que esses dados são confidenciais e protegidos por lei, comprometendo-se
            a não divulgá-los, copiá-los ou utilizá-los para qualquer finalidade que não seja o
            atendimento ao paciente dentro do escopo da clínica.
          </Typography>

          <Typography variant="h6" gutterBottom>
            6. Propriedade Intelectual
          </Typography>
          <Typography paragraph>
            Todos os direitos de propriedade intelectual relativos à Plataforma, incluindo código-fonte,
            design, marca e conteúdo, pertencem à Mila Barreto Estética Avançada. O acesso concedido
            ao usuário não implica transferência de qualquer direito de propriedade.
          </Typography>

          <Typography variant="h6" gutterBottom>
            7. Disponibilidade e Manutenção
          </Typography>
          <Typography paragraph>
            A clínica empenha-se em manter a Plataforma disponível, porém não garante acesso
            ininterrupto. Manutenções programadas ou emergenciais podem ocasionar indisponibilidade
            temporária. A clínica não se responsabiliza por danos decorrentes de interrupções no
            serviço.
          </Typography>

          <Typography variant="h6" gutterBottom>
            8. Limitação de Responsabilidade
          </Typography>
          <Typography paragraph>
            A Plataforma é fornecida "como está". A Mila Barreto Estética Avançada não se
            responsabiliza por decisões clínicas tomadas com base nas informações exibidas na
            Plataforma. O profissional é o único responsável por seus atos clínicos e pela
            verificação dos dados antes de qualquer procedimento.
          </Typography>

          <Typography variant="h6" gutterBottom>
            9. Suspensão e Revogação de Acesso
          </Typography>
          <Typography paragraph>
            A administração da clínica reserva-se o direito de suspender ou revogar o acesso de
            qualquer usuário, a qualquer momento, em caso de descumprimento destes Termos, desligamento
            do profissional ou por qualquer outro motivo justificado.
          </Typography>

          <Typography variant="h6" gutterBottom>
            10. Alterações nos Termos
          </Typography>
          <Typography paragraph>
            Estes Termos podem ser atualizados a qualquer momento. O uso continuado da Plataforma após
            alterações constitui aceitação dos novos termos. Alterações relevantes serão comunicadas
            aos usuários.
          </Typography>

          <Typography variant="h6" gutterBottom>
            11. Legislação Aplicável
          </Typography>
          <Typography paragraph>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
            da Comarca de São Paulo - SP para dirimir quaisquer controvérsias.
          </Typography>

          <Typography variant="h6" gutterBottom>
            12. Contato
          </Typography>
          <Typography paragraph>
            Em caso de dúvidas sobre estes Termos, entre em contato com a administração da clínica
            Mila Barreto Estética Avançada.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

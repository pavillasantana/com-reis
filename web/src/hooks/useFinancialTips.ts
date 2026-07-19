import { useQuery } from '@tanstack/react-query';

export interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  readTime: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    title: 'A Regra dos 50/30/20: Como Dividir seu Orçamento',
    excerpt: 'Descubra a metodologia simples e eficaz para gerenciar seu dinheiro mensal sem estresse.',
    content: 'A regra dos 50/30/20 é um método de planejamento financeiro que divide suas receitas pós-impostos em três categorias: 50% para necessidades, 30% para desejos pessoais e 20% para poupança ou pagamento de dívidas.',
    readTime: '3 min',
    category: 'Orçamento',
    publishedAt: '2026-06-18',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: 2,
    title: 'Reserva de Emergência: Onde Guardar seu Dinheiro?',
    excerpt: 'Diga adeus à poupança. Veja as melhores opções de liquidez diária para alocar seu colchão financeiro.',
    content: 'Uma reserva de emergência deve ser mantida em investimentos com baixíssimo risco e alta liquidez (capacidade de resgatar o dinheiro no mesmo dia). Tesouro Selic e CDBs de liquidez diária de grandes bancos são as opções mais recomendadas.',
    readTime: '4 min',
    category: 'Investimentos',
    publishedAt: '2026-06-17',
    imageUrl: 'https://images.unsplash.com/photo-1579621970795-87faff3f688f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: 3,
    title: 'Como Organizar as Contas da sua Empresa (PJ)',
    excerpt: 'Evite o maior erro dos empreendedores: misturar finanças pessoais com as empresariais.',
    content: 'O princípio da entidade estabelece que o patrimônio de uma empresa não se confunde com o de seus sócios. Abra uma conta bancária PJ dedicada, defina um pró-labore fixo e gerencie todos os fluxos de caixa em espaços de trabalho separados.',
    readTime: '5 min',
    category: 'Negócios',
    publishedAt: '2026-06-16',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
  {
    id: 4,
    title: 'Planejamento para Viagens Internacionais com Câmbio Alto',
    excerpt: 'Aprenda estratégias de compras paulatinas de moeda estrangeira para mitigar oscilações cambiais.',
    content: 'Ao planejar uma viagem internacional, o ideal é fazer compras parciais da moeda estrangeira (dólar, euro) ao longo de vários meses. Isso gera um custo médio ponderado e evita que você compre tudo no pico de alta cambial.',
    readTime: '4 min',
    category: 'Câmbio',
    publishedAt: '2026-06-15',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
  },
];

async function fetchFinancialTips(page: number): Promise<Article[]> {
  try {
    // Tenta conectar no Strapi local ou demo
    const res = await fetch(`http://localhost:1337/api/articles?populate=*&pagination[page]=${page}&pagination[pageSize]=2`);
    if (!res.ok) throw new Error('Strapi não disponível');
    const data = await res.json();
    
    // Mapeia resposta do Strapi v4
    return (data.data || []).map((art: { 
      id: number; 
      attributes: { 
        title: string; 
        excerpt: string; 
        content: string; 
        readTime?: string; 
        category?: string; 
        publishedAt: string; 
        image?: { data?: { attributes?: { url?: string } } } 
      } 
    }) => ({
      id: art.id,
      title: art.attributes.title,
      excerpt: art.attributes.excerpt,
      content: art.attributes.content,
      readTime: art.attributes.readTime || '4 min',
      category: art.attributes.category || 'Geral',
      publishedAt: art.attributes.publishedAt,
      imageUrl: art.attributes.image?.data?.attributes?.url || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    }));
  } catch {
    // Retorna dados de demonstração fatiados pela página
    const pageSize = 2;
    const start = (page - 1) * pageSize;
    return MOCK_ARTICLES.slice(start, start + pageSize);
  }
}

export function useFinancialTips(page: number) {
  return useQuery<Article[]>({
    queryKey: ['financialTips', page],
    queryFn: () => fetchFinancialTips(page),
    placeholderData: [],
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}
